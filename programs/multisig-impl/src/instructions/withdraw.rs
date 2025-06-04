use crate::errors::*;
use crate::events::*;
use crate::states::*;

use anchor_lang::solana_program::clock::Clock;
use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction},
};

// Context for withdrawal
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
      mut,
      has_one = owner,
      seeds = [b"vault", owner.key().as_ref()],
      bump
      )
    ]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"vault-treasury", vault.key().as_ref()],
        bump
    )]
    pub vault_treasury: SystemAccount<'info>,

    #[account(
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: We don't care about the contents, just that this is the receiving account
    #[account(mut)]
    pub destination: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

impl Withdraw<'_> {
    // Withdraw instruction with epoch check
    pub fn handler(ctx: Context<Withdraw>, amount: u64, destination: Pubkey) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let clock = Clock::get()?;

        // Check if we're in a new epoch
        if clock.epoch > vault.epoch {
            // Reset spent amount for new epoch
            msg!(
                "New epoch detected ({} -> {}). Resetting spent amount.",
                vault.epoch,
                clock.epoch
            );
            vault.epoch = clock.epoch;
            vault.spent_in_epoch = 0;
        }

        // Check withdrawal against limit
        let new_spent = vault
            .spent_in_epoch
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;

        require!(
            new_spent <= ctx.accounts.config.epoch_limit,
            VaultError::WithdrawalLimitExceeded
        );

        // Update vault state
        vault.spent_in_epoch = new_spent;
        vault.balance = vault
            .balance
            .checked_sub(amount)
            .ok_or(VaultError::InsufficientFunds)?;

        //GENERATE SIGNER SEEDS
        let vault_key = vault.key();
        let vault_treasury_signer_seeds: &[&[&[u8]]] = &[&[
            b"vault-treasury",
            vault_key.as_ref(),
            &[ctx.bumps.vault_treasury],
        ]];

        invoke_signed(
            //Transfer sol to user
            &system_instruction::transfer(&ctx.accounts.vault_treasury.key(), &destination, amount),
            &[
                ctx.accounts.vault_treasury.to_account_info().clone(),
                ctx.accounts.destination.to_account_info().clone(),
                ctx.accounts.system_program.to_account_info(),
            ],
            vault_treasury_signer_seeds,
        )?;

        emit!(WithdrawalEvent {
            vault: vault.key(),
            owner: vault.owner,
            amount,
            remaining_balance: vault.balance,
            epoch: vault.epoch,
            spent_in_epoch: vault.spent_in_epoch,
            timestamp: clock.unix_timestamp,
        });
        Ok(())
    }

    // Emit event
}
