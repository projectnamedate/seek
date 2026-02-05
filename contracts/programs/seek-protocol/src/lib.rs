use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

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

/// Timer durations in seconds
pub const TIER_1_DURATION: i64 = 600;  // 10 minutes
pub const TIER_2_DURATION: i64 = 300;  // 5 minutes
pub const TIER_3_DURATION: i64 = 120;  // 2 minutes

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

    /// Accept a bounty - player places their bet and starts the hunt
    /// bet_amount must be exactly 100, 200, or 300 SKR (with 9 decimals)
    pub fn accept_bounty(ctx: Context<AcceptBounty>, bet_amount: u64) -> Result<()> {
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

        msg!("Bounty accepted!");
        msg!("Player: {}", bounty.player);
        msg!("Bet: {} SKR (Tier {})", bet_amount / 1_000_000_000, tier);
        msg!("Expires at: {}", expires_at);

        Ok(())
    }

    /// Resolve a bounty - called by backend after AI validation
    /// success = true: player wins 2x bet + singularity roll
    /// success = false: bet distributed 70/15/10/5
    pub fn resolve_bounty(ctx: Context<ResolveBounty>, success: bool) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let global_state = &mut ctx.accounts.global_state;

        // Verify bounty is still pending
        require!(
            bounty.status == BountyStatus::Pending,
            SeekError::BountyAlreadyResolved
        );

        // Get clock for singularity roll
        let clock = Clock::get()?;

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

            if roll == 0 && global_state.singularity_balance > 0 {
                // JACKPOT! Transfer entire singularity pool to player
                let jackpot_amount = global_state.singularity_balance;

                let jackpot_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.singularity_vault.to_account_info(),
                        to: ctx.accounts.player_token_account.to_account_info(),
                        authority: global_state.to_account_info(),
                    },
                    signer_seeds,
                );
                token::transfer(jackpot_ctx, jackpot_amount)?;

                bounty.singularity_won = true;
                global_state.singularity_balance = 0;
                global_state.total_singularity_wins = global_state
                    .total_singularity_wins
                    .checked_add(1)
                    .ok_or(SeekError::MathOverflow)?;

                msg!("SINGULARITY WON! Jackpot: {} SKR", jackpot_amount / 1_000_000_000);
            }

            bounty.status = BountyStatus::Won;
            global_state.total_bounties_won = global_state
                .total_bounties_won
                .checked_add(1)
                .ok_or(SeekError::MathOverflow)?;

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

            msg!("Bounty LOST. Distribution:");
            msg!("  House: {} SKR (70%)", house_share / 1_000_000_000);
            msg!("  Singularity: {} SKR (15%)", singularity_share / 1_000_000_000);
            msg!("  Burned: {} SKR (10%)", burn_share / 1_000_000_000);
            msg!("  Protocol: {} SKR (5%)", protocol_share / 1_000_000_000);
        }

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

#[derive(Accounts)]
pub struct ResolveBounty<'info> {
    /// Authority resolving the bounty (backend signer)
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

    /// The bounty being resolved
    #[account(
        mut,
        constraint = bounty.global_state == global_state.key(),
        constraint = bounty.status == BountyStatus::Pending @ SeekError::BountyAlreadyResolved
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
