import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MultisigImpl } from "../target/types/multisig_impl";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("multisig-impl", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.multisigImpl as Program<MultisigImpl>;

  // Test accounts
  const admin = anchor.web3.Keypair.generate();
  const vaultOwner = anchor.web3.Keypair.generate(); //owns/creates a vault
  const recipient = anchor.web3.Keypair.generate(); //receives funds from a withdrawal
  const guardian1 = anchor.web3.Keypair.generate();
  const guardian2 = anchor.web3.Keypair.generate();
  const guardian3 = anchor.web3.Keypair.generate();

  let configPda;
  let vaultPda;

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
    await airdropSOL(vaultOwner.publicKey, 2);
  });

  // it("Is initialized!", async () => {
  //   // Add your test here.
  //   const tx = await program.methods.initialize().rpc();
  //   console.log("Your transaction signature", tx);
  // });

  it("initializes config successfully", async () => {
    await program.methods
      .initializeConfig(new anchor.BN(1 * 1_000_000_000), 5)
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
    assert.equal(vault.owner.toString(), vaultOwner.publicKey.toString());
    assert.equal(vault.guardians.length, 3);
    assert.equal(vault.guardiansThreshold, 2);
    assert.equal(vault.balance.toNumber(), 0);
  });

  it("funds the vault with SOL", async () => {
    const initialVaultState = await program.account.vault.fetch(vaultPda);
    const initialBalance = await provider.connection.getBalance(
      initialVaultState.treasury
    );
    // const fundAmount = anchor.web3.LAMPORTS_PER_SOL; // 1 SOL
    const fundAmount = new anchor.BN(1_000_000_000);

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
    assert.equal(vault.balance.toString(), fundAmount.toString());

    // Check lamports were transferred
    const newBalance = await provider.connection.getBalance(vault.treasury);
    assert.isAtLeast(newBalance, initialBalance + fundAmount.toNumber());
  });

  it("withdraws SOL within limit", async () => {
    const initialRecipientBalance = await provider.connection.getBalance(
      recipient.publicKey
    );

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
    assert.equal(
      vault.balance.toString(),
      (LAMPORTS_PER_SOL - withdrawAmount.toNumber()).toString()
    );

    // Check recipient received funds
    const newRecipientBalance = await provider.connection.getBalance(recipient.publicKey);
    assert.isAtLeast(
      newRecipientBalance,
      initialRecipientBalance + withdrawAmount.toNumber()
    );
  });
});
