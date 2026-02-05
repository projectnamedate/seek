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

#[program]
pub mod seek_protocol {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
