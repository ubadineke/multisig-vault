use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub balance: u64,
    pub epoch: u64,
    pub spent_in_epoch: u64,
    pub spend_limit: u64,
    pub guardians: [Pubkey; 4],
    pub guardians_threshold: u8,
    pub guardian_votes: Vec<Pubkey>,
    pub proposed_new_owner: Option<Pubkey>,
    pub bump: u8
}