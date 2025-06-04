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

#[event]
pub struct RecoveryInitiated {
    pub vault: Pubkey,
    pub initiator: Pubkey,
    pub proposed_new_owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RecoveryApproved {
    pub vault: Pubkey,
    pub guardian: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RecoveryExecuted {
    pub vault: Pubkey,
    pub new_owner: Pubkey,
    pub timestamp: i64,
}
