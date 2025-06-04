use anchor_lang::prelude::*;

// Global configuration account initialized once by program admin
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,     // Program admin
    pub epoch_limit: u64,  // spending limit per epoch
    pub max_guardians: u8, // maximum number of guardians
    pub bump: u8,          // PDA bump
}

// User vault account
#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub owner: Pubkey,       // The user who owns this vault
    pub balance: u64,        // User balance
    pub epoch: u64,          // Current Solana epoch
    pub spent_in_epoch: u64, // Amount spent in current epoch
    #[max_len(5)]
    pub guardians: Vec<Pubkey>, // List of guardian public keys
    pub threshold: u8,       // Min signatures required for recovery (e.g. 2)
    // pub guardian_votes: Vec<Pubkey>,
    // pub proposed_new_owner: Option<Pubkey>,
    pub treasury: Pubkey, //Account holding sol
    pub bump: u8,
}

// Recovery request account
#[account]
#[derive(InitSpace)]
pub struct RecoveryRequest {
    pub vault: Pubkey,     // The vault being recovered
    pub new_owner: Pubkey, // New owner if ownership is being transferred
    #[max_len(5)]
    pub signers: Vec<bool>, // Guardians who have approved(parllel to vault.guardians)
    pub executed: bool,    // Boolean ensuring one time execution
    pub created_at: i64,   // When request was created
}
