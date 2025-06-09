use crate::errors::*;
use crate::events::*;
use crate::states::*;
use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction},
};

#[derive(Accounts)]
pub struct FundVault<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"vault-treasury", vault.key().as_ref()],
        bump
    )]
    pub vault_treasury: SystemAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl FundVault<'_> {
    pub fn handler(ctx: Context<FundVault>, amount: u64) -> Result<()> {
        // Transfer SOL (lamports) from funder to vault
        invoke_signed(
            //Transfer sol to user
            &system_instruction::transfer(
                &ctx.accounts.user.to_account_info().key,
                &ctx.accounts.vault_treasury.to_account_info().key,
                amount,
            ),
            &[
                ctx.accounts.vault_treasury.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[],
        )?;

        // Update vault balance
        let vault = &mut ctx.accounts.vault;
        vault.balance = vault
            .balance
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;

        emit!(FundEvent {
            vault: vault.key(),
            funder: ctx.accounts.user.key().clone(),
            amount,
            new_balance: vault.balance,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}
