use crate::errors::*;
use crate::states::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = user,
        seeds = [b"vault", user.key().as_ref()],
        space = 8 + Vault::INIT_SPACE,
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        seeds = [b"vault-treasury", vault.key().as_ref()],
        bump
    )]
    pub vault_treasury: SystemAccount<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

impl InitializeVault<'_> {
    pub fn handler(
        ctx: Context<InitializeVault>,
        guardians: Vec<Pubkey>,
        recovery_threshold: u8,
    ) -> Result<()> {
        // Validate guardians
        require!(
            !guardians.is_empty() && guardians.len() as u8 <= ctx.accounts.config.max_guardians,
            VaultError::InvalidGuardians
        );
        require!(
            recovery_threshold > 0 && recovery_threshold <= guardians.len() as u8,
            VaultError::InvalidThreshold
        );

        // Initialize vault
        let clock = Clock::get()?;
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.user.key();
        vault.epoch = clock.epoch;
        vault.spent_in_epoch = 0;
        vault.guardians = guardians;
        vault.threshold = recovery_threshold;
        vault.bump = ctx.bumps.vault;
        vault.treasury = ctx.accounts.vault_treasury.key();
        Ok(())
    }
}
