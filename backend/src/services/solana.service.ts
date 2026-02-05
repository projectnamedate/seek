import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { config } from '../config';
import { Tier, BET_AMOUNTS } from '../types';
import bs58 from 'bs58';

// Initialize connection
let connection: Connection;

/**
 * Get or create Solana connection
 */
export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(config.solana.rpcUrl, 'confirmed');
  }
  return connection;
}

/**
 * Get authority keypair from private key
 */
export function getAuthorityKeypair(): Keypair {
  const privateKey = bs58.decode(config.solana.authorityPrivateKey);
  return Keypair.fromSecretKey(privateKey);
}

/**
 * Program addresses
 */
export const PROGRAM_ID = new PublicKey(config.program.seekProgramId);
export const SKR_MINT = new PublicKey(config.program.skrMint);

/**
 * Derive Global State PDA
 */
export function deriveGlobalStatePda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    PROGRAM_ID
  );
}

/**
 * Derive House Vault PDA
 */
export function deriveHouseVaultPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('house_vault')],
    PROGRAM_ID
  );
}

/**
 * Derive Singularity Vault PDA
 */
export function deriveSingularityVaultPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('singularity_vault')],
    PROGRAM_ID
  );
}

/**
 * Derive Bounty PDA for a player at a specific timestamp
 */
export function deriveBountyPda(
  playerWallet: PublicKey,
  timestamp: bigint
): [PublicKey, number] {
  const timestampBuffer = Buffer.alloc(8);
  timestampBuffer.writeBigInt64LE(timestamp);

  return PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), playerWallet.toBuffer(), timestampBuffer],
    PROGRAM_ID
  );
}

/**
 * Get current slot and timestamp for bounty creation
 */
export async function getCurrentSlotAndTimestamp(): Promise<{
  slot: number;
  timestamp: bigint;
}> {
  const conn = getConnection();
  const slot = await conn.getSlot();
  const blockTime = await conn.getBlockTime(slot);
  const timestamp = BigInt(blockTime || Math.floor(Date.now() / 1000));

  return { slot, timestamp };
}

/**
 * Resolve bounty on-chain (called after AI validation)
 * This is a placeholder - actual implementation requires Anchor client
 */
export async function resolveBountyOnChain(
  bountyPda: string,
  playerWallet: string,
  success: boolean
): Promise<{ signature: string; singularityWon?: boolean }> {
  // NOTE: Full implementation requires @coral-xyz/anchor client
  // This is a mock for development

  console.log(`[Solana] Resolving bounty on-chain:`);
  console.log(`  Bounty PDA: ${bountyPda}`);
  console.log(`  Player: ${playerWallet}`);
  console.log(`  Success: ${success}`);

  // In production, this would:
  // 1. Build resolve_bounty instruction
  // 2. Sign with authority keypair
  // 3. Send transaction
  // 4. Return signature

  // Mock response for development
  const mockSignature = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Simulate 1/500 singularity win on success
  const singularityWon = success && Math.random() < 0.002;

  return {
    signature: mockSignature,
    singularityWon,
  };
}

/**
 * Check if player has sufficient SKR balance for bet
 */
export async function checkPlayerBalance(
  playerWallet: string,
  tier: Tier
): Promise<{ sufficient: boolean; balance: bigint; required: bigint }> {
  // NOTE: Full implementation requires SPL token balance check
  // This is a placeholder

  const required = BET_AMOUNTS[tier];

  // Mock: assume sufficient for development
  return {
    sufficient: true,
    balance: required * 10n, // Mock 10x the required amount
    required,
  };
}

/**
 * Get house vault balance
 */
export async function getHouseVaultBalance(): Promise<bigint> {
  // NOTE: Full implementation requires SPL token account read
  // This is a placeholder

  // Mock: return 1M SKR
  return 1_000_000_000_000_000n;
}

/**
 * Get singularity vault balance (jackpot pool)
 */
export async function getSingularityVaultBalance(): Promise<bigint> {
  // NOTE: Full implementation requires SPL token account read
  // This is a placeholder

  // Mock: return 50K SKR
  return 50_000_000_000_000n;
}

/**
 * Verify a transaction signature
 */
export async function verifyTransaction(signature: string): Promise<boolean> {
  try {
    const conn = getConnection();
    const result = await conn.getSignatureStatus(signature);
    return result?.value?.confirmationStatus === 'confirmed' ||
           result?.value?.confirmationStatus === 'finalized';
  } catch {
    return false;
  }
}

/**
 * Format lamports to SKR display value
 */
export function formatSkr(lamports: bigint): string {
  const skr = Number(lamports) / 1_000_000_000;
  return skr.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
