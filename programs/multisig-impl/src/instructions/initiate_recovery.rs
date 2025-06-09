use crate::{errors::*, events::*, states::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitiateRecovery<'info> {
    #[account(mut, has_one = owner)]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = guardian,
        space = 8 + RecoveryRequest::INIT_SPACE,
        seeds = [b"recovery", vault.key().as_ref()],
        bump
    )]
    pub recovery_request: Account<'info, RecoveryRequest>,
    #[account(mut)]
    pub guardian: Signer<'info>, // recovery must be initiated by one of the guardians
    #[account()]
    ///CHECK: just for verification purposes
    pub owner: AccountInfo<'info>, // Must be current vault owner
    pub system_program: Program<'info, System>,
}

impl InitiateRecovery<'_> {
    pub fn handler(ctx: Context<InitiateRecovery>, new_owner: Pubkey) -> Result<()> {
        let vault = &ctx.accounts.vault;
        let recovery_request = &mut ctx.accounts.recovery_request;

        // Initialize signers array
        let mut signers = Vec::new();
        signers.resize(vault.guardians.len(), false);

        // Mark initiating guardian as signed (if they're a guardian)
        let index = vault
            .guardians
            .iter()
            .position(|g| g == ctx.accounts.guardian.key)
            .ok_or(RecoveryError::NotGuardian)?;

        signers[index] = true;

        // Set recovery request data
        recovery_request.vault = vault.key();
        recovery_request.new_owner = new_owner;
        recovery_request.signers = signers;
        recovery_request.executed = false;
        recovery_request.created_at = Clock::get()?.unix_timestamp;

        emit!(RecoveryInitiated {
            vault: vault.key(),
            initiator: ctx.accounts.owner.key(),
            proposed_new_owner: new_owner,
            timestamp: Clock::get()?.unix_timestamp
        });

        Ok(())
    }
}
