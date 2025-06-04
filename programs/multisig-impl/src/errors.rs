use anchor_lang::prelude::*;

// Error Codes
#[error_code]
pub enum VaultError {
    #[msg("Too many or no guardians provided")]
    InvalidGuardians,
    #[msg("Invalid recovery threshold")]
    InvalidThreshold,
    #[msg("Not a guardian for this vault")]
    NotAGuardian,
    #[msg("Guardian already signed")]
    AlreadySigned,
    #[msg("Spending limit exceeded")]
    SpendingLimitExceeded,
    #[msg("Withdrawal limit exceeded for current epoch")]
    WithdrawalLimitExceeded,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Arithmetic overflow")]
    Overflow,
}

#[error_code]
pub enum RecoveryError {
    #[msg("The given guardian is not part of this vault")]
    NotGuardian,
    #[msg("This guardian has already signed the recovery")]
    AlreadySigned,
    #[msg("Recovery has already been executed")]
    AlreadyExecuted,
    #[msg("Guardian set has changed since recovery was initiated")]
    GuardianSetChanged,
    #[msg("Recovery request has expired")]
    RecoveryExpired,
}
