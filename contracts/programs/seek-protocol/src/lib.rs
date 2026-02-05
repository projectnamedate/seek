use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Seek111111111111111111111111111111111111111");

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

/// Timer durations in seconds
pub const TIER_1_DURATION: i64 = 600;  // 10 minutes
pub const TIER_2_DURATION: i64 = 300;  // 5 minutes
pub const TIER_3_DURATION: i64 = 120;  // 2 minutes

/// Trust-minimization constants
pub const CHALLENGE_PERIOD: i64 = 300;       // 5 minutes to challenge a result
pub const DISPUTE_STAKE_BPS: u64 = 5000;     // 50% of original bet to dispute
pub const DISPUTE_WINDOW: i64 = 600;         // 10 minutes to file dispute after resolution

/// Validate bet amount and return tier
pub fn validate_bet_amount(bet_amount: u64) -> Result<u8> {
    match bet_amount {
        TIER_1_BET => Ok(1),
        TIER_2_BET => Ok(2),
        TIER_3_BET => Ok(3),
        _ => Err(SeekError::InvalidBetAmount.into()),
    }
}

/// Get timer duration for a tier
pub fn get_tier_duration(tier: u8) -> i64 {
    match tier {
        1 => TIER_1_DURATION,
        2 => TIER_2_DURATION,
        3 => TIER_3_DURATION,
        _ => TIER_1_DURATION, // Default fallback
    }
}

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

    #[msg("Dispute window has expired")]
    DisputeWindowExpired,

    #[msg("Bounty already disputed")]
    AlreadyDisputed,

    #[msg("Invalid dispute stake amount")]
    InvalidDisputeStake,

    #[msg("Bounty not in disputed state")]
    NotDisputed,

    #[msg("Bounty is still in challenge period")]
    StillInChallengePeriod,
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

    /// Bet amount in SKR lamports (100B, 200B, or 300B)
    pub bet_amount: u64,

    /// Potential payout (2x bet)
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
    /// 8 (discriminator) + 32*2 (pubkeys) + 8*7 (u64/i64s) + 1*5 (u8/bool/enum)
    /// + 32*2 (commitment + mission_id) = 8 + 64 + 56 + 5 + 64 = 197, round to 200
    pub const SIZE: usize = 200;
}

// ============================================================================
// EVENTS - Emitted for frontend and indexer tracking
// ============================================================================

/// Emitted when a player accepts a bounty
#[event]
pub struct BountyAccepted {
    pub player: Pubkey,
    pub bounty: Pubkey,
    pub bet_amount: u64,
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
    pub bet_amount: u64,
    pub house_share: u64,
    pub singularity_share: u64,
    pub burn_share: u64,
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

/// Emitted when authority withdraws from treasury
#[event]
pub struct TreasuryWithdrawn {
    pub authority: Pubkey,
    pub amount: u64,
    pub destination: Pubkey,
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

    /// Accept a bounty - player places their bet and starts the hunt
    /// bet_amount must be exactly 100, 200, or 300 SKR (with 9 decimals)
    /// mission_commitment is hash(mission_id || salt) for commit-reveal
    pub fn accept_bounty(
        ctx: Context<AcceptBounty>,
        bet_amount: u64,
        mission_commitment: [u8; 32],
    ) -> Result<()> {
        // Validate bet amount and get tier
        let tier = validate_bet_amount(bet_amount)?;

        // Get current timestamp
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Calculate expiration based on tier
        let duration = get_tier_duration(tier);
        let expires_at = current_time
            .checked_add(duration)
            .ok_or(SeekError::MathOverflow)?;

        // Calculate 2x payout
        let payout_amount = bet_amount
            .checked_mul(2)
            .ok_or(SeekError::MathOverflow)?;

        // Initialize bounty account
        let bounty = &mut ctx.accounts.bounty;
        bounty.player = ctx.accounts.player.key();
        bounty.global_state = ctx.accounts.global_state.key();
        bounty.bet_amount = bet_amount;
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

        // Transfer bet from player to house vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player_token_account.to_account_info(),
                to: ctx.accounts.house_vault.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, bet_amount)?;

        // Update global state
        let global_state = &mut ctx.accounts.global_state;
        global_state.house_fund_balance = global_state
            .house_fund_balance
            .checked_add(bet_amount)
            .ok_or(SeekError::MathOverflow)?;
        global_state.total_bounties_created = global_state
            .total_bounties_created
            .checked_add(1)
            .ok_or(SeekError::MathOverflow)?;

        // Emit event
        emit!(BountyAccepted {
            player: bounty.player,
            bounty: bounty.key(),
            bet_amount,
            tier,
            expires_at,
        });

        msg!("Bounty accepted!");
        msg!("Player: {}", bounty.player);
        msg!("Bet: {} SKR (Tier {})", bet_amount / 1_000_000_000, tier);
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
        let computed_hash = solana_program::hash::hash(&input);

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
            // Check house has enough funds for 2x payout
            require!(
                global_state.house_fund_balance >= bounty.payout_amount,
                SeekError::InsufficientHouseFunds
            );

            // Transfer 2x bet to player
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

            // Update house balance (subtract 2x, but we received 1x, so net -1x)
            global_state.house_fund_balance = global_state
                .house_fund_balance
                .checked_sub(bounty.payout_amount)
                .ok_or(SeekError::MathOverflow)?;

            // === SINGULARITY JACKPOT ROLL ===
            // Use (slot + timestamp) % 500 for randomness
            let slot = clock.slot;
            let timestamp = clock.unix_timestamp as u64;
            let roll = (slot.checked_add(timestamp).ok_or(SeekError::MathOverflow)?)
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

                msg!("SINGULARITY WON! Jackpot: {} SKR", jackpot_won / 1_000_000_000);
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

            msg!("Bounty WON! Payout: {} SKR", bounty.payout_amount / 1_000_000_000);
        } else {
            // === LOSS PATH ===
            // Distribute bet: 70% house, 15% singularity, 10% burn, 5% protocol
            let bet = bounty.bet_amount;

            // Calculate shares (using basis points for precision)
            let house_share = bet
                .checked_mul(HOUSE_SHARE_BPS)
                .ok_or(SeekError::MathOverflow)?
                .checked_div(10000)
                .ok_or(SeekError::MathOverflow)?;

            let singularity_share = bet
                .checked_mul(SINGULARITY_SHARE_BPS)
                .ok_or(SeekError::MathOverflow)?
                .checked_div(10000)
                .ok_or(SeekError::MathOverflow)?;

            let burn_share = bet
                .checked_mul(BURN_SHARE_BPS)
                .ok_or(SeekError::MathOverflow)?
                .checked_div(10000)
                .ok_or(SeekError::MathOverflow)?;

            let protocol_share = bet
                .checked_mul(PROTOCOL_SHARE_BPS)
                .ok_or(SeekError::MathOverflow)?
                .checked_div(10000)
                .ok_or(SeekError::MathOverflow)?;

            let seeds = &[b"global_state".as_ref(), &[global_state.bump]];
            let signer_seeds = &[&seeds[..]];

            // 70% stays in house vault (already there from accept_bounty)
            // Just update the tracked balance
            // We need to subtract the full bet first, then add back the house share
            global_state.house_fund_balance = global_state
                .house_fund_balance
                .checked_sub(bet)
                .ok_or(SeekError::MathOverflow)?
                .checked_add(house_share)
                .ok_or(SeekError::MathOverflow)?;

            // 15% transfer to singularity vault
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

            // 10% burn via SPL token burn
            let burn_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.skr_mint.to_account_info(),
                    from: ctx.accounts.house_vault.to_account_info(),
                    authority: global_state.to_account_info(),
                },
                signer_seeds,
            );
            token::burn(burn_ctx, burn_share)?;

            global_state.total_burned = global_state
                .total_burned
                .checked_add(burn_share)
                .ok_or(SeekError::MathOverflow)?;

            // 5% transfer to protocol treasury
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
                bet_amount: bet,
                house_share,
                singularity_share,
                burn_share,
                protocol_share,
            });

            msg!("Bounty LOST. Distribution:");
            msg!("  House: {} SKR (70%)", house_share / 1_000_000_000);
            msg!("  Singularity: {} SKR (15%)", singularity_share / 1_000_000_000);
            msg!("  Burned: {} SKR (10%)", burn_share / 1_000_000_000);
            msg!("  Protocol: {} SKR (5%)", protocol_share / 1_000_000_000);
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

        msg!("House funded with {} SKR", amount / 1_000_000_000);
        msg!("New balance: {} SKR", global_state.house_fund_balance / 1_000_000_000);

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

        // Calculate dispute stake (50% of original bet)
        let dispute_stake = bounty.bet_amount
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

        msg!("Bounty disputed! Stake: {} SKR", dispute_stake / 1_000_000_000);

        Ok(())
    }

    /// Resolve a dispute - authority reviews and decides
    /// player_wins = true: player gets original bet back + dispute stake
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
            // Player wins dispute: refund bet + dispute stake + payout
            let total_refund = bounty.bet_amount
                .checked_add(bounty.dispute_stake)
                .ok_or(SeekError::MathOverflow)?
                .checked_add(bounty.bet_amount) // Extra bet as compensation
                .ok_or(SeekError::MathOverflow)?;

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

            global_state.house_fund_balance = global_state
                .house_fund_balance
                .checked_sub(total_refund)
                .ok_or(SeekError::MathOverflow)?;

            bounty.status = BountyStatus::Won;
            global_state.total_bounties_won = global_state
                .total_bounties_won
                .checked_add(1)
                .ok_or(SeekError::MathOverflow)?;

            msg!("Dispute resolved: PLAYER WINS | Refund: {} SKR", total_refund / 1_000_000_000);
        } else {
            // Player loses dispute: stake forfeited, mark as lost
            // Dispute stake stays in house vault
            global_state.house_fund_balance = global_state
                .house_fund_balance
                .checked_add(bounty.dispute_stake)
                .ok_or(SeekError::MathOverflow)?;

            bounty.status = BountyStatus::Lost;
            global_state.total_bounties_lost = global_state
                .total_bounties_lost
                .checked_add(1)
                .ok_or(SeekError::MathOverflow)?;

            msg!("Dispute resolved: PLAYER LOSES | Stake forfeited");
        }

        emit!(DisputeResolved {
            bounty: bounty.key(),
            player: bounty.player,
            player_won_dispute: player_wins,
            stake_returned: player_wins,
        });

        Ok(())
    }

    /// Withdraw from protocol treasury - authority only
    /// Used to pay for operational costs (API, infra, team)
    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        let global_state = &ctx.accounts.global_state;

        // Verify authority
        require!(
            ctx.accounts.authority.key() == global_state.authority,
            SeekError::Unauthorized
        );

        // Transfer from treasury to authority's wallet
        let seeds = &[b"global_state".as_ref(), &[global_state.bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.protocol_treasury.to_account_info(),
                to: ctx.accounts.authority_token_account.to_account_info(),
                authority: ctx.accounts.global_state.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, amount)?;

        emit!(TreasuryWithdrawn {
            authority: ctx.accounts.authority.key(),
            amount,
            destination: ctx.accounts.authority_token_account.key(),
        });

        msg!("Treasury withdrawn: {} SKR", amount / 1_000_000_000);

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

#[derive(Accounts)]
#[instruction(bet_amount: u64)]
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
    pub global_state: Account<'info, GlobalState>,

    /// Bounty PDA - unique per player + timestamp
    #[account(
        init,
        payer = player,
        space = Bounty::SIZE,
        seeds = [b"bounty", player.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub bounty: Account<'info, Bounty>,

    /// Player's SKR token account
    #[account(
        mut,
        constraint = player_token_account.mint == SKR_MINT @ SeekError::InvalidMint,
        constraint = player_token_account.owner == player.key() @ SeekError::Unauthorized
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    /// House vault to receive bet
    #[account(
        mut,
        seeds = [b"house_vault"],
        bump,
        constraint = house_vault.key() == global_state.house_vault
    )]
    pub house_vault: Account<'info, TokenAccount>,

    /// The SKR token mint
    #[account(
        address = SKR_MINT @ SeekError::InvalidMint
    )]
    pub skr_mint: Account<'info, Mint>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

// === NEW TRUST-MINIMIZATION ACCOUNT STRUCTS ===

#[derive(Accounts)]
pub struct RevealMission<'info> {
    /// Authority revealing the mission
    #[account(
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

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
    /// Authority proposing the resolution
    #[account(
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

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
    pub global_state: Account<'info, GlobalState>,

    /// The bounty being finalized
    #[account(
        mut,
        constraint = bounty.global_state == global_state.key()
    )]
    pub bounty: Account<'info, Bounty>,

    /// Player's token account for payout (on win)
    #[account(
        mut,
        constraint = player_token_account.mint == SKR_MINT @ SeekError::InvalidMint,
        constraint = player_token_account.owner == bounty.player @ SeekError::Unauthorized
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    /// House vault
    #[account(
        mut,
        seeds = [b"house_vault"],
        bump,
        constraint = house_vault.key() == global_state.house_vault
    )]
    pub house_vault: Account<'info, TokenAccount>,

    /// Singularity vault for jackpot
    #[account(
        mut,
        seeds = [b"singularity_vault"],
        bump,
        constraint = singularity_vault.key() == global_state.singularity_vault
    )]
    pub singularity_vault: Account<'info, TokenAccount>,

    /// Protocol treasury for fees
    #[account(
        mut,
        constraint = protocol_treasury.key() == global_state.protocol_treasury
    )]
    pub protocol_treasury: Account<'info, TokenAccount>,

    /// SKR mint (needed for burn)
    #[account(
        mut,
        address = SKR_MINT @ SeekError::InvalidMint
    )]
    pub skr_mint: Account<'info, Mint>,

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
pub struct WithdrawTreasury<'info> {
    /// Authority withdrawing funds
    #[account(
        mut,
        constraint = authority.key() == global_state.authority @ SeekError::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// Global state PDA
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    /// Protocol treasury (source)
    #[account(
        mut,
        constraint = protocol_treasury.key() == global_state.protocol_treasury
    )]
    pub protocol_treasury: Account<'info, TokenAccount>,

    /// Authority's token account (destination)
    #[account(
        mut,
        constraint = authority_token_account.mint == SKR_MINT @ SeekError::InvalidMint,
        constraint = authority_token_account.owner == authority.key() @ SeekError::Unauthorized
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

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

    /// Global state PDA
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    /// The bounty being disputed
    #[account(
        mut,
        constraint = bounty.global_state == global_state.key()
    )]
    pub bounty: Account<'info, Bounty>,

    /// Player's token account for stake
    #[account(
        mut,
        constraint = player_token_account.mint == SKR_MINT @ SeekError::InvalidMint,
        constraint = player_token_account.owner == player.key() @ SeekError::Unauthorized
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    /// House vault to receive stake
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
    pub global_state: Account<'info, GlobalState>,

    /// The disputed bounty
    #[account(
        mut,
        constraint = bounty.global_state == global_state.key()
    )]
    pub bounty: Account<'info, Bounty>,

    /// Player's token account for refund (if player wins)
    #[account(
        mut,
        constraint = player_token_account.mint == SKR_MINT @ SeekError::InvalidMint,
        constraint = player_token_account.owner == bounty.player @ SeekError::Unauthorized
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    /// House vault
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
