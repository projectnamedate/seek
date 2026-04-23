use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::get_associated_token_address;

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

/// Challenge period (300s on mainnet, 10s on devnet for demo).
#[cfg(feature = "mainnet")]
pub const CHALLENGE_PERIOD: i64 = 300;
#[cfg(feature = "devnet")]
pub const CHALLENGE_PERIOD: i64 = 10;

/// Entry amounts: 1000 / 2000 / 3000 SKR (in base units).
pub const TIER_1_ENTRY: u64 = 1000 * DECIMALS_MULTIPLIER;
pub const TIER_2_ENTRY: u64 = 2000 * DECIMALS_MULTIPLIER;
pub const TIER_3_ENTRY: u64 = 3000 * DECIMALS_MULTIPLIER;

/// Distribution percentages on loss (basis points, 10000 = 100%).
pub const HOUSE_SHARE_BPS: u64 = 7000;      // 70% stays in house
pub const SINGULARITY_SHARE_BPS: u64 = 2000; // 20% to jackpot pool
pub const PROTOCOL_SHARE_BPS: u64 = 1000;    // 10% to protocol treasury

/// Jackpot odds: 1 in 500 chance on every win.
pub const SINGULARITY_ODDS: u64 = 500;

/// Per-tier hunt timer durations (seconds).
pub const TIER_1_DURATION: i64 = 180;  // 3 minutes
pub const TIER_2_DURATION: i64 = 120;  // 2 minutes
pub const TIER_3_DURATION: i64 = 60;   // 1 minute

/// Dispute parameters. (Window enforced via bounty.challenge_ends_at; no
/// separate post-resolution dispute window.)
pub const DISPUTE_STAKE_BPS: u64 = 5000;     // 50% of original entry to dispute

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

/// Custom error codes for the Seek protocol
#[error_code]
pub enum SeekError {
    #[msg("Invalid entry amount. Must be 1000, 2000, or 3000 SKR")]
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
}

/// Global protocol state - tracks all protocol-wide metrics
#[account]
pub struct GlobalState {
    /// Cold authority. Signs admin ops: fund_house, set_hot_authority,
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
    /// Account size:
    ///   8 (discriminator)
    /// + 32 * 6 (authority, hot_authority, pending_authority, house_vault,
    ///          singularity_vault, protocol_treasury)
    /// + 8 * 7  (house_fund_balance, singularity_balance, total_burned,
    ///          total_bounties_created, total_bounties_won, total_bounties_lost,
    ///          total_singularity_wins)
    /// + 1       (bump)
    /// = 8 + 192 + 56 + 1 = 257
    pub const SIZE: usize = 8 + 32 * 6 + 8 * 7 + 1;
}

/// Bounty status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BountyStatus {
    /// Bounty accepted, player is hunting
    Pending,
    /// Photo submitted, awaiting resolution
    Submitted,
    /// Resolved as win, in challenge period (optimistic)
    ChallengeWon,
    /// Resolved as loss, in challenge period (optimistic)
    ChallengeLost,
    /// Player disputed the loss result
    Disputed,
    /// Final: Player won (after challenge period)
    Won,
    /// Final: Player lost (after challenge period)
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

    /// Entry amount in SKR lamports (1000B, 2000B, or 3000B)
    pub entry_amount: u64,

    /// Potential reward (3x entry: entry back + 2x profit)
    pub payout_amount: u64,

    /// Unix timestamp when bounty was accepted
    pub created_at: i64,

    /// Unix timestamp when bounty expires (hunt timer)
    pub expires_at: i64,

    /// Current status of the bounty
    pub status: BountyStatus,

    /// Bounty tier (1, 2, or 3)
    pub tier: u8,

    /// Whether this bounty won the singularity jackpot
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

    // === OPTIMISTIC RESOLUTION FIELDS ===
    /// Timestamp when resolution was submitted (challenge period starts)
    pub resolved_at: i64,

    /// Timestamp when challenge period ends
    pub challenge_ends_at: i64,

    /// Whether the proposed result was a win
    pub proposed_win: bool,

    // === DISPUTE FIELDS ===
    /// Whether this bounty has been disputed
    pub is_disputed: bool,

    /// Dispute stake amount (if disputed)
    pub dispute_stake: u64,

    /// Timestamp when dispute was filed
    pub disputed_at: i64,
}

impl Bounty {
    /// Account size calculation:
    /// 8 (discriminator) + 32*2 (pubkeys) + 8*4 (u64/i64: entry, payout, created_at, expires_at)
    /// + 1*4 (status, tier, singularity_won, bump)
    /// + 32*2 (commitment + mission_id) + 1 (mission_revealed)
    /// + 8*2 (resolved_at, challenge_ends_at) + 1 (proposed_win)
    /// + 1 (is_disputed) + 8 (dispute_stake) + 8 (disputed_at)
    /// = 8 + 64 + 32 + 4 + 64 + 1 + 16 + 1 + 1 + 16 = 207, padded to 216
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

/// Emitted when mission is revealed (commit-reveal)
#[event]
pub struct MissionRevealed {
    pub bounty: Pubkey,
    pub mission_id: [u8; 32],
    pub commitment_verified: bool,
}

/// Emitted when bounty enters challenge period (optimistic resolution)
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

/// Emitted when bounty is finalized after challenge period
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
        global_state.singularity_balance = 0;
        global_state.total_burned = 0;
        global_state.total_bounties_created = 0;
        global_state.total_bounties_won = 0;
        global_state.total_bounties_lost = 0;
        global_state.total_singularity_wins = 0;

        // Store bump for future PDA derivations
        global_state.bump = ctx.bumps.global_state;

        msg!("Seek Protocol global state initialized!");
        msg!("Authority: {}", global_state.authority);
        msg!("Hot authority: {} (rotate via set_hot_authority)", global_state.hot_authority);

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

        msg!("Singularity vault initialized: {}", global_state.singularity_vault);
        msg!("Protocol treasury set: {}", global_state.protocol_treasury);
        Ok(())
    }

    /// Accept a bounty - player submits their entry and starts the hunt.
    /// entry_amount must be exactly TIER_1_ENTRY / TIER_2_ENTRY / TIER_3_ENTRY
    /// (1000 / 2000 / 3000 SKR in base units — multiplier depends on SKR_DECIMALS).
    /// mission_commitment is hash(mission_id || salt) for commit-reveal.
    /// timestamp must be within 60 seconds of current time (for PDA derivation).
    pub fn accept_bounty(
        ctx: Context<AcceptBounty>,
        entry_amount: u64,
        timestamp: i64,
        mission_commitment: [u8; 32],
    ) -> Result<()> {
        // Validate entry amount and get tier
        let tier = validate_entry_amount(entry_amount)?;

        // Get current timestamp and validate provided timestamp is recent
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Timestamp must be within 60 seconds of current time
        require!(
            (current_time - timestamp).abs() <= 60,
            SeekError::InvalidTimestamp
        );

        // Calculate expiration based on tier
        let duration = get_tier_duration(tier)?;
        let expires_at = current_time
            .checked_add(duration)
            .ok_or(SeekError::MathOverflow)?;

        // Calculate 3x payout (entry back + 2x profit)
        let payout_amount = entry_amount
            .checked_mul(3)
            .ok_or(SeekError::MathOverflow)?;

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
        msg!("Entry: {} SKR (Tier {})", entry_amount / DECIMALS_MULTIPLIER, tier);
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

    /// Propose bounty resolution (OPTIMISTIC) - starts challenge period
    /// Result is NOT final until challenge period ends
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

        // Calculate challenge period end
        let challenge_ends_at = current_time
            .checked_add(CHALLENGE_PERIOD)
            .ok_or(SeekError::MathOverflow)?;

        // Set optimistic resolution fields
        bounty.resolved_at = current_time;
        bounty.challenge_ends_at = challenge_ends_at;
        bounty.proposed_win = success;

        // Update status to challenge period
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

        msg!("Resolution proposed: {} | Challenge ends: {}",
            if success { "WIN" } else { "LOSS" },
            challenge_ends_at
        );

        Ok(())
    }

    /// Finalize bounty - called after challenge period ends (if no dispute)
    /// Actually executes the payout or distribution
    pub fn finalize_bounty(ctx: Context<FinalizeBounty>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let global_state = &mut ctx.accounts.global_state;

        // Verify bounty is in challenge period
        require!(
            bounty.status == BountyStatus::ChallengeWon || bounty.status == BountyStatus::ChallengeLost,
            SeekError::BountyNotPending
        );

        // Verify challenge period has ended
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;
        require!(
            current_time >= bounty.challenge_ends_at,
            SeekError::ChallengePeriodActive
        );

        // Verify not disputed
        require!(!bounty.is_disputed, SeekError::AlreadyDisputed);

        let success = bounty.proposed_win;

        if success {
            // === WIN PATH ===
            // Check house vault has enough actual tokens for 3x payout
            // Use actual vault balance (not tracked) to avoid divergence issues
            require!(
                ctx.accounts.house_vault.amount >= bounty.payout_amount,
                SeekError::InsufficientHouseFunds
            );

            // Transfer 3x entry to player (entry back + 2x profit)
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

            // Update house balance (subtract 3x, but we received 1x, so net -2x)
            // Use saturating_sub: tracked balance may be lower than actual vault balance
            global_state.house_fund_balance = global_state
                .house_fund_balance
                .saturating_sub(bounty.payout_amount);

            // === SINGULARITY JACKPOT ROLL ===
            // Entropy sources (stacked by hardness for a grinding attacker):
            //   1. bounty.mission_commitment  - 32-byte hash(mission_id || salt) fixed at accept_bounty
            //   2. bounty.key()               - PDA derived from player + timestamp
            //   3. clock.slot                 - current slot (manipulable by slot leader)
            //   4. clock.unix_timestamp       - best-effort wall clock
            //
            // A slot leader at finalize time can still grind by choosing which finalize_bounty
            // transactions to include in their slot, but they must match both a specific
            // mission_commitment AND a specific bounty PDA, which sharply limits the attack's
            // expected value unless the jackpot pool dwarfs a slot's block production revenue.
            //
            // TODO (post-launch): migrate to Switchboard On-Demand VRF once the Singularity
            // jackpot pool exceeds ~$50k USD equivalent — grinding ROI threshold. See
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

            // Track jackpot amount for event
            let mut jackpot_won: u64 = 0;

            if roll == 0 && global_state.singularity_balance > 0 {
                // JACKPOT! Transfer entire singularity pool to player
                jackpot_won = global_state.singularity_balance;

                let jackpot_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.singularity_vault.to_account_info(),
                        to: ctx.accounts.player_token_account.to_account_info(),
                        authority: global_state.to_account_info(),
                    },
                    signer_seeds,
                );
                token::transfer(jackpot_ctx, jackpot_won)?;

                bounty.singularity_won = true;
                global_state.singularity_balance = 0;
                global_state.total_singularity_wins = global_state
                    .total_singularity_wins
                    .checked_add(1)
                    .ok_or(SeekError::MathOverflow)?;

                msg!("SINGULARITY WON! Jackpot: {} SKR", jackpot_won / DECIMALS_MULTIPLIER);
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
                singularity_amount: jackpot_won,
            });

            msg!("Bounty WON! Payout: {} SKR", bounty.payout_amount / DECIMALS_MULTIPLIER);
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
            msg!("  Singularity: {} SKR (20%)", singularity_share / DECIMALS_MULTIPLIER);
            msg!("  Protocol: {} SKR (10%)", protocol_share / DECIMALS_MULTIPLIER);
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
        msg!("New balance: {} SKR", global_state.house_fund_balance / DECIMALS_MULTIPLIER);

        Ok(())
    }

    /// Dispute a bounty result - player stakes additional SKR to challenge
    /// Can only dispute LOSS results during challenge period
    pub fn dispute_bounty(ctx: Context<DisputeBounty>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Can only dispute losses (no point disputing wins)
        require!(
            bounty.status == BountyStatus::ChallengeLost,
            SeekError::BountyNotPending
        );

        // Must be within challenge period
        require!(
            current_time < bounty.challenge_ends_at,
            SeekError::ChallengePeriodEnded
        );

        // Cannot dispute twice
        require!(!bounty.is_disputed, SeekError::AlreadyDisputed);

        // Calculate dispute stake (50% of original entry)
        let dispute_stake = bounty.entry_amount
            .checked_mul(DISPUTE_STAKE_BPS)
            .ok_or(SeekError::MathOverflow)?
            .checked_div(10000)
            .ok_or(SeekError::MathOverflow)?;

        // Transfer dispute stake from player to house vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player_token_account.to_account_info(),
                to: ctx.accounts.house_vault.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, dispute_stake)?;

        // Track dispute stake in house balance
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

        msg!("Bounty disputed! Stake: {} SKR", dispute_stake / DECIMALS_MULTIPLIER);

        Ok(())
    }

    /// Resolve a dispute - authority reviews and decides
    /// player_wins = true: player gets original entry back + dispute stake
    /// player_wins = false: dispute stake forfeited, loss stands
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

        if player_wins {
            // Player wins dispute: refund entry + dispute stake back
            let total_refund = bounty.entry_amount
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
            global_state.house_fund_balance = global_state
                .house_fund_balance
                .saturating_sub(total_refund);

            bounty.status = BountyStatus::Won;
            global_state.total_bounties_won = global_state
                .total_bounties_won
                .checked_add(1)
                .ok_or(SeekError::MathOverflow)?;

            msg!("Dispute resolved: PLAYER WINS | Refund: {} SKR", total_refund / DECIMALS_MULTIPLIER);
        } else {
            // Player loses dispute: stake forfeited, distribute entry (70/20/10)
            // Dispute stake already tracked in house_fund_balance (from dispute_bounty)
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

            // Update house balance: subtract entry, add back house_share (net: keep 70% + dispute_stake)
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

            msg!("Dispute resolved: PLAYER LOSES | Entry distributed 70/20/10, stake forfeited");
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
    /// Only works if bounty is still in Pending or Submitted state (not resolved)
    pub fn cancel_bounty(ctx: Context<CancelBounty>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let global_state = &mut ctx.accounts.global_state;
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Must be in a cancellable state (not yet resolved)
        require!(
            bounty.status == BountyStatus::Pending || bounty.status == BountyStatus::Submitted,
            SeekError::BountyAlreadyResolved
        );

        // Must be expired + 1 hour grace period for backend to resolve
        let grace_period: i64 = 3600; // 1 hour
        require!(
            current_time > bounty.expires_at + grace_period,
            SeekError::BountyNotExpired
        );

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

        msg!("Bounty cancelled! Refund: {} SKR", bounty.entry_amount / DECIMALS_MULTIPLIER);

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
        require!(
            new_authority != Pubkey::default(),
            SeekError::Unauthorized
        );

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

        msg!("Authority transferred from {} to {}", old_authority, new_authority);

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

        msg!("Protocol treasury rotated: {} -> {}", old_treasury, new_treasury);
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
    pub global_state: Box<Account<'info, GlobalState>>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
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

    /// Protocol treasury - existing token account for protocol fees
    #[account(
        token::mint = skr_mint,
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
    /// Anyone can finalize after challenge period (permissionless)
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

    /// Singularity vault for jackpot
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
pub struct DisputeBounty<'info> {
    /// Player disputing the bounty
    #[account(
        mut,
        constraint = player.key() == bounty.player @ SeekError::Unauthorized
    )]
    pub player: Signer<'info>,

    /// Global state PDA (mut to track dispute stake)
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

    /// Player's token account for stake — pinned to canonical ATA.
    #[account(
        mut,
        constraint = player_token_account.key() == get_associated_token_address(&player.key(), &SKR_MINT) @ SeekError::Unauthorized
    )]
    pub player_token_account: Box<Account<'info, TokenAccount>>,

    /// House vault to receive stake
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
/// `new_treasury` must be an existing SKR TokenAccount (the rent-paying
/// caller pre-creates the ATA off-chain — this instruction just records
/// the new recipient on `GlobalState`).
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

    #[account(
        token::mint = skr_mint,
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
