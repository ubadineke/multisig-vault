# Multisig Vault Implementation

This repository contains a Solana program for a secure multisig vault, implemented using the Anchor framework.

## Overview

- **Vaults**: Each user can create a vault to securely store SOL.
- **Guardians**: Vaults are protected by a set of guardians (public keys) who can help recover ownership if needed.
- **Spending Limits**: Vaults enforce per-epoch withdrawal limits to prevent abuse.
- **Recovery**: Guardians can collectively approve a new owner if the original owner loses access.

## Key Features

- **Initialize Vault**: Create a new vault with guardians and a recovery threshold.
- **Fund Vault**: Deposit SOL into the vault.
- **Withdraw**: Withdraw SOL, subject to per-epoch limits.
- **Initiate Recovery**: Guardians can propose a new owner.
- **Approve Recovery**: Guardians approve recovery requests; once the threshold is met, ownership transfers.

## Lazy Evaluation for Epoch Checks

In the withdraw instruction, the program uses a lazy evaluation pattern to determine if a new epoch has begun. Since smart contracts cannot automatically trigger actions, the program checks the current epoch against the vault's stored epoch each time a withdrawal is attempted. If a new epoch is detected, the spent amount is reset. This ensures that spending limits are enforced per epoch without requiring external automation.

## Structure

- `programs/multisig-impl/src/` contains the main program logic:
  - `instructions/`: All instruction handlers (initialize, fund, withdraw, recovery, etc.)
  - `states.rs`: Account structures (Vault, Config, RecoveryRequest)
  - `errors.rs`: Custom error codes
  - `events.rs`: Program events

## Build & Test

This program uses [Anchor](https://book.anchor-lang.com/). To build and test:

```sh
anchor build
anchor test
```

## Deployment

Configure your cluster and wallet in `Anchor.toml`.

---

For detailed instruction explanations, see `programs/multisig-impl/src/instructions/README.md`.
