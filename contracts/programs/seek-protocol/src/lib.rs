use anchor_lang::prelude::*;

declare_id!("SeekXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

/// The $SKR token mint address
pub const SKR_MINT: Pubkey = pubkey!("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");

/// Bet amounts in lamports (with 9 decimals)
/// Tier 1: 100 $SKR = 100_000_000_000
/// Tier 2: 200 $SKR = 200_000_000_000
/// Tier 3: 300 $SKR = 300_000_000_000
pub const TIER_1_BET: u64 = 100_000_000_000;
pub const TIER_2_BET: u64 = 200_000_000_000;
pub const TIER_3_BET: u64 = 300_000_000_000;

/// Distribution percentages (basis points, 10000 = 100%)
pub const HOUSE_SHARE_BPS: u64 = 7000;      // 70% stays in house
pub const SINGULARITY_SHARE_BPS: u64 = 1500; // 15% to jackpot pool
pub const BURN_SHARE_BPS: u64 = 1000;        // 10% burned forever
pub const PROTOCOL_SHARE_BPS: u64 = 500;     // 5% to protocol treasury

/// Jackpot odds: 1 in 500 chance on every win
pub const SINGULARITY_ODDS: u64 = 500;

/// Custom error codes for the Seek protocol
#[error_code]
pub enum SeekError {
    #[msg("Invalid bet amount. Must be 100, 200, or 300 SKR")]
    InvalidBetAmount,

    #[msg("Bounty is not in pending state")]
    BountyNotPending,

    #[msg("Bounty has already been resolved")]
    BountyAlreadyResolved,

    #[msg("Bounty timer has expired")]
    BountyExpired,

    #[msg("Bounty timer has not expired yet")]
    BountyNotExpired,

    #[msg("Insufficient funds in house vault")]
    InsufficientHouseFunds,

    #[msg("Arithmetic overflow occurred")]
    MathOverflow,

    #[msg("Invalid token mint. Must be SKR")]
    InvalidMint,

    #[msg("Unauthorized access")]
    Unauthorized,
}

/// Global protocol state - tracks all protocol-wide metrics
#[account]
pub struct GlobalState {
    /// Authority who can manage the protocol
    pub authority: Pubkey,

    /// House vault token account (PDA-owned)
    pub house_vault: Pubkey,

    /// Singularity (jackpot) vault token account (PDA-owned)
    pub singularity_vault: Pubkey,

    /// Protocol treasury token account
    pub protocol_treasury: Pubkey,

    /// Total SKR currently in house vault
    pub house_fund_balance: u64,

    /// Total SKR in singularity jackpot pool
    pub singularity_balance: u64,

    /// Total SKR burned forever
    pub total_burned: u64,

    /// Total bounties created
    pub total_bounties_created: u64,

    /// Total bounties won by players
    pub total_bounties_won: u64,

    /// Total bounties lost by players
    pub total_bounties_lost: u64,

    /// Total singularity jackpots won
    pub total_singularity_wins: u64,

    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl GlobalState {
    /// Account size: 8 (discriminator) + 32*4 (pubkeys) + 8*7 (u64s) + 1 (bump)
    pub const SIZE: usize = 8 + 32 * 4 + 8 * 7 + 1;
}

#[program]
pub mod seek_protocol {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
