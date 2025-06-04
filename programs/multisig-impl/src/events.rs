use anchor_lang::prelude::*;

#[event]
pub struct FundEvent {
    pub vault: Pubkey,
    pub funder: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawalEvent {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub remaining_balance: u64,
    pub epoch: u64,
    pub spent_in_epoch: u64,
    pub timestamp: i64,
}
