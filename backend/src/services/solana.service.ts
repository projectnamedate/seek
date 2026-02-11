import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { config } from '../config';
import { Tier, ENTRY_AMOUNTS } from '../types';
import bs58 from 'bs58';

// Initialize connection
let connection: Connection;

// Cache authority keypair (decode once, not on every call)
let cachedAuthority: Keypair | null = null;

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
 * Get authority keypair from private key (cached)
 */
export function getAuthorityKeypair(): Keypair {
  if (!cachedAuthority) {
    const privateKey = bs58.decode(config.solana.authorityPrivateKey);
    cachedAuthority = Keypair.fromSecretKey(privateKey);
  }
  return cachedAuthority;
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
 * Guard: throw in production if mocked functions are called.
 * Prevents silent failures on mainnet.
 */
function assertDevMode(fnName: string): void {
  if (config.server.isProd) {
    throw new Error(
      `[Solana] ${fnName}() is not implemented for production. ` +
      `Deploy the Anchor client integration before going to mainnet.`
    );
  }
}

/**
 * Resolve bounty on-chain (called after AI validation)
 *
 * TODO: Full implementation requires Anchor client:
 *   1. reveal_mission(mission_id, salt) — reveal the committed mission
 *   2. propose_resolution(success) — propose win/loss
 *   3. finalize_bounty() — execute payout after challenge period
 */
export async function resolveBountyOnChain(
  bountyPda: string,
  playerWallet: string,
  success: boolean
): Promise<{ signature: string; singularityWon?: boolean }> {
  assertDevMode('resolveBountyOnChain');

  console.log(`[Solana] [MOCK] Resolving bounty: PDA=${bountyPda.slice(0, 8)}... Player=${playerWallet.slice(0, 8)}... Success=${success}`);

  const mockSignature = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const singularityWon = success && Math.random() < 0.002;

  return { signature: mockSignature, singularityWon };
}

/**
 * Check if player has sufficient SKR balance for entry
 *
 * TODO: Query actual SPL token account balance
 */
export async function checkPlayerBalance(
  playerWallet: string,
  tier: Tier
): Promise<{ sufficient: boolean; balance: bigint; required: bigint }> {
  assertDevMode('checkPlayerBalance');

  const required = ENTRY_AMOUNTS[tier];
  return {
    sufficient: true,
    balance: required * 10n,
    required,
  };
}

/**
 * Get house vault balance
 *
 * TODO: Query actual SPL token account
 */
export async function getHouseVaultBalance(): Promise<bigint> {
  assertDevMode('getHouseVaultBalance');
  return 1_000_000_000_000_000n;
}

/**
 * Get singularity vault balance (jackpot pool)
 *
 * TODO: Query actual SPL token account
 */
export async function getSingularityVaultBalance(): Promise<bigint> {
  assertDevMode('getSingularityVaultBalance');
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
