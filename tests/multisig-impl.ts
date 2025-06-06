import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MultisigImpl } from "../target/types/multisig_impl";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";
import { Clock, LiteSVM } from "litesvm";

describe("multisig-impl", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.multisigImpl as Program<MultisigImpl>;


  const newProvider = new anchor.AnchorProvider{
    
  }
  const svm = new LiteSVM();
  const currentClock = svm.getClock();
  console.log(`Current Clock ${currentClock.epoch.toString()}`);
  const newClock = new Clock(
    currentClock.slot,
    currentClock.epoch + 1n,
    currentClock.epochStartTimestamp + 1000n,
    currentClock.leaderScheduleEpoch,
    currentClock.unixTimestamp + 1000n // optional: to match epoch bump
  );

  svm.setClock(newClock);
  const newestClock = svm.getClock();
  console.log(`New Clockk,, ${newestClock.epoch}`);
  // Test accounts
  const admin = anchor.web3.Keypair.generate();
  const vaultOwner = anchor.web3.Keypair.generate(); //owns/creates a vault
  const recipient = anchor.web3.Keypair.generate(); //receives funds from a withdrawal
  const guardian1 = anchor.web3.Keypair.generate();
  const guardian2 = anchor.web3.Keypair.generate();
  const guardian3 = anchor.web3.Keypair.generate();

  let epochLimit = new anchor.BN(1 * LAMPORTS_PER_SOL);
  let maxGuardians = 5;

  let configPda;
  let vaultPda;
  let recoveryRequestPda;

  function derivePDA(seeds: (string | PublicKey | number | Buffer)[]): PublicKey {
    const seedBuffers = seeds.map((seed) => {
      if (typeof seed == "string") {
        return Buffer.from(seed);
      } else if (seed instanceof PublicKey) {
        return seed.toBuffer();
      } else if (typeof seed == "number") {
        return Buffer.from(Uint8Array.of(seed));
      } else if (Buffer.isBuffer(seed)) {
        return seed;
      } else {
        throw new Error(
          `Invalid seed type: ${typeof seed}. Expected string, PublicKey, Buffer, or number.`
        );
      }
    });

    const [derivedPDA] = PublicKey.findProgramAddressSync(seedBuffers, program.programId);

    return derivedPDA;
  }

  before(async () => {
    // Airdrop to admin
    async function airdropSOL(publicKey: PublicKey, amount_in_sol: number) {
      const signature = await provider.connection.requestAirdrop(
        publicKey,
        amount_in_sol * 1000000000 //convert to lamports
      );
      await provider.connection.confirmTransaction(signature, "confirmed");
    }

    //DERIVE CONFIG PDA
    configPda = derivePDA(["config"]);

    //DERIVE VAULT PDA
    vaultPda = derivePDA(["vault", vaultOwner.publicKey]);

    //AIRDROP ACCOUNTS
    await airdropSOL(admin.publicKey, 5);
    await airdropSOL(vaultOwner.publicKey, 4);
    await airdropSOL(guardian1.publicKey, 1);
  });

  it("initializes config successfully", async () => {
    await program.methods
      .initializeConfig(epochLimit, maxGuardians)
      .accounts({
        config: configPda,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const config = await program.account.config.fetch(configPda);
    assert.strictEqual(config.maxGuardians, 5);
  });

  it("creates a vault", async () => {
    await program.methods
      .initializeVault([guardian1.publicKey, guardian2.publicKey, guardian3.publicKey], 2)
      .accounts({
        vault: vaultPda,
        user: vaultOwner.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([vaultOwner])
      .rpc();

    const vault = await program.account.vault.fetch(vaultPda);
    assert.strictEqual(vault.owner.toString(), vaultOwner.publicKey.toString());
    assert.strictEqual(vault.guardians.length, 3);
    assert.strictEqual(vault.threshold, 2);
    assert.strictEqual(vault.balance.toNumber(), 0);
  });

  it("funds the vault with SOL", async () => {
    const initialVaultState = await program.account.vault.fetch(vaultPda);
    const initialBalance = await provider.connection.getBalance(
      initialVaultState.treasury
    );
    const fundAmount = new anchor.BN(2_000_000_000);

    await program.methods
      .fundVault(fundAmount)
      .accounts({
        vault: vaultPda,
        user: vaultOwner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([vaultOwner])
      .rpc();

    // Check vault balance increased
    const vault = await program.account.vault.fetch(vaultPda);
    assert.strictEqual(vault.balance.toString(), fundAmount.toString());

    // Check lamports were transferred
    const newBalance = await provider.connection.getBalance(vault.treasury);
    assert.isAtLeast(newBalance, initialBalance + fundAmount.toNumber());
  });

  it("withdraws SOL within limit", async () => {
    const initialRecipientBalance = await provider.connection.getBalance(
      recipient.publicKey
    );

    const initialVaultBalance = (await program.account.vault.fetch(vaultPda)).balance;

    console.log(`initial recipient balance ${initialRecipientBalance}`);

    const withdrawAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);

    await program.methods
      .withdraw(withdrawAmount, recipient.publicKey)
      .accounts({
        vault: vaultPda,
        config: configPda,
        owner: vaultOwner.publicKey,
        destination: recipient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([vaultOwner])
      .rpc();

    // Check vault balance decreased
    const vault = await program.account.vault.fetch(vaultPda);
    console.log(`Vault balance ${vault.balance.toString()}`);
    assert.strictEqual(
      vault.balance.toNumber(),
      initialVaultBalance.toNumber() - withdrawAmount.toNumber()
    );

    console.log(`Existing Vault owner: ${vault.owner}`);

    // Check recipient received funds
    const newRecipientBalance = await provider.connection.getBalance(recipient.publicKey);
    assert.isAtLeast(
      newRecipientBalance,
      initialRecipientBalance + withdrawAmount.toNumber()
    );
  });

  it("fails to withdraw beyond epoch limit", async () => {
    const overLimit = new anchor.BN(3 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .withdraw(overLimit, recipient.publicKey)
        .accounts({
          vault: vaultPda,
          owner: vaultOwner.publicKey,
          destination: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([vaultOwner])
        .rpc();
      assert.fail("Should have failed");
    } catch (err) {
      assert.include(err.message, "WithdrawalLimitExceeded");
    }
  });

  //Guardian Recovery Test
  it("initiates recovery request", async () => {
    recoveryRequestPda = derivePDA(["recovery", vaultPda]);

    await program.methods
      .initiateRecovery(
        recipient.publicKey // new owner
      )
      .accounts({
        vault: vaultPda,
        recoveryRequest: recoveryRequestPda,
        guardian: guardian1.publicKey,
        owner: vaultOwner.publicKey,
      })
      .signers([guardian1])
      .rpc();

    const request = await program.account.recoveryRequest.fetch(recoveryRequestPda);
    assert.strictEqual(request.vault.toString(), vaultPda.toString());
    assert.strictEqual(request.newOwner.toString(), recipient.publicKey.toString());
    assert.isFalse(request.executed);
  });

  it("approves and executes if threshold is met", async () => {
    await program.methods
      .approveRecovery()
      .accounts({
        recoveryRequest: recoveryRequestPda,
        vault: vaultPda,
        guardian: guardian2.publicKey,
      })
      .signers([guardian2])
      .rpc();

    const request = await program.account.recoveryRequest.fetch(recoveryRequestPda);

    console.log(`State: ${request.executed}`);
    console.log(`Proposed New owner: ${request.newOwner}}`);
    const vault = await program.account.vault.fetch(vaultPda);
    assert.strictEqual(vault.owner.toString(), request.newOwner.toString());
    assert.isTrue(request.signers[1]); // guardian2 approved
    assert.isFalse(request.signers[2]); // guardian3 pending
    assert.isTrue(request.executed);
  });

  it("does not execute after recovery has concluded", async () => {
    try {
      await program.methods
        .approveRecovery()
        .accounts({
          recoveryRequest: recoveryRequestPda,
          vault: vaultPda,
          guardian: guardian3.publicKey,
        })
        .signers([guardian3])
        .rpc();
      assert.fail("AlreadyExecuted, Recovery has already been executed");
    } catch (err) {
      assert.include(err.message.toString(), "AlreadyExecuted");
    }

    // Verify execution
    const request = await program.account.recoveryRequest.fetch(recoveryRequestPda);
    const vault = await program.account.vault.fetch(vaultPda);

    assert.isTrue(request.executed);
    assert.strictEqual(vault.owner.toString(), recipient.publicKey.toString());
  });

  // it("combines partial signatures for request approval", async () => {
  //   console.log(`Guardian1 ${guardian1.publicKey}`);
  //   console.log(`Guardian2 ${guardian2.publicKey}`);
  //   // 1. Prepare unsigned approval transaction
  //   const approvalIx = await program.methods
  //     .approveRecovery()
  //     .accounts({
  //       recoveryRequest: recoveryRequestPda,
  //       vault: vaultPda,
  //       guardian: guardian1.publicKey,
  //     })
  //     .instruction();

  //   const tx = new anchor.web3.Transaction().add(approvalIx);
  //   tx.feePayer = guardian1.publicKey;
  //   tx.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;

  //   tx.signatures = [
  //     {
  //       publicKey: guardian1.publicKey,
  //       signature: null,
  //     },
  //     {
  //       publicKey: guardian2.publicKey,
  //       signature: null,
  //     },
  //   ];

  //   // 2. Serialize for guardian1 to sign (offline simulation)
  //   const serializedTx = tx.serialize({
  //     requireAllSignatures: false,
  //     verifySignatures: false,
  //   });
  //   const txForGuardian1 = anchor.web3.Transaction.from(serializedTx);

  //   // 3. Guardian1 signs
  //   txForGuardian1.partialSign(guardian1);
  //   const guardian1Signed = txForGuardian1.serialize();

  //   // 4. Pass to guardian2 for signing
  //   const txForGuardian2 = anchor.web3.Transaction.from(guardian1Signed);
  //   txForGuardian2.partialSign(guardian2);
  //   const fullySignedTx = txForGuardian2.serialize();

  //   // 5. Submit combined transaction
  //   const txId = await provider.connection.sendRawTransaction(fullySignedTx);
  //   await provider.connection.confirmTransaction(txId);

  //   // Verify execution (threshold met)
  //   const request = await program.account.recoveryRequest.fetch(recoveryRequestPda);
  //   assert.isTrue(request.executed);
  //   assert.isTrue(request.signers[0]); // guardian1
  //   assert.isTrue(request.signers[1]); // guardian2
  // });
});
