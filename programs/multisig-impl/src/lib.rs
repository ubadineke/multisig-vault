use crate::instructions::*;
use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod states;

declare_id!("GjwfrCA754f5gWn3Rr3ceSFTgV7hh5TwjKVYjeszEqBb");

#[program]
pub mod multisig_impl {

    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        epoch_limit: u64,
        max_guardians: u8,
    ) -> Result<()> {
        InitializeConfig::handler(ctx, epoch_limit, max_guardians)
    }

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        guardians: Vec<Pubkey>,
        recovery_threshold: u8,
    ) -> Result<()> {
        InitializeVault::handler(ctx, guardians, recovery_threshold)
    }

    pub fn fund_vault(ctx: Context<FundVault>, amount: u64) -> Result<()> {
        FundVault::handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64, destination: Pubkey) -> Result<()> {
        Withdraw::handler(ctx, amount, destination)
    }

    pub fn initiate_recovery(ctx: Context<InitiateRecovery>, new_owner: Pubkey) -> Result<()> {
        InitiateRecovery::handler(ctx, new_owner)
    }

    pub fn approve_recovery(ctx: Context<ApproveRecovery> ) -> Result<()> {
        ApproveRecovery::handler(ctx)
    }

}
