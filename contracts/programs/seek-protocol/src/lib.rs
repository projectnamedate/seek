use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v");

// ─── Feature-gated cluster constants ─────────────────────────────────────────
// Build mainnet (default): `anchor build`
// Build devnet:           `anchor build --no-default-features --features devnet`
//
// The mainnet SKR mint has 6 decimals; the devnet test mint has 9.
// ─────────────────────────────────────────────────────────────────────────────

/// The $SKR token mint (official Solana Mobile ecosystem token on mainnet).
#[cfg(feature = "mainnet")]
pub const SKR_MINT: Pubkey = pubkey!("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
#[cfg(feature = "devnet")]
pub const SKR_MINT: Pubkey = pubkey!("u3BkoKjVYYPt24Dto1VPwAzqeQg9ffaxnCVhTAYbAFF");

/// SKR decimals (mainnet token is 6, devnet test token is 9).
#[cfg(feature = "mainnet")]
pub const SKR_DECIMALS: u32 = 6;
#[cfg(feature = "devnet")]
pub const SKR_DECIMALS: u32 = 9;

/// 10^SKR_DECIMALS - multiplier to convert whole SKR to base units.
pub const DECIMALS_MULTIPLIER: u64 = 10u64.pow(SKR_DECIMALS);

/// Public disputes are disabled for the current release, so non-disputed
/// resolutions can finalize immediately.
#[cfg(feature = "mainnet")]
pub const CHALLENGE_PERIOD: i64 = 0;
#[cfg(feature = "devnet")]
pub const CHALLENGE_PERIOD: i64 = 0;

/// Entry amounts: 1000 / 3000 / 5000 SKR (in base units).
pub const TIER_1_ENTRY: u64 = 1000 * DECIMALS_MULTIPLIER;
pub const TIER_2_ENTRY: u64 = 3000 * DECIMALS_MULTIPLIER;
pub const TIER_3_ENTRY: u64 = 5000 * DECIMALS_MULTIPLIER;

/// Distribution percentages on loss (basis points, 10000 = 100%).
pub const HOUSE_SHARE_BPS: u64 = 7000; // 70% stays in house
pub const SINGULARITY_SHARE_BPS: u64 = 2000; // 20% to Singularity pool
pub const PROTOCOL_SHARE_BPS: u64 = 1000; // 10% to protocol treasury

/// Singularity bonus odds: 1 in 500 eligible completions.
pub const SINGULARITY_ODDS: u64 = 500;

/// Per-tier hunt timer durations (seconds).
pub const TIER_1_DURATION: i64 = 180; // 3 minutes
pub const TIER_2_DURATION: i64 = 120; // 2 minutes
pub const TIER_3_DURATION: i64 = 60; // 1 minute

/// Legacy dispute parameters. Public dispute entry points are not surfaced in
/// the app while the resolution window is zero-length.
pub const DISPUTE_STAKE_BPS: u64 = 5000; // 50% of original entry to dispute

/// Mainnet `initialize` is restricted to this pubkey to prevent front-running
/// of the deploy → initialize gap by an MEV bot. Replace the placeholder with
/// the cold-authority Ledger pubkey BEFORE running `anchor build` for mainnet.
/// On devnet (no economic value) this constraint is disabled.
///
/// To set: `solana-keygen pubkey usb://ledger`, paste base58 below, rebuild.
#[cfg(feature = "mainnet")]
pub const EXPECTED_INITIAL_AUTHORITY: Pubkey =
    pubkey!("GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY");
// NOTE: 11111…111 (System Program) is the placeholder. The constraint also
// rejects this default, so a forgotten edit will fail-fast at init time
// rather than silently allowing any caller.

/// Validate entry amount and return tier
pub fn validate_entry_amount(entry_amount: u64) -> Result<u8> {
    match entry_amount {
        TIER_1_ENTRY => Ok(1),
        TIER_2_ENTRY => Ok(2),
        TIER_3_ENTRY => Ok(3),
        _ => Err(SeekError::InvalidEntryAmount.into()),
    }
}

/// Get timer duration for a tier. Error if tier is not 1/2/3 (unreachable in
/// practice because validate_entry_amount filters first, but defensive).
pub fn get_tier_duration(tier: u8) -> Result<i64> {
    match tier {
        1 => Ok(TIER_1_DURATION),
        2 => Ok(TIER_2_DURATION),
        3 => Ok(TIER_3_DURATION),
        _ => Err(SeekError::InvalidEntryAmount.into()),
    }
}

/// Reserve worst-case payout exposure before accepting a bounty. This keeps the
/// protocol solvent even if every active bounty finalizes as a win.
pub fn reserve_bounty_liability(
    global_state: &mut GlobalState,
    current_house_vault_amount: u64,
    entry_amount: u64,
    payout_amount: u64,
) -> Result<()> {
    let projected_house_vault_amount = current_house_vault_amount
        .checked_add(entry_amount)
        .ok_or(SeekError::MathOverflow)?;
    let projected_liability = global_state
        .active_payout_liability
        .checked_add(payout_amount)
        .ok_or(SeekError::MathOverflow)?;

    require!(
        projected_house_vault_amount >= projected_liability,
        SeekError::InsufficientHouseReserve
    );

    global_state.active_payout_liability = projected_liability;
    global_state.active_bounty_count = global_state
        .active_bounty_count
        .checked_add(1)
        .ok_or(SeekError::MathOverflow)?;

    Ok(())
}

/// Release reserved payout exposure when a bounty reaches a terminal state.
pub fn release_bounty_liability(global_state: &mut GlobalState, payout_amount: u64) {
    global_state.active_payout_liability = global_state
        .active_payout_liability
        .saturating_sub(payout_amount);
    global_state.active_bounty_count = global_state.active_bounty_count.saturating_sub(1);
}

/// Custom error codes for the Seek protocol
#[error_code]
pub enum SeekError {
    #[msg("Invalid entry amount. Must be 1000, 3000, or 5000 SKR")]
    InvalidEntryAmount,

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

    #[msg("Insufficient unreserved house funds for worst-case active payouts")]
    InsufficientHouseReserve,

    #[msg("Protocol is paused")]
    ProtocolPaused,

    #[msg("Protocol must be paused for this operation")]
    ProtocolNotPaused,

    #[msg("Invalid withdrawal amount")]
    InvalidWithdrawalAmount,

    #[msg("Insufficient funds in Singularity vault")]
    InsufficientSingularityFunds,

    #[msg("Cannot withdraw Singularity funds while active bounties exist")]
    ActiveBountiesExist,

    #[msg("Arithmetic overflow occurred")]
    MathOverflow,

    #[msg("Invalid token mint. Must be SKR")]
    InvalidMint,

    #[msg("Unauthorized access")]
    Unauthorized,

    // Trust-minimization errors
    #[msg("Invalid mission commitment hash")]
    InvalidMissionHash,

    #[msg("Mission already revealed")]
    MissionAlreadyRevealed,

    #[msg("Mission not yet revealed")]
    MissionNotRevealed,

    #[msg("Challenge period has not ended")]
    ChallengePeriodActive,

    #[msg("Challenge period has ended")]
    ChallengePeriodEnded,

    #[msg("Bounty already disputed")]
    AlreadyDisputed,

    #[msg("Bounty not in disputed state")]
    NotDisputed,

    #[msg("Timestamp is too far from current time")]
    InvalidTimestamp,

    #[msg("Bounty close cooldown has not elapsed (24h after creation)")]
    BountyCooldown,

    #[msg("Invalid protocol treasury owner")]
    InvalidTreasuryOwner,

    #[msg("Protocol treasury must be the canonical SKR associated token account for its owner")]
    InvalidTreasuryAccount,
}

/// Global protocol state - tracks all protocol-wide metrics
#[account]
pub struct GlobalState {
    /// Cold authority. Signs admin ops: fund_house, set_protocol_paused,
    /// withdraw_unreserved_house, withdraw_singularity, set_hot_authority,
    /// set_treasury, propose/accept/cancel_authority_transfer, resolve_dispute.
    /// Should be a hardware wallet (Ledger) on mainnet.
    pub authority: Pubkey,

    /// Hot authority. Signs hot-path ops: reveal_mission, propose_resolution.
    /// Backend-held. Compromise is contained: cannot drain treasury or rotate authority.
    pub hot_authority: Pubkey,

    /// Pending authority for two-step transfer. `Pubkey::default()` = no transfer in-flight.
    /// Set by `propose_authority_transfer`, cleared by `accept_authority_transfer`
    /// or `cancel_authority_transfer`.
    pub pending_authority: Pubkey,

    /// House vault token account (PDA-owned)
    pub house_vault: Pubkey,

    /// Singularity bonus vault token account (PDA-owned)
    pub singularity_vault: Pubkey,

    /// Protocol treasury token account
    pub protocol_treasury: Pubkey,

    /// Total SKR currently in house vault
    pub house_fund_balance: u64,

    /// Sum of full payout liabilities for active bounties not yet finalized,
    /// dispute-resolved, or cancelled. New bounties are accepted only if the
    /// vault can cover every active bounty as a win.
    pub active_payout_liability: u64,

    /// Number of active bounties contributing to active_payout_liability.
    pub active_bounty_count: u64,

    /// Total SKR in Singularity bonus pool
    pub singularity_balance: u64,

    /// Total SKR burned forever
    pub total_burned: u64,

    /// Total bounties created
    pub total_bounties_created: u64,

    /// Total bounties won by players
    pub total_bounties_won: u64,

    /// Total bounties lost by players
    pub total_bounties_lost: u64,

    /// Total Singularity bonuses awarded
    pub total_singularity_wins: u64,

    /// Emergency switch. When true, new accept_bounty calls are rejected.
    pub paused: bool,

    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl GlobalState {
    /// Account size: 8 (discriminator) + 32*6 (authority, hot_authority,
    /// pending_authority, house_vault, singularity_vault, protocol_treasury)
    /// + 8*9 (house_fund_balance, active_payout_liability,
    ///   active_bounty_count, singularity_balance, total_burned,
    ///   total_bounties_created, total_bounties_won, total_bounties_lost,
    ///   total_singularity_wins) + 1 (paused) + 1 (bump) = 274.
    pub const SIZE: usize = 8 + 32 * 6 + 8 * 9 + 1 + 1;
}

/// Bounty status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BountyStatus {
    /// Bounty accepted, player is hunting
    Pending,
    /// Photo submitted, awaiting resolution
    Submitted,
    /// Resolved as win, pending finalization
    ChallengeWon,
    /// Resolved as loss, pending finalization
    ChallengeLost,
    /// Player disputed the loss result
    Disputed,
    /// Final: Player won
    Won,
    /// Final: Player lost
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

    /// Entry amount in SKR base units (1000, 3000, or 5000 whole SKR)
    pub entry_amount: u64,

    /// Full return amount (2x entry: entry back + 1x profit)
    pub payout_amount: u64,

    /// Unix timestamp when bounty was accepted
    pub created_at: i64,

    /// Unix timestamp when bounty expires (hunt timer)
    pub expires_at: i64,

    /// Current status of the bounty
    pub status: BountyStatus,

    /// Bounty tier (1, 2, or 3)
    pub tier: u8,

    /// Whether this bounty received the Singularity bonus
    pub singularity_won: bool,

    /// Bump seed for PDA derivation
    pub bump: u8,

    // === COMMIT-REVEAL FIELDS ===
    /// Hash of (mission_id || salt) - committed at bounty creation
    pub mission_commitment: [u8; 32],

    /// Revealed mission ID (set when backend reveals)
    pub mission_id: [u8; 32],

    /// Whether mission has been revealed
    pub mission_revealed: bool,

    // === RESOLUTION FIELDS ===
    /// Timestamp when resolution was submitted
    pub resolved_at: i64,

    /// Timestamp when the result becomes finalizable
    pub challenge_ends_at: i64,

    /// Whether the proposed result was a successful completion
    pub proposed_win: bool,

    // === DISPUTE FIELDS ===
    /// Whether this bounty has been disputed
    pub is_disputed: bool,

    /// Dispute review deposit amount (if disputed)
    pub dispute_stake: u64,

    /// Timestamp when dispute was filed
    pub disputed_at: i64,
}

impl Bounty {
    /// Account size: 8 (discriminator) + 32*2 (pubkeys) + 8*4 (entry, payout,
    /// created_at, expires_at) + 1*4 (status, tier, singularity_won, bump) +
    /// 32*2 (commitment + mission_id) + 1 (mission_revealed) + 8*2 (resolved_at,
    /// challenge_ends_at) + 1 (proposed_win) + 1 (is_disputed) + 8 (dispute_stake)
    /// + 8 (disputed_at) = 207, padded to 216.
    pub const SIZE: usize = 216;
}

// ============================================================================
// EVENTS - Emitted for frontend and indexer tracking
// ============================================================================

/// Emitted when a player accepts a bounty
#[event]
pub struct BountyAccepted {
    pub player: Pubkey,
    pub bounty: Pubkey,
    pub entry_amount: u64,
    pub tier: u8,
    pub expires_at: i64,
}

/// Emitted when a bounty is won
#[event]
pub struct BountyWon {
    pub player: Pubkey,
    pub bounty: Pubkey,
    pub payout: u64,
    pub singularity_won: bool,
    pub singularity_amount: u64,
}

/// Emitted when a bounty is lost
#[event]
pub struct BountyLost {
    pub player: Pubkey,
    pub bounty: Pubkey,
    pub entry_amount: u64,
    pub house_share: u64,
    pub singularity_share: u64,
    pub protocol_share: u64,
}

/// Emitted when house is funded
#[event]
pub struct HouseFunded {
    pub authority: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

/// Emitted when the cold authority pauses or resumes new bounty acceptance.
#[event]
pub struct ProtocolPauseSet {
    pub authority: Pubkey,
    pub paused: bool,
}

/// Emitted when the cold authority withdraws unreserved house funds.
#[event]
pub struct HouseWithdrawn {
    pub authority: Pubkey,
    pub amount: u64,
    pub remaining_balance: u64,
}

/// Emitted when the cold authority withdraws Singularity funds while paused.
#[event]
pub struct SingularityWithdrawn {
    pub authority: Pubkey,
    pub amount: u64,
    pub remaining_balance: u64,
}

/// Emitted when mission is revealed (commit-reveal)
#[event]
pub struct MissionRevealed {
    pub bounty: Pubkey,
    pub mission_id: [u8; 32],
    pub commitment_verified: bool,
}

/// Emitted when bounty resolution is proposed
#[event]
pub struct BountyResolutionProposed {
    pub bounty: Pubkey,
    pub player: Pubkey,
    pub proposed_win: bool,
    pub challenge_ends_at: i64,
}

/// Emitted when a bounty is disputed
#[event]
pub struct BountyDisputed {
    pub bounty: Pubkey,
    pub player: Pubkey,
    pub dispute_stake: u64,
}

/// Emitted when a dispute is resolved
#[event]
pub struct DisputeResolved {
    pub bounty: Pubkey,
    pub player: Pubkey,
    pub player_won_dispute: bool,
    pub stake_returned: bool,
}

/// Emitted when bounty is finalized
#[event]
pub struct BountyFinalized {
    pub bounty: Pubkey,
    pub player: Pubkey,
    pub final_status: u8, // 0 = lost, 1 = won
}

/// Emitted when the protocol treasury recipient is rotated by the cold authority.
#[event]
pub struct TreasuryRotated {
    pub authority: Pubkey,
    pub old_treasury: Pubkey,
    pub new_treasury: Pubkey,
}

/// Emitted when a bounty is cancelled by the player after expiry
#[event]
pub struct BountyCancelled {
    pub player: Pubkey,
    pub bounty: Pubkey,
    pub refund_amount: u64,
}

/// Emitted when authority is transferred
#[event]
pub struct AuthorityTransferred {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
}

#[program]
pub mod seek_protocol {
    use super::*;

    /// Initialize the Seek protocol - Step 1: Create global state
    /// Call initialize_vaults after this to set up token vaults
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;

        // Set authority (vault addresses set in initialize_vaults)
        global_state.authority = ctx.accounts.authority.key();

        // Default hot_authority to the same key; rotate later via set_hot_authority.
        global_state.hot_authority = ctx.accounts.authority.key();

        // No pending authority transfer initially.
        global_state.pending_authority = Pubkey::default();

        // Initialize counters to zero
        global_state.house_fund_balance = 0;
        global_state.active_payout_liability = 0;
        global_state.active_bounty_count = 0;
        global_state.singularity_balance = 0;
        global_state.total_burned = 0;
        global_state.total_bounties_created = 0;
        global_state.total_bounties_won = 0;
        global_state.total_bounties_lost = 0;
        global_state.total_singularity_wins = 0;
        global_state.paused = false;

        // Store bump for future PDA derivations
        global_state.bump = ctx.bumps.global_state;

        msg!("Seek Protocol global state initialized!");
        msg!("Authority: {}", global_state.authority);
        msg!(
            "Hot authority: {} (rotate via set_hot_authority)",
            global_state.hot_authority
        );

        Ok(())
    }

    /// Initialize the Seek protocol - Step 2: Create house vault
    /// Must be called after initialize()
    pub fn initialize_house_vault(ctx: Context<InitializeHouseVault>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.house_vault = ctx.accounts.house_vault.key();

        msg!("House vault initialized: {}", global_state.house_vault);
        Ok(())
    }

    /// Initialize the Seek protocol - Step 3: Create singularity vault + set treasury
    /// Must be called after initialize_house_vault()
    pub fn initialize_singularity_vault(ctx: Context<InitializeSingularityVault>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.singularity_vault = ctx.accounts.singularity_vault.key();
        global_state.protocol_treasury = ctx.accounts.protocol_treasury.key();

        msg!(
            "Singularity vault initialized: {}",
            global_state.singularity_vault
        );
        msg!("Protocol treasury set: {}", global_state.protocol_treasury);
        Ok(())
    }

    /// Accept a bounty - player submits their entry and starts the hunt.
    /// entry_amount must be exactly TIER_1_ENTRY / TIER_2_ENTRY / TIER_3_ENTRY
    /// (1000 / 3000 / 5000 SKR in base units — multiplier depends on SKR_DECIMALS).
    /// mission_commitment is hash(mission_id || salt) for commit-reveal.
    /// timestamp must be within 60 seconds of current time (for PDA derivation).
    pub fn accept_bounty(
        ctx: Context<AcceptBounty>,
        entry_amount: u64,
        timestamp: i64,
        mission_commitment: [u8; 32],
    ) -> Result<()> {
        require!(!ctx.accounts.global_state.paused, SeekError::ProtocolPaused);

        // Validate entry amount and get tier
        let tier = validate_entry_amount(entry_amount)?;

        // Get current timestamp and validate provided timestamp is recent
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Timestamp must be within 60 seconds of current time
        require!(
            current_time.abs_diff(timestamp) <= 60,
            SeekError::InvalidTimestamp
        );

        // Calculate expiration based on tier
        let duration = get_tier_duration(tier)?;
        let expires_at = current_time
            .checked_add(duration)
            .ok_or(SeekError::MathOverflow)?;

        // Calculate full return: entry back + 1x net profit.
        let payout_amount = entry_amount.checked_mul(2).ok_or(SeekError::MathOverflow)?;

        // Reserve worst-case payout exposure before accepting the bounty. The
        // projected vault balance includes this player's entry after the CPI
        // below. If this fails, the player is not charged.
        reserve_bounty_liability(
            &mut ctx.accounts.global_state,
            ctx.accounts.house_vault.amount,
            entry_amount,
            payout_amount,
        )?;

        // Initialize bounty account
        let bounty = &mut ctx.accounts.bounty;
        bounty.player = ctx.accounts.player.key();
        bounty.global_state = ctx.accounts.global_state.key();
        bounty.entry_amount = entry_amount;
        bounty.payout_amount = payout_amount;
        bounty.created_at = current_time;
        bounty.expires_at = expires_at;
        bounty.status = BountyStatus::Pending;
        bounty.tier = tier;
        bounty.singularity_won = false;
        bounty.bump = ctx.bumps.bounty;

        // Commit-reveal: store mission commitment hash
        bounty.mission_commitment = mission_commitment;
        bounty.mission_id = [0u8; 32];
        bounty.mission_revealed = false;

        // Optimistic resolution: initialize to zero
        bounty.resolved_at = 0;
        bounty.challenge_ends_at = 0;
        bounty.proposed_win = false;

        // Dispute: initialize to false
        bounty.is_disputed = false;
        bounty.dispute_stake = 0;
        bounty.disputed_at = 0;

        // Transfer entry from player to house vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player_token_account.to_account_info(),
                to: ctx.accounts.house_vault.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, entry_amount)?;

        // Update global state
        let global_state = &mut ctx.accounts.global_state;
        global_state.house_fund_balance = global_state
            .house_fund_balance
            .checked_add(entry_amount)
            .ok_or(SeekError::MathOverflow)?;
        global_state.total_bounties_created = global_state
            .total_bounties_created
            .checked_add(1)
            .ok_or(SeekError::MathOverflow)?;

        // Emit event
        emit!(BountyAccepted {
            player: bounty.player,
            bounty: bounty.key(),
            entry_amount,
            tier,
            expires_at,
        });

        msg!("Bounty accepted!");
        msg!("Player: {}", bounty.player);
        msg!(
            "Entry: {} SKR (Tier {})",
            entry_amount / DECIMALS_MULTIPLIER,
            tier
        );
        msg!("Expires at: {}", expires_at);

        Ok(())
    }

    /// Reveal the mission - backend reveals mission_id and salt after player submits photo
    /// Verifies hash(mission_id || salt) matches the original commitment
    pub fn reveal_mission(
        ctx: Context<RevealMission>,
        mission_id: [u8; 32],
        salt: [u8; 32],
    ) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;

        // Verify bounty is pending (photo submitted but not resolved)
        require!(
            bounty.status == BountyStatus::Pending || bounty.status == BountyStatus::Submitted,
            SeekError::BountyAlreadyResolved
        );

        // Verify mission hasn't already been revealed
        require!(!bounty.mission_revealed, SeekError::MissionAlreadyRevealed);

        // Compute hash(mission_id || salt) and verify against commitment
        // Concatenate mission_id and salt, then hash
        let mut input = [0u8; 64];
        input[..32].copy_from_slice(&mission_id);
        input[32..].copy_from_slice(&salt);

        // Use Solana's SHA256 hash function
        let computed_hash = anchor_lang::solana_program::hash::hash(&input);

        require!(
            computed_hash.to_bytes() == bounty.mission_commitment,
            SeekError::InvalidMissionHash
        );

        // Store revealed mission
        bounty.mission_id = mission_id;
        bounty.mission_revealed = true;

        // Update status to Submitted
        bounty.status = BountyStatus::Submitted;

        emit!(MissionRevealed {
            bounty: bounty.key(),
            mission_id,
            commitment_verified: true,
        });

        msg!("Mission revealed and verified!");

        Ok(())
    }

    /// Propose bounty resolution. Public disputes are disabled, so
    /// non-disputed results can finalize immediately.
    /// success = true: proposes win
    /// success = false: proposes loss
    pub fn propose_resolution(ctx: Context<ProposeResolution>, success: bool) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;

        // Verify mission was revealed (commit-reveal completed)
        require!(bounty.mission_revealed, SeekError::MissionNotRevealed);

        // Verify bounty is in Submitted state
        require!(
            bounty.status == BountyStatus::Submitted,
            SeekError::BountyAlreadyResolved
        );

        // Get current time
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Keep the field for IDL/account compatibility, but with disputes
        // disabled the window is zero-length.
        let challenge_ends_at = current_time
            .checked_add(CHALLENGE_PERIOD)
            .ok_or(SeekError::MathOverflow)?;

        // Set optimistic resolution fields
        bounty.resolved_at = current_time;
        bounty.challenge_ends_at = challenge_ends_at;
        bounty.proposed_win = success;

        // Update status to pending-finalization state.
        bounty.status = if success {
            BountyStatus::ChallengeWon
        } else {
            BountyStatus::ChallengeLost
        };

        emit!(BountyResolutionProposed {
            bounty: bounty.key(),
            player: bounty.player,
            proposed_win: success,
            challenge_ends_at,
        });

        msg!(
            "Resolution proposed: {} | Finalizable at: {}",
            if success { "WIN" } else { "LOSS" },
            challenge_ends_at
        );

        Ok(())
    }

    /// Finalize bounty immediately after resolution if no dispute exists.
    /// Actually executes the payout or distribution
    pub fn finalize_bounty(ctx: Context<FinalizeBounty>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let global_state = &mut ctx.accounts.global_state;

        // Verify bounty is pending finalization.
        require!(
            bounty.status == BountyStatus::ChallengeWon
                || bounty.status == BountyStatus::ChallengeLost,
            SeekError::BountyNotPending
        );

        let clock = Clock::get()?;

        // Verify not disputed
        require!(!bounty.is_disputed, SeekError::AlreadyDisputed);

        let success = bounty.proposed_win;
        release_bounty_liability(global_state, bounty.payout_amount);

        if success {
            // === WIN PATH ===
            // Check house vault has enough actual tokens for the full return.
            // Use actual vault balance (not tracked) to avoid divergence issues
            require!(
                ctx.accounts.house_vault.amount >= bounty.payout_amount,
                SeekError::InsufficientHouseFunds
            );

            // Transfer 2x entry to player (entry back + 1x profit).
            let seeds = &[b"global_state".as_ref(), &[global_state.bump]];
            let signer_seeds = &[&seeds[..]];

            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.house_vault.to_account_info(),
                    to: ctx.accounts.player_token_account.to_account_info(),
                    authority: global_state.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(transfer_ctx, bounty.payout_amount)?;

            // Update house balance (subtract 2x, but we received 1x, so net -1x).
            // Use saturating_sub: tracked balance may be lower than actual vault balance
            global_state.house_fund_balance = global_state
                .house_fund_balance
                .saturating_sub(bounty.payout_amount);

            // === SINGULARITY BONUS ROLL ===
            // Entropy sources (stacked by hardness for a grinding attacker):
            //   1. bounty.mission_commitment  - 32-byte hash(mission_id || salt) fixed at accept_bounty
            //   2. bounty.key()               - PDA derived from player + timestamp
            //   3. clock.slot                 - current slot (manipulable by slot leader)
            //   4. clock.unix_timestamp       - best-effort wall clock
            //
            // A slot leader at finalize time can still grind by choosing which finalize_bounty
            // transactions to include in their slot, but they must match both a specific
            // mission_commitment AND a specific bounty PDA, which sharply limits the attack's
            // expected value unless the Singularity pool dwarfs a slot's block production revenue.
            //
            // TODO (post-launch): migrate to Switchboard On-Demand VRF once the Singularity
            // Singularity pool exceeds ~$50k USD equivalent — grinding ROI threshold. See
            // tasks/audit-2026-04-22.md section C-2 and task #3.
            let slot_bytes = clock.slot.to_le_bytes();
            let ts_bytes = (clock.unix_timestamp as u64).to_le_bytes();
            let bounty_key_bytes = bounty.key().to_bytes();

            let mut seed = Vec::with_capacity(32 + 32 + 8 + 8);
            seed.extend_from_slice(&bounty.mission_commitment);
            seed.extend_from_slice(&bounty_key_bytes);
            seed.extend_from_slice(&slot_bytes);
            seed.extend_from_slice(&ts_bytes);

            let digest = anchor_lang::solana_program::hash::hash(&seed);
            let mut rng_u64 = [0u8; 8];
            rng_u64.copy_from_slice(&digest.to_bytes()[..8]);
            let roll = u64::from_le_bytes(rng_u64)
                .checked_rem(SINGULARITY_ODDS)
                .ok_or(SeekError::MathOverflow)?;

            // Track Singularity bonus amount for event
            let mut singularity_bonus_amount: u64 = 0;

            if roll == 0 && global_state.singularity_balance > 0 {
                // Transfer entire Singularity bonus pool to player
                singularity_bonus_amount = global_state.singularity_balance;

                let singularity_bonus_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.singularity_vault.to_account_info(),
                        to: ctx.accounts.player_token_account.to_account_info(),
                        authority: global_state.to_account_info(),
                    },
                    signer_seeds,
                );
                token::transfer(singularity_bonus_ctx, singularity_bonus_amount)?;

                bounty.singularity_won = true;
                global_state.singularity_balance = 0;
                global_state.total_singularity_wins = global_state
                    .total_singularity_wins
                    .checked_add(1)
                    .ok_or(SeekError::MathOverflow)?;

                msg!(
                    "SINGULARITY BONUS: {} SKR",
                    singularity_bonus_amount / DECIMALS_MULTIPLIER
                );
            }

            bounty.status = BountyStatus::Won;
            global_state.total_bounties_won = global_state
                .total_bounties_won
                .checked_add(1)
                .ok_or(SeekError::MathOverflow)?;

            // Emit win event
            emit!(BountyWon {
                player: bounty.player,
                bounty: bounty.key(),
                payout: bounty.payout_amount,
                singularity_won: bounty.singularity_won,
                singularity_amount: singularity_bonus_amount,
            });

            msg!(
                "Bounty WON! Payout: {} SKR",
                bounty.payout_amount / DECIMALS_MULTIPLIER
            );
        } else {
            // === LOSS PATH ===
            // Distribute entry: 70% house, 20% singularity, 10% protocol
            let entry = bounty.entry_amount;

            // Calculate shares (using basis points for precision)
            let house_share = entry
                .checked_mul(HOUSE_SHARE_BPS)
                .ok_or(SeekError::MathOverflow)?
                .checked_div(10000)
                .ok_or(SeekError::MathOverflow)?;

            let singularity_share = entry
                .checked_mul(SINGULARITY_SHARE_BPS)
                .ok_or(SeekError::MathOverflow)?
                .checked_div(10000)
                .ok_or(SeekError::MathOverflow)?;

            let protocol_share = entry
                .checked_mul(PROTOCOL_SHARE_BPS)
                .ok_or(SeekError::MathOverflow)?
                .checked_div(10000)
                .ok_or(SeekError::MathOverflow)?;

            let seeds = &[b"global_state".as_ref(), &[global_state.bump]];
            let signer_seeds = &[&seeds[..]];

            // 70% stays in house vault (already there from accept_bounty)
            // Just update the tracked balance
            // We need to subtract the full entry first, then add back the house share
            global_state.house_fund_balance = global_state
                .house_fund_balance
                .checked_sub(entry)
                .ok_or(SeekError::MathOverflow)?
                .checked_add(house_share)
                .ok_or(SeekError::MathOverflow)?;

            // 20% transfer to singularity vault
            let singularity_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.house_vault.to_account_info(),
                    to: ctx.accounts.singularity_vault.to_account_info(),
                    authority: global_state.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(singularity_ctx, singularity_share)?;

            global_state.singularity_balance = global_state
                .singularity_balance
                .checked_add(singularity_share)
                .ok_or(SeekError::MathOverflow)?;

            // 10% transfer to protocol treasury
            let protocol_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.house_vault.to_account_info(),
                    to: ctx.accounts.protocol_treasury.to_account_info(),
                    authority: global_state.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(protocol_ctx, protocol_share)?;

            bounty.status = BountyStatus::Lost;
            global_state.total_bounties_lost = global_state
                .total_bounties_lost
                .checked_add(1)
                .ok_or(SeekError::MathOverflow)?;

            // Emit loss event
            emit!(BountyLost {
                player: bounty.player,
                bounty: bounty.key(),
                entry_amount: entry,
                house_share,
                singularity_share,
                protocol_share,
            });

            msg!("Bounty LOST. Distribution:");
            msg!("  House: {} SKR (70%)", house_share / DECIMALS_MULTIPLIER);
            msg!(
                "  Singularity: {} SKR (20%)",
                singularity_share / DECIMALS_MULTIPLIER
            );
            msg!(
                "  Protocol: {} SKR (10%)",
                protocol_share / DECIMALS_MULTIPLIER
            );
        }

        // Emit finalized event
        emit!(BountyFinalized {
            bounty: bounty.key(),
            player: bounty.player,
            final_status: if success { 1 } else { 0 },
        });

        Ok(())
    }

    /// Fund the house vault - authority deposits SKR for player payouts
    pub fn fund_house(ctx: Context<FundHouse>, amount: u64) -> Result<()> {
        require!(amount > 0, SeekError::InvalidWithdrawalAmount);

        // Transfer from authority to house vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.authority_token_account.to_account_info(),
                to: ctx.accounts.house_vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // Update tracked balance
        let global_state = &mut ctx.accounts.global_state;
        global_state.house_fund_balance = global_state
            .house_fund_balance
            .checked_add(amount)
            .ok_or(SeekError::MathOverflow)?;

        // Emit event
        emit!(HouseFunded {
            authority: ctx.accounts.authority.key(),
            amount,
            new_balance: global_state.house_fund_balance,
        });

        msg!("House funded with {} SKR", amount / DECIMALS_MULTIPLIER);
        msg!(
            "New balance: {} SKR",
            global_state.house_fund_balance / DECIMALS_MULTIPLIER
        );

        Ok(())
    }

    /// Pause or resume new bounty acceptance. Cold authority only.
    /// Does not block reveal/propose/finalize/cancel paths for already-active bounties.
    pub fn set_protocol_paused(ctx: Context<SetProtocolPaused>, paused: bool) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.paused = paused;

        emit!(ProtocolPauseSet {
            authority: ctx.accounts.authority.key(),
            paused,
        });

        msg!("Protocol {}", if paused { "paused" } else { "resumed" });
        Ok(())
    }

    /// Withdraw only the unreserved portion of the house vault. Cold authority only.
    /// Active payout liability stays locked so already-accepted bounties remain covered.
    pub fn withdraw_unreserved_house(
        ctx: Context<WithdrawUnreservedHouse>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, SeekError::InvalidWithdrawalAmount);

        let global_state = &mut ctx.accounts.global_state;
        let available_tracked = ctx
            .accounts
            .house_vault
            .amount
            .min(global_state.house_fund_balance);
        let unreserved = available_tracked.saturating_sub(global_state.active_payout_liability);

        require!(unreserved >= amount, SeekError::InsufficientHouseReserve);

        let seeds = &[b"global_state".as_ref(), &[global_state.bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.house_vault.to_account_info(),
                to: ctx.accounts.authority_token_account.to_account_info(),
                authority: global_state.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, amount)?;

        global_state.house_fund_balance = global_state.house_fund_balance.saturating_sub(amount);

        emit!(HouseWithdrawn {
            authority: ctx.accounts.authority.key(),
            amount,
            remaining_balance: global_state.house_fund_balance,
        });

        msg!(
            "Unreserved house withdrawal: {} SKR",
            amount / DECIMALS_MULTIPLIER
        );
        Ok(())
    }

    /// Withdraw Singularity bonus funds. Cold authority only, only while paused,
    /// and only after all active bounties have resolved. This is an explicit
    /// public emergency/admin operation, not a hidden path.
    pub fn withdraw_singularity(ctx: Context<WithdrawSingularity>, amount: u64) -> Result<()> {
        require!(amount > 0, SeekError::InvalidWithdrawalAmount);

        let global_state = &mut ctx.accounts.global_state;
        require!(global_state.paused, SeekError::ProtocolNotPaused);
        require!(
            global_state.active_bounty_count == 0,
            SeekError::ActiveBountiesExist
        );

        let available_tracked = ctx
            .accounts
            .singularity_vault
            .amount
            .min(global_state.singularity_balance);

        require!(
            available_tracked >= amount,
            SeekError::InsufficientSingularityFunds
        );

        let seeds = &[b"global_state".as_ref(), &[global_state.bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.singularity_vault.to_account_info(),
                to: ctx.accounts.authority_token_account.to_account_info(),
                authority: global_state.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, amount)?;

        global_state.singularity_balance = global_state.singularity_balance.saturating_sub(amount);

        emit!(SingularityWithdrawn {
            authority: ctx.accounts.authority.key(),
            amount,
            remaining_balance: global_state.singularity_balance,
        });

        msg!(
            "Singularity withdrawal: {} SKR",
            amount / DECIMALS_MULTIPLIER
        );
        Ok(())
    }

    /// Dispute a bounty result - player commits an additional review deposit
    /// Legacy dispute path. With a zero-length window, public disputes are
    /// effectively disabled until the economics are redesigned.
    pub fn dispute_bounty(ctx: Context<DisputeBounty>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Can only dispute unsuccessful outcomes (no point disputing completions)
        require!(
            bounty.status == BountyStatus::ChallengeLost,
            SeekError::BountyNotPending
        );

        // Must be within finalization window.
        require!(
            current_time < bounty.challenge_ends_at,
            SeekError::ChallengePeriodEnded
        );

        // Cannot dispute twice
        require!(!bounty.is_disputed, SeekError::AlreadyDisputed);

        // Calculate dispute review deposit (50% of original entry)
        let dispute_stake = bounty
            .entry_amount
            .checked_mul(DISPUTE_STAKE_BPS)
            .ok_or(SeekError::MathOverflow)?
            .checked_div(10000)
            .ok_or(SeekError::MathOverflow)?;

        // Transfer dispute review deposit from player to house vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player_token_account.to_account_info(),
                to: ctx.accounts.house_vault.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, dispute_stake)?;

        // Track dispute review deposit in house balance
        let global_state = &mut ctx.accounts.global_state;
        global_state.house_fund_balance = global_state
            .house_fund_balance
            .checked_add(dispute_stake)
            .ok_or(SeekError::MathOverflow)?;

        // Mark as disputed
        bounty.is_disputed = true;
        bounty.dispute_stake = dispute_stake;
        bounty.disputed_at = current_time;
        bounty.status = BountyStatus::Disputed;

        emit!(BountyDisputed {
            bounty: bounty.key(),
            player: bounty.player,
            dispute_stake,
        });

        msg!(
            "Bounty disputed. Review deposit: {} SKR",
            dispute_stake / DECIMALS_MULTIPLIER
        );

        Ok(())
    }

    /// Resolve a dispute - authority reviews and decides
    /// player_wins = true: player gets original entry back plus any dispute deposit
    /// player_wins = false: unsuccessful result stands and any dispute deposit is forfeited
    pub fn resolve_dispute(ctx: Context<ResolveDispute>, player_wins: bool) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let global_state = &mut ctx.accounts.global_state;

        // Verify bounty is disputed
        require!(
            bounty.status == BountyStatus::Disputed,
            SeekError::NotDisputed
        );

        let seeds = &[b"global_state".as_ref(), &[global_state.bump]];
        let signer_seeds = &[&seeds[..]];
        release_bounty_liability(global_state, bounty.payout_amount);

        if player_wins {
            // Player wins dispute: refund entry + review deposit back
            let total_refund = bounty
                .entry_amount
                .checked_add(bounty.dispute_stake)
                .ok_or(SeekError::MathOverflow)?;

            // Verify vault has enough actual tokens
            require!(
                ctx.accounts.house_vault.amount >= total_refund,
                SeekError::InsufficientHouseFunds
            );

            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.house_vault.to_account_info(),
                    to: ctx.accounts.player_token_account.to_account_info(),
                    authority: global_state.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(transfer_ctx, total_refund)?;

            // Use saturating_sub for tracked balance
            global_state.house_fund_balance =
                global_state.house_fund_balance.saturating_sub(total_refund);

            bounty.status = BountyStatus::Won;
            global_state.total_bounties_won = global_state
                .total_bounties_won
                .checked_add(1)
                .ok_or(SeekError::MathOverflow)?;

            msg!(
                "Dispute resolved: PLAYER COMPLETES | Refund: {} SKR",
                total_refund / DECIMALS_MULTIPLIER
            );
        } else {
            // Player does not complete dispute: review deposit forfeited, distribute entry (70/20/10)
            // Dispute review deposit already tracked in house_fund_balance (from dispute_bounty)
            // Now distribute the original entry amount
            let entry = bounty.entry_amount;

            let house_share = entry
                .checked_mul(HOUSE_SHARE_BPS)
                .ok_or(SeekError::MathOverflow)?
                .checked_div(10000)
                .ok_or(SeekError::MathOverflow)?;

            let singularity_share = entry
                .checked_mul(SINGULARITY_SHARE_BPS)
                .ok_or(SeekError::MathOverflow)?
                .checked_div(10000)
                .ok_or(SeekError::MathOverflow)?;

            let protocol_share = entry
                .checked_mul(PROTOCOL_SHARE_BPS)
                .ok_or(SeekError::MathOverflow)?
                .checked_div(10000)
                .ok_or(SeekError::MathOverflow)?;

            // 20% to singularity vault
            let singularity_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.house_vault.to_account_info(),
                    to: ctx.accounts.singularity_vault.to_account_info(),
                    authority: global_state.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(singularity_ctx, singularity_share)?;

            global_state.singularity_balance = global_state
                .singularity_balance
                .checked_add(singularity_share)
                .ok_or(SeekError::MathOverflow)?;

            // 10% to protocol treasury
            let protocol_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.house_vault.to_account_info(),
                    to: ctx.accounts.protocol_treasury.to_account_info(),
                    authority: global_state.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(protocol_ctx, protocol_share)?;

            // Update house balance: subtract entry, add back house_share (net: keep 70% + review deposit)
            global_state.house_fund_balance = global_state
                .house_fund_balance
                .saturating_sub(entry)
                .checked_add(house_share)
                .ok_or(SeekError::MathOverflow)?;

            bounty.status = BountyStatus::Lost;
            global_state.total_bounties_lost = global_state
                .total_bounties_lost
                .checked_add(1)
                .ok_or(SeekError::MathOverflow)?;

            msg!("Dispute resolved: PLAYER MISSED | Entry distributed 70/20/10, review deposit forfeited");
        }

        emit!(DisputeResolved {
            bounty: bounty.key(),
            player: bounty.player,
            player_won_dispute: player_wins,
            stake_returned: player_wins,
        });

        Ok(())
    }

    /// Cancel a bounty - player can reclaim entry after expiry + grace period
    /// Only works if bounty is still Pending (no photo submitted yet).
    pub fn cancel_bounty(ctx: Context<CancelBounty>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let global_state = &mut ctx.accounts.global_state;
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Only Pending bounties (no photo submitted yet) can be cancelled.
        // Once a player submits a photo and the backend reveals the mission,
        // the bounty is in `Submitted` and must flow through propose_resolution
        // → finalize_bounty (or dispute). Allowing cancel from `Submitted` was
        // a loss-rate exploit — a backend outage > grace_period would let
        // every Submitted bounty reclaim entry, draining the house pool.
        require!(
            bounty.status == BountyStatus::Pending,
            SeekError::BountyAlreadyResolved
        );

        // Must be expired + 1 hour grace period for backend to resolve
        let grace_period: i64 = 3600; // 1 hour
        require!(
            current_time > bounty.expires_at + grace_period,
            SeekError::BountyNotExpired
        );
        release_bounty_liability(global_state, bounty.payout_amount);

        // Refund entry from house vault to player
        let seeds = &[b"global_state".as_ref(), &[global_state.bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.house_vault.to_account_info(),
                to: ctx.accounts.player_token_account.to_account_info(),
                authority: global_state.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, bounty.entry_amount)?;

        // Update tracked balance
        global_state.house_fund_balance = global_state
            .house_fund_balance
            .saturating_sub(bounty.entry_amount);

        // Mark as cancelled
        bounty.status = BountyStatus::Cancelled;

        emit!(BountyCancelled {
            player: bounty.player,
            bounty: bounty.key(),
            refund_amount: bounty.entry_amount,
        });

        msg!(
            "Bounty cancelled! Refund: {} SKR",
            bounty.entry_amount / DECIMALS_MULTIPLIER
        );

        Ok(())
    }

    /// Step 1 of two-step authority transfer. Current authority proposes a new
    /// authority; no state changes until the new authority signs `accept_authority_transfer`.
    /// Overwrites any previously pending transfer.
    pub fn propose_authority_transfer(
        ctx: Context<ProposeAuthorityTransfer>,
        new_authority: Pubkey,
    ) -> Result<()> {
        // Guard against accidentally proposing the zero address (= cancel, not a transfer)
        require!(new_authority != Pubkey::default(), SeekError::Unauthorized);

        let global_state = &mut ctx.accounts.global_state;
        global_state.pending_authority = new_authority;

        msg!(
            "Authority transfer proposed: {} -> {} (awaiting acceptance)",
            global_state.authority,
            new_authority
        );

        Ok(())
    }

    /// Step 2 of two-step authority transfer. The pending authority signs to
    /// accept, atomically swapping `authority` and clearing `pending_authority`.
    pub fn accept_authority_transfer(ctx: Context<AcceptAuthorityTransfer>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;

        // Must have a pending transfer
        require!(
            global_state.pending_authority != Pubkey::default(),
            SeekError::Unauthorized
        );

        // Only the pending authority can accept
        require!(
            ctx.accounts.new_authority.key() == global_state.pending_authority,
            SeekError::Unauthorized
        );

        let old_authority = global_state.authority;
        let new_authority = global_state.pending_authority;

        global_state.authority = new_authority;
        global_state.pending_authority = Pubkey::default();

        emit!(AuthorityTransferred {
            old_authority,
            new_authority,
        });

        msg!(
            "Authority transferred from {} to {}",
            old_authority,
            new_authority
        );

        Ok(())
    }

    /// Cancel an in-flight authority transfer. Current authority only.
    pub fn cancel_authority_transfer(ctx: Context<CancelAuthorityTransfer>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;

        require!(
            global_state.pending_authority != Pubkey::default(),
            SeekError::Unauthorized
        );

        let cancelled = global_state.pending_authority;
        global_state.pending_authority = Pubkey::default();

        msg!("Authority transfer to {} cancelled", cancelled);
        Ok(())
    }

    /// Rotate the hot authority (used for reveal_mission + propose_resolution).
    /// Cold authority only. Used when the backend keypair is compromised or rotated.
    pub fn set_hot_authority(ctx: Context<SetHotAuthority>, new_hot: Pubkey) -> Result<()> {
        require!(new_hot != Pubkey::default(), SeekError::Unauthorized);

        let global_state = &mut ctx.accounts.global_state;
        let old_hot = global_state.hot_authority;
        global_state.hot_authority = new_hot;

        msg!("Hot authority rotated: {} -> {}", old_hot, new_hot);
        Ok(())
    }

    /// Rotate the protocol_treasury recipient. Cold authority only.
    /// Used when the fees-wallet key is compromised, lost, or operationally rotated.
    /// `new_treasury` must be a TokenAccount of SKR_MINT (validated in the
    /// account context). Only redirects FUTURE inflows — funds already in the
    /// old treasury stay under that account's owner.
    pub fn set_treasury(ctx: Context<SetTreasury>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let old_treasury = global_state.protocol_treasury;
        let new_treasury = ctx.accounts.new_treasury.key();

        require!(new_treasury != old_treasury, SeekError::Unauthorized);

        global_state.protocol_treasury = new_treasury;

        emit!(TreasuryRotated {
            authority: ctx.accounts.authority.key(),
            old_treasury,
            new_treasury,
        });

        msg!(
            "Protocol treasury rotated: {} -> {}",
            old_treasury,
            new_treasury
        );
        Ok(())
    }

    /// Close a bounty account after it reaches a terminal state + 24h cooldown.
    /// Refunds rent to the player. The cooldown prevents PDA reuse races — the
    /// bounty PDA seed is [b"bounty", player, timestamp] so after close, the
    /// same (player, timestamp) can be re-init'd. 24h is plenty of slack for
    /// any in-flight finalizer retries or downstream indexer catch-up.
    pub fn close_bounty(ctx: Context<CloseBounty>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let bounty = &ctx.accounts.bounty;
        require!(
            now >= bounty.created_at.saturating_add(86_400),
            SeekError::BountyCooldown
        );
        msg!("Bounty account closed, rent refunded to player");
        Ok(())
    }
}

/// Step 1: Initialize global state only (small stack footprint)
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Authority who will manage the protocol. On mainnet, must match the
    /// hardcoded `EXPECTED_INITIAL_AUTHORITY` (see top of file). Closes the
    /// front-run vector between `anchor deploy` and the first `initialize` tx.
    #[account(
        mut,
        constraint = is_expected_initial_authority(&authority.key()) @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// Global state PDA
    #[account(
        init,
        payer = authority,
        space = GlobalState::SIZE,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
}

/// Runtime check for the initialize-time authority. On mainnet, requires the
/// hardcoded value AND rejects the System-Program placeholder so a forgotten
/// edit fails fast. On devnet, permissive (no production value at risk).
#[inline(always)]
fn is_expected_initial_authority(_caller: &Pubkey) -> bool {
    #[cfg(feature = "mainnet")]
    {
        // Reject the placeholder so a forgotten edit fails at init time.
        if EXPECTED_INITIAL_AUTHORITY == Pubkey::default() {
            return false;
        }
        *_caller == EXPECTED_INITIAL_AUTHORITY
    }
    #[cfg(not(feature = "mainnet"))]
    {
        true
    }
}

/// Step 2: Initialize house vault
#[derive(Accounts)]
pub struct InitializeHouseVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump,
        constraint = global_state.authority == authority.key() @ SeekError::Unauthorized
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    #[account(
        init,
        payer = authority,
        token::mint = skr_mint,
        token::authority = global_state,
        seeds = [b"house_vault"],
        bump
    )]
    pub house_vault: Box<Account<'info, TokenAccount>>,

    #[account(address = SKR_MINT @ SeekError::InvalidMint)]
    pub skr_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

/// Step 3: Initialize singularity vault + set treasury
#[derive(Accounts)]
pub struct InitializeSingularityVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump,
        constraint = global_state.authority == authority.key() @ SeekError::Unauthorized
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    #[account(
        init,
        payer = authority,
        token::mint = skr_mint,
        token::authority = global_state,
        seeds = [b"singularity_vault"],
        bump
    )]
    pub singularity_vault: Box<Account<'info, TokenAccount>>,

    /// Protocol treasury owner. Unchecked because the token-account owner may
    /// be a system wallet today or a program-owned multisig/PDA later; the key
    /// is still pinned by token owner + canonical ATA constraints below.
    /// CHECK: validated by protocol_treasury.owner and ATA derivation.
    pub protocol_treasury_owner: UncheckedAccount<'info>,

    /// Protocol treasury - existing canonical SKR ATA for protocol fees
    #[account(
        token::mint = skr_mint,
        constraint = protocol_treasury.owner == protocol_treasury_owner.key() @ SeekError::InvalidTreasuryOwner,
        constraint = protocol_treasury.key() == get_associated_token_address(&protocol_treasury_owner.key(), &SKR_MINT) @ SeekError::InvalidTreasuryAccount
    )]
    pub protocol_treasury: Box<Account<'info, TokenAccount>>,

    #[account(address = SKR_MINT @ SeekError::InvalidMint)]
    pub skr_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(entry_amount: u64, timestamp: i64)]
pub struct AcceptBounty<'info> {
    /// Player accepting the bounty
    #[account(mut)]
    pub player: Signer<'info>,

    /// Global state PDA
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    /// Bounty PDA - unique per player + timestamp
    #[account(
        init,
        payer = player,
        space = Bounty::SIZE,
        seeds = [b"bounty", player.key().as_ref(), &timestamp.to_le_bytes()],
        bump
    )]
    pub bounty: Box<Account<'info, Bounty>>,

    /// Player's SKR token account — pinned to the canonical ATA.
    /// Prevents passing a delegated/frozen/alt-ATA that could reroute winnings.
    #[account(
        mut,
        constraint = player_token_account.key() == get_associated_token_address(&player.key(), &SKR_MINT) @ SeekError::Unauthorized
    )]
    pub player_token_account: Box<Account<'info, TokenAccount>>,

    /// House vault to receive entry
    #[account(
        mut,
        seeds = [b"house_vault"],
        bump,
        constraint = house_vault.key() == global_state.house_vault
    )]
    pub house_vault: Box<Account<'info, TokenAccount>>,

    /// The SKR token mint
    #[account(
        address = SKR_MINT @ SeekError::InvalidMint
    )]
    pub skr_mint: Box<Account<'info, Mint>>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

// === NEW TRUST-MINIMIZATION ACCOUNT STRUCTS ===

#[derive(Accounts)]
pub struct RevealMission<'info> {
    /// Hot authority revealing the mission (backend-held)
    #[account(
        constraint = hot_authority.key() == global_state.hot_authority @ SeekError::Unauthorized
    )]
    pub hot_authority: Signer<'info>,

    /// Global state PDA
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    /// The bounty to reveal mission for
    #[account(
        mut,
        constraint = bounty.global_state == global_state.key()
    )]
    pub bounty: Account<'info, Bounty>,
}

#[derive(Accounts)]
pub struct ProposeResolution<'info> {
    /// Hot authority proposing the resolution (backend-held)
    #[account(
        constraint = hot_authority.key() == global_state.hot_authority @ SeekError::Unauthorized
    )]
    pub hot_authority: Signer<'info>,

    /// Global state PDA
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    /// The bounty being resolved
    #[account(
        mut,
        constraint = bounty.global_state == global_state.key()
    )]
    pub bounty: Account<'info, Bounty>,
}

#[derive(Accounts)]
pub struct FinalizeBounty<'info> {
    /// Anyone can finalize a non-disputed pending bounty (permissionless)
    pub caller: Signer<'info>,

    /// Global state PDA
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    /// The bounty being finalized
    #[account(
        mut,
        constraint = bounty.global_state == global_state.key()
    )]
    pub bounty: Box<Account<'info, Bounty>>,

    /// Player's token account for payout (on win)
    #[account(
        mut,
        constraint = player_token_account.key() == get_associated_token_address(&bounty.player, &SKR_MINT) @ SeekError::Unauthorized
    )]
    pub player_token_account: Box<Account<'info, TokenAccount>>,

    /// House vault
    #[account(
        mut,
        seeds = [b"house_vault"],
        bump,
        constraint = house_vault.key() == global_state.house_vault
    )]
    pub house_vault: Box<Account<'info, TokenAccount>>,

    /// Singularity bonus vault
    #[account(
        mut,
        seeds = [b"singularity_vault"],
        bump,
        constraint = singularity_vault.key() == global_state.singularity_vault
    )]
    pub singularity_vault: Box<Account<'info, TokenAccount>>,

    /// Protocol treasury for fees
    #[account(
        mut,
        constraint = protocol_treasury.key() == global_state.protocol_treasury,
        constraint = protocol_treasury.mint == SKR_MINT @ SeekError::InvalidMint
    )]
    pub protocol_treasury: Box<Account<'info, TokenAccount>>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FundHouse<'info> {
    /// Authority funding the house
    #[account(
        mut,
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// Global state PDA
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    /// Authority's SKR token account
    #[account(
        mut,
        constraint = authority_token_account.mint == SKR_MINT @ SeekError::InvalidMint,
        constraint = authority_token_account.owner == authority.key() @ SeekError::Unauthorized
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

    /// House vault to receive funds
    #[account(
        mut,
        seeds = [b"house_vault"],
        bump,
        constraint = house_vault.key() == global_state.house_vault
    )]
    pub house_vault: Account<'info, TokenAccount>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetProtocolPaused<'info> {
    /// Cold authority setting the pause flag.
    #[account(
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// Global state PDA.
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,
}

#[derive(Accounts)]
pub struct WithdrawUnreservedHouse<'info> {
    /// Cold authority withdrawing only unreserved house funds.
    #[account(
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// Global state PDA.
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    /// Cold authority's canonical SKR ATA.
    #[account(
        mut,
        constraint = authority_token_account.mint == SKR_MINT @ SeekError::InvalidMint,
        constraint = authority_token_account.owner == authority.key() @ SeekError::Unauthorized,
        constraint = authority_token_account.key() == get_associated_token_address(&authority.key(), &SKR_MINT) @ SeekError::Unauthorized
    )]
    pub authority_token_account: Box<Account<'info, TokenAccount>>,

    /// House vault to withdraw from.
    #[account(
        mut,
        seeds = [b"house_vault"],
        bump,
        constraint = house_vault.key() == global_state.house_vault
    )]
    pub house_vault: Box<Account<'info, TokenAccount>>,

    /// Token program.
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawSingularity<'info> {
    /// Cold authority withdrawing Singularity funds while paused.
    #[account(
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// Global state PDA.
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    /// Cold authority's canonical SKR ATA.
    #[account(
        mut,
        constraint = authority_token_account.mint == SKR_MINT @ SeekError::InvalidMint,
        constraint = authority_token_account.owner == authority.key() @ SeekError::Unauthorized,
        constraint = authority_token_account.key() == get_associated_token_address(&authority.key(), &SKR_MINT) @ SeekError::Unauthorized
    )]
    pub authority_token_account: Box<Account<'info, TokenAccount>>,

    /// Singularity vault to withdraw from.
    #[account(
        mut,
        seeds = [b"singularity_vault"],
        bump,
        constraint = singularity_vault.key() == global_state.singularity_vault
    )]
    pub singularity_vault: Box<Account<'info, TokenAccount>>,

    /// Token program.
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DisputeBounty<'info> {
    /// Player disputing the bounty
    #[account(
        mut,
        constraint = player.key() == bounty.player @ SeekError::Unauthorized
    )]
    pub player: Signer<'info>,

    /// Global state PDA (mut to track dispute review deposit)
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    /// The bounty being disputed
    #[account(
        mut,
        constraint = bounty.global_state == global_state.key()
    )]
    pub bounty: Box<Account<'info, Bounty>>,

    /// Player's token account for review deposit — pinned to canonical ATA.
    #[account(
        mut,
        constraint = player_token_account.key() == get_associated_token_address(&player.key(), &SKR_MINT) @ SeekError::Unauthorized
    )]
    pub player_token_account: Box<Account<'info, TokenAccount>>,

    /// House vault to receive review deposit
    #[account(
        mut,
        seeds = [b"house_vault"],
        bump,
        constraint = house_vault.key() == global_state.house_vault
    )]
    pub house_vault: Box<Account<'info, TokenAccount>>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    /// Authority resolving the dispute
    #[account(
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// Global state PDA
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    /// The disputed bounty
    #[account(
        mut,
        constraint = bounty.global_state == global_state.key()
    )]
    pub bounty: Box<Account<'info, Bounty>>,

    /// Player's token account for refund — pinned to canonical ATA.
    #[account(
        mut,
        constraint = player_token_account.key() == get_associated_token_address(&bounty.player, &SKR_MINT) @ SeekError::Unauthorized
    )]
    pub player_token_account: Box<Account<'info, TokenAccount>>,

    /// House vault
    #[account(
        mut,
        seeds = [b"house_vault"],
        bump,
        constraint = house_vault.key() == global_state.house_vault
    )]
    pub house_vault: Box<Account<'info, TokenAccount>>,

    /// Singularity vault for loss distribution
    #[account(
        mut,
        seeds = [b"singularity_vault"],
        bump,
        constraint = singularity_vault.key() == global_state.singularity_vault
    )]
    pub singularity_vault: Box<Account<'info, TokenAccount>>,

    /// Protocol treasury for loss distribution
    #[account(
        mut,
        constraint = protocol_treasury.key() == global_state.protocol_treasury,
        constraint = protocol_treasury.mint == SKR_MINT @ SeekError::InvalidMint
    )]
    pub protocol_treasury: Box<Account<'info, TokenAccount>>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelBounty<'info> {
    /// Player cancelling the bounty
    #[account(
        mut,
        constraint = player.key() == bounty.player @ SeekError::Unauthorized
    )]
    pub player: Signer<'info>,

    /// Global state PDA
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    /// The bounty being cancelled
    #[account(
        mut,
        constraint = bounty.global_state == global_state.key()
    )]
    pub bounty: Box<Account<'info, Bounty>>,

    /// Player's token account for refund — pinned to canonical ATA.
    #[account(
        mut,
        constraint = player_token_account.key() == get_associated_token_address(&player.key(), &SKR_MINT) @ SeekError::Unauthorized
    )]
    pub player_token_account: Box<Account<'info, TokenAccount>>,

    /// House vault to refund from
    #[account(
        mut,
        seeds = [b"house_vault"],
        bump,
        constraint = house_vault.key() == global_state.house_vault
    )]
    pub house_vault: Box<Account<'info, TokenAccount>>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

/// Step 1 of authority rotation: current authority proposes a new authority.
#[derive(Accounts)]
pub struct ProposeAuthorityTransfer<'info> {
    /// Current authority
    #[account(
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// Global state PDA
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,
}

/// Step 2 of authority rotation: pending authority signs to accept.
#[derive(Accounts)]
pub struct AcceptAuthorityTransfer<'info> {
    /// The pending authority (must match global_state.pending_authority)
    pub new_authority: Signer<'info>,

    /// Global state PDA
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,
}

/// Cancel an in-flight authority transfer. Current authority only.
#[derive(Accounts)]
pub struct CancelAuthorityTransfer<'info> {
    #[account(
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,
}

/// Rotate the hot authority. Cold authority only.
#[derive(Accounts)]
pub struct SetHotAuthority<'info> {
    #[account(
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,
}

/// Rotate the protocol treasury recipient. Cold authority only.
/// `new_treasury` must be the existing canonical SKR ATA for
/// `new_treasury_owner` (the rent-paying caller pre-creates it off-chain —
/// this instruction just records the new recipient on `GlobalState`).
#[derive(Accounts)]
pub struct SetTreasury<'info> {
    #[account(
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    /// New treasury owner. Unchecked because future custody could be a
    /// program-owned multisig/PDA; constraints below bind the key to the token
    /// account owner and canonical ATA.
    /// CHECK: validated by new_treasury.owner and ATA derivation.
    pub new_treasury_owner: UncheckedAccount<'info>,

    #[account(
        token::mint = skr_mint,
        constraint = new_treasury.owner == new_treasury_owner.key() @ SeekError::InvalidTreasuryOwner,
        constraint = new_treasury.key() == get_associated_token_address(&new_treasury_owner.key(), &SKR_MINT) @ SeekError::InvalidTreasuryAccount
    )]
    pub new_treasury: Box<Account<'info, TokenAccount>>,

    #[account(address = SKR_MINT @ SeekError::InvalidMint)]
    pub skr_mint: Box<Account<'info, Mint>>,
}

#[derive(Accounts)]
pub struct CloseBounty<'info> {
    /// Player who owns the bounty (receives rent refund)
    #[account(mut)]
    pub player: Signer<'info>,

    /// The bounty to close (must be terminal: Won/Lost/Cancelled)
    #[account(
        mut,
        close = player,
        constraint = bounty.player == player.key() @ SeekError::Unauthorized,
        constraint = bounty.status == BountyStatus::Won
            || bounty.status == BountyStatus::Lost
            || bounty.status == BountyStatus::Cancelled
            @ SeekError::BountyNotPending
    )]
    pub bounty: Box<Account<'info, Bounty>>,
}
