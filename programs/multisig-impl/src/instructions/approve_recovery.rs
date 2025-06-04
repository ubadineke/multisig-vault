use crate::{errors::*, events::*, states::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ApproveRecovery<'info> {
    #[account(mut, has_one = vault)]
    pub recovery_request: Account<'info, RecoveryRequest>,
    #[account(
        mut,
        // constraint = vault.recovery_set_seqno == recovery_request.recovery_set_seqno
    )]
    pub vault: Account<'info, Vault>,
    #[account(signer)]
    pub guardian: Signer<'info>,
}

impl ApproveRecovery<'_> {
    pub fn handler (ctx: Context<ApproveRecovery>) -> Result<()> {
        let recovery_request = &mut ctx.accounts.recovery_request;
        let vault = &mut ctx.accounts.vault;

        // Check if already executed
        require!(!recovery_request.executed, RecoveryError::AlreadyExecuted);

        // Verify guardian is in the current set
        let guardian_index = vault
            .guardians
            .iter()
            .position(|g| g == ctx.accounts.guardian.key)
            .ok_or(RecoveryError::NotGuardian)?;

        // Check if already signed
        require!(
            !recovery_request.signers[guardian_index],
            RecoveryError::AlreadySigned
        );

        // Mark as signed
        recovery_request.signers[guardian_index] = true;

        emit!(RecoveryApproved {
            vault: vault.key(),
            guardian: ctx.accounts.guardian.key(),
            timestamp: Clock::get()?.unix_timestamp
        });

        // Check if threshold met
        let signed_count = recovery_request.signers.iter().filter(|&s| *s).count();
        if signed_count >= vault.threshold as usize {
            // Apply ownership change
            vault.owner = recovery_request.new_owner;

            // Mark as executed
            recovery_request.executed = true;

            emit!(RecoveryExecuted {
                vault: vault.key(),
                new_owner: recovery_request.new_owner,
                timestamp: Clock::get()?.unix_timestamp
            });
        }

        Ok(())
    }
}
