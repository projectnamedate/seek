use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

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

/// Bounty status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BountyStatus {
    /// Bounty accepted, player is hunting
    Pending,
    /// Player successfully completed the bounty
    Won,
    /// Player failed (timeout or invalid submission)
    Lost,
    /// Bounty was cancelled
    Cancelled,
}

/// Individual bounty PDA - created when player accepts a hunt
#[account]
pub struct Bounty {
    /// Player who accepted this bounty
    pub player: Pubkey,

    /// Global state this bounty belongs to
    pub global_state: Pubkey,

    /// Bet amount in SKR lamports (100B, 200B, or 300B)
    pub bet_amount: u64,

    /// Potential payout (2x bet)
    pub payout_amount: u64,

    /// Unix timestamp when bounty was accepted
    pub created_at: i64,

    /// Unix timestamp when bounty expires
    pub expires_at: i64,

    /// Current status of the bounty
    pub status: BountyStatus,

    /// Bounty tier (1, 2, or 3)
    pub tier: u8,

    /// Whether this bounty won the singularity jackpot
    pub singularity_won: bool,

    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl Bounty {
    /// Account size: 8 (disc) + 32*2 (pubkeys) + 8*4 (u64/i64s) + 1*4 (u8/bool/enum)
    pub const SIZE: usize = 8 + 32 * 2 + 8 * 4 + 1 * 4;
}

#[program]
pub mod seek_protocol {
    use super::*;

    /// Initialize the Seek protocol
    /// Creates global state and vault accounts
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;

        // Set authority and vault addresses
        global_state.authority = ctx.accounts.authority.key();
        global_state.house_vault = ctx.accounts.house_vault.key();
        global_state.singularity_vault = ctx.accounts.singularity_vault.key();
        global_state.protocol_treasury = ctx.accounts.protocol_treasury.key();

        // Initialize counters to zero
        global_state.house_fund_balance = 0;
        global_state.singularity_balance = 0;
        global_state.total_burned = 0;
        global_state.total_bounties_created = 0;
        global_state.total_bounties_won = 0;
        global_state.total_bounties_lost = 0;
        global_state.total_singularity_wins = 0;

        // Store bump for future PDA derivations
        global_state.bump = ctx.bumps.global_state;

        msg!("Seek Protocol initialized!");
        msg!("Authority: {}", global_state.authority);
        msg!("House Vault: {}", global_state.house_vault);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Authority who will manage the protocol
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Global state PDA
    #[account(
        init,
        payer = authority,
        space = GlobalState::SIZE,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    /// House vault - holds funds for payouts
    #[account(
        init,
        payer = authority,
        token::mint = skr_mint,
        token::authority = global_state,
        seeds = [b"house_vault"],
        bump
    )]
    pub house_vault: Account<'info, TokenAccount>,

    /// Singularity vault - accumulates jackpot funds
    #[account(
        init,
        payer = authority,
        token::mint = skr_mint,
        token::authority = global_state,
        seeds = [b"singularity_vault"],
        bump
    )]
    pub singularity_vault: Account<'info, TokenAccount>,

    /// Protocol treasury - receives protocol fees
    #[account(
        token::mint = skr_mint,
    )]
    pub protocol_treasury: Account<'info, TokenAccount>,

    /// The SKR token mint
    #[account(
        address = SKR_MINT @ SeekError::InvalidMint
    )]
    pub skr_mint: Account<'info, Mint>,

    /// System program for account creation
    pub system_program: Program<'info, System>,

    /// Token program for SPL operations
    pub token_program: Program<'info, Token>,

    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}
