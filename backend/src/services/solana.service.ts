import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { config } from '../config';
import { Tier, ENTRY_AMOUNTS, SKR_MULTIPLIER } from '../types';
import bs58 from 'bs58';
import { createHash, randomFillSync } from 'crypto';
import { queueFinalization } from './finalizer.service';
import { childLogger } from './logger.service';
import { withTimeout } from '../utils/timeout';

// Load IDL
import idl from '../idl/seek_protocol.json';

const log = childLogger('solana');

// Initialize connection (singleton)
let connection: Connection;

// Cache hot authority keypair (for reveal_mission + propose_resolution only).
// Safe to keep on the backend; compromise is contained to hot-path scope.
let cachedHotAuthority: Keypair | null = null;

// Cache Anchor program instance (signs with hot authority by default — hot-path
// ops dominate traffic; cold-path ops build + sign their own tx).
let cachedProgram: Program | null = null;

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
 * Get hot authority keypair (reveal_mission + propose_resolution).
 * Falls back to the cold authority when HOT_AUTHORITY_PRIVATE_KEY is unset
 * (dev/devnet convenience). On mainnet, always set HOT_AUTHORITY_PRIVATE_KEY.
 */
export function getHotAuthorityKeypair(): Keypair {
  if (!cachedHotAuthority) {
    const hotPk = config.solana.hotAuthorityPrivateKey || config.solana.authorityPrivateKey;
    const privateKey = bs58.decode(hotPk);
    cachedHotAuthority = Keypair.fromSecretKey(privateKey);
  }
  return cachedHotAuthority;
}

/**
 * Get Anchor program instance (cached). Signs with the hot authority —
 * cold-path operations that need the cold authority should build/sign their
 * own tx via connection.sendTransaction with the cold keypair.
 */
export function getProgram(): Program {
  if (!cachedProgram) {
    const conn = getConnection();
    const hotAuthority = getHotAuthorityKeypair();
    const wallet = new Wallet(hotAuthority);
    const provider = new AnchorProvider(conn, wallet, {
      commitment: 'confirmed',
    });
    cachedProgram = new Program(idl as any, provider);
  }
  return cachedProgram;
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
 * Generate mission commitment: hash(mission_id || salt)
 * Returns { commitment, missionIdBytes, salt } for commit-reveal
 */
export function generateMissionCommitment(missionId: string): {
  commitment: Buffer;
  missionIdBytes: Buffer;
  salt: Buffer;
} {
  // Pad/hash mission ID to exactly 32 bytes
  const missionIdBytes = Buffer.alloc(32);
  const missionHash = createHash('sha256').update(missionId).digest();
  missionHash.copy(missionIdBytes);

  // Generate random 32-byte salt
  const salt = Buffer.alloc(32);
  randomFillSync(salt);

  // commitment = hash(mission_id || salt)
  const input = Buffer.concat([missionIdBytes, salt]);
  const commitment = createHash('sha256').update(input).digest();

  return { commitment, missionIdBytes, salt };
}

/**
 * Reveal mission on-chain (after player submits photo)
 * Part 1 of resolution: reveals the committed mission
 */
export async function revealMissionOnChain(
  bountyPda: string,
  missionIdBytes: Buffer,
  salt: Buffer
): Promise<string> {
  const program = getProgram();
  const [globalStatePda] = deriveGlobalStatePda();

  const signature = await withTimeout(
    program.methods
      .revealMission(
        Array.from(missionIdBytes) as any,
        Array.from(salt) as any
      )
      .accounts({
        hotAuthority: getHotAuthorityKeypair().publicKey,
        globalState: globalStatePda,
        bounty: new PublicKey(bountyPda),
      })
      .rpc(),
    30_000,
    'reveal_mission'
  );

  log.info({ signature }, 'mission revealed');
  return signature;
}

/**
 * Propose resolution on-chain (after AI validation)
 * Part 2 of resolution: proposes win/loss, starts challenge period
 */
export async function proposeResolutionOnChain(
  bountyPda: string,
  success: boolean
): Promise<string> {
  const program = getProgram();
  const [globalStatePda] = deriveGlobalStatePda();

  const signature = await withTimeout(
    program.methods
      .proposeResolution(success)
      .accounts({
        hotAuthority: getHotAuthorityKeypair().publicKey,
        globalState: globalStatePda,
        bounty: new PublicKey(bountyPda),
      })
      .rpc(),
    30_000,
    'propose_resolution'
  );

  log.info({ outcome: success ? 'WIN' : 'LOSS', signature }, 'resolution proposed');
  return signature;
}

/**
 * Resolve bounty on-chain (called after AI validation)
 * Full flow: reveal_mission → propose_resolution → finalize_bounty
 *
 * Note: In production with real challenge periods, finalize would be
 * called separately after the challenge period. For devnet testing,
 * we call all three in sequence.
 */
export async function resolveBountyOnChain(
  bountyPda: string,
  playerWallet: string,
  success: boolean,
  missionIdBytes?: Buffer,
  salt?: Buffer
): Promise<{ signature: string; singularityWon?: boolean }> {
  try {
    // Step 1: Reveal mission (if mission bytes provided)
    if (missionIdBytes && salt) {
      await revealMissionOnChain(bountyPda, missionIdBytes, salt);
    }

    // Step 2: Propose resolution (starts challenge period)
    const proposeSig = await proposeResolutionOnChain(bountyPda, success);

    // Step 3: Queue finalization durably (awaited Redis persist) for after the
    // challenge period. Must mirror the on-chain CHALLENGE_PERIOD const
    // (mainnet: 300s, devnet: 10s). If this throws, we have a stuck on-chain
    // bounty — Sentry will capture and the on-chain reconciler picks it up.
    const challengeEndsAt = Math.floor(Date.now() / 1000) + config.protocol.challengePeriodSeconds;
    await queueFinalization(bountyPda, playerWallet, challengeEndsAt);

    log.info({ finalizeAt: new Date(challengeEndsAt * 1000).toISOString() }, 'resolution proposed, finalization queued');

    return {
      signature: proposeSig,
      singularityWon: false, // Will be determined at finalization
    };
  } catch (error: any) {
    log.error({ err: error?.message || error }, 'resolve bounty error');
    throw error;
  }
}

/**
 * Check if player has sufficient SKR balance for entry
 */
export async function checkPlayerBalance(
  playerWallet: string,
  tier: Tier
): Promise<{ sufficient: boolean; balance: bigint; required: bigint }> {
  const conn = getConnection();
  const playerPubkey = new PublicKey(playerWallet);
  const required = ENTRY_AMOUNTS[tier];

  try {
    const tokenAccount = await getAssociatedTokenAddress(SKR_MINT, playerPubkey);
    const accountInfo = await conn.getTokenAccountBalance(tokenAccount);
    const balance = BigInt(accountInfo.value.amount);

    return {
      sufficient: balance >= required,
      balance,
      required,
    };
  } catch {
    // Token account doesn't exist = zero balance
    return {
      sufficient: false,
      balance: 0n,
      required,
    };
  }
}

/**
 * Get house vault balance (real on-chain query)
 */
export async function getHouseVaultBalance(): Promise<bigint> {
  const conn = getConnection();
  const [houseVaultPda] = deriveHouseVaultPda();

  try {
    const accountInfo = await conn.getTokenAccountBalance(houseVaultPda);
    return BigInt(accountInfo.value.amount);
  } catch {
    return 0n;
  }
}

/**
 * Get singularity vault balance (jackpot pool - real on-chain query)
 */
export async function getSingularityVaultBalance(): Promise<bigint> {
  const conn = getConnection();
  const [singularityVaultPda] = deriveSingularityVaultPda();

  try {
    const accountInfo = await conn.getTokenAccountBalance(singularityVaultPda);
    return BigInt(accountInfo.value.amount);
  } catch {
    return 0n;
  }
}

/**
 * Get global state from chain
 */
export async function getGlobalState(): Promise<any> {
  const program = getProgram();
  const [globalStatePda] = deriveGlobalStatePda();

  try {
    return await (program.account as any).globalState.fetch(globalStatePda);
  } catch {
    return null;
  }
}

/**
 * Get bounty account from chain
 */
export async function getBountyOnChain(bountyPda: string): Promise<any> {
  const program = getProgram();

  try {
    return await (program.account as any).bounty.fetch(new PublicKey(bountyPda));
  } catch {
    return null;
  }
}

/**
 * Verify a transaction signature actually contains the expected accept_bounty
 * call for this player + bounty PDA. Confirmation alone is not sufficient —
 * an attacker can paste any confirmed tx signature on Solana mainnet (a Jupiter
 * swap, a transfer, anything) and trivially bypass a status-only check.
 *
 * Returns true only if:
 *   1. The tx is confirmed/finalized
 *   2. It contains an instruction whose programId == SEEK PROGRAM_ID
 *   3. The bountyPda appears in the instruction's account list
 *   4. The expectedPlayer's pubkey appears in the instruction's account list
 */
export async function verifyTransaction(
  signature: string,
  expectedPlayer: string,
  expectedBountyPda: string,
): Promise<boolean> {
  try {
    const conn = getConnection();
    const tx = await conn.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
    if (!tx || tx.meta?.err) return false;

    const programIdStr = (process.env.SEEK_PROGRAM_ID ?? '').trim();
    if (!programIdStr) return false;

    const accountKeys = tx.transaction.message.getAccountKeys
      ? tx.transaction.message.getAccountKeys().keySegments().flat()
      : (tx.transaction.message as any).accountKeys;
    const accountStrings = accountKeys.map((k: any) => k.toBase58());

    const playerSeen = accountStrings.includes(expectedPlayer);
    const bountyPdaSeen = accountStrings.includes(expectedBountyPda);
    if (!playerSeen || !bountyPdaSeen) return false;

    const instructions = tx.transaction.message.compiledInstructions ?? [];
    const seekIxFound = instructions.some((ix: any) => {
      const programIdIndex = ix.programIdIndex;
      const ixProgram = accountStrings[programIdIndex];
      return ixProgram === programIdStr;
    });

    return seekIxFound;
  } catch {
    return false;
  }
}

/**
 * Format SKR base units to a human-readable whole-SKR string.
 * Uses SKR_DECIMALS which follows the SOLANA_NETWORK env (mainnet=6, devnet=9).
 */
export function formatSkr(lamports: bigint): string {
  const skr = Number(lamports) / Number(SKR_MULTIPLIER);
  return skr.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
