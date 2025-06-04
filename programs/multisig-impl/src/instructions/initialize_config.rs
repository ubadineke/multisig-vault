use crate::states::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl InitializeConfig<'_> {
    pub fn handler(
        ctx: Context<InitializeConfig>,
        epoch_limit: u64,
        max_guardians: u8,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.epoch_limit = epoch_limit;
        config.max_guardians = max_guardians;
        Ok(())
    }
}
