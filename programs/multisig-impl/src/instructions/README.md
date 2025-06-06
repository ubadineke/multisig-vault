# Instructions Overview

This folder contains all instruction handlers for the multisig vault program. Each instruction is implemented as a separate module.

## Instruction List

- **initialize_config**: Sets up global config (admin, epoch withdrawal limit, max guardians).

  - Function: `initialize_config(ctx: Context<InitializeConfig>, epoch_limit: u64, max_guardians: u8) -> Result<()>`
  - Parameters:
    - `ctx`: Context containing the config account, admin signer, and system program.
    - `epoch_limit`: The maximum amount that can be withdrawn per epoch.
    - `max_guardians`: The maximum number of guardians allowed for a vault.

- **initialize_vault**: Creates a new vault for a user, specifying guardians and recovery threshold.

  - Function: `initialize_vault(ctx: Context<InitializeVault>, guardians: Vec<Pubkey>, recovery_threshold: u8) -> Result<()>`
  - Parameters:
    - `ctx`: Context containing the vault account, vault treasury, user signer, config account, and system program.
    - `guardians`: A vector of public keys representing the guardians for the vault.
    - `recovery_threshold`: The minimum number of guardian signatures required for recovery.

- **fund_vault**: Allows users to deposit SOL into their vault.

  - Function: `fund_vault(ctx: Context<FundVault>, amount: u64) -> Result<()>`
  - Parameters:
    - `ctx`: Context containing the vault account, vault treasury, user signer, and system program.
    - `amount`: The amount of SOL to deposit into the vault.

- **withdraw**: Enables the vault owner to withdraw SOL, enforcing per-epoch limits.

  - Function: `withdraw(ctx: Context<Withdraw>, amount: u64, destination: Pubkey) -> Result<()>`
  - Parameters:
    - `ctx`: Context containing the vault account, vault treasury, owner signer, destination account, and system program.
    - `amount`: The amount of SOL to withdraw.
    - `destination`: The public key of the account to receive the withdrawn SOL.

- **initiate_recovery**: A guardian can propose a new owner for a vault if recovery is needed.

  - Function: `initiate_recovery(ctx: Context<InitiateRecovery>, new_owner: Pubkey) -> Result<()>`
  - Parameters:
    - `ctx`: Context containing the vault account, recovery request account, guardian signer, owner account, and system program.
    - `new_owner`: The public key of the proposed new owner.

- **approve_recovery**: Guardians approve a recovery request; once enough approvals are collected, ownership is transferred.
- Function: `approve_recovery(ctx: Context<ApproveRecovery>) -> Result<()>`
  - Parameters:
    - `ctx`: Context containing the recovery request account, vault account, and guardian signer.

## How It Works

1. **Vault Creation**: User initializes a vault with guardians and a threshold.
2. **Funding**: Anyone can fund the vault.
3. **Withdrawals**: Owner can withdraw within set limits per epoch.
4. **Recovery**: If the owner loses access, guardians can initiate and approve a recovery to transfer ownership.
