import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { config } from '../config';
import { Tier, ENTRY_AMOUNTS } from '../types';
import bs58 from 'bs58';
import { createHash } from 'crypto';

// Load IDL
import idl from '../idl/seek_protocol.json';

// Initialize connection (singleton)
let connection: Connection;

// Cache authority keypair (decode once, not on every call)
let cachedAuthority: Keypair | null = null;

// Cache Anchor program instance
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
 * Get Anchor program instance (cached)
 */
export function getProgram(): Program {
  if (!cachedProgram) {
    const conn = getConnection();
    const authority = getAuthorityKeypair();
    const wallet = new Wallet(authority);
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
  require('crypto').randomFillSync(salt);

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

  const signature = await program.methods
    .revealMission(
      Array.from(missionIdBytes) as any,
      Array.from(salt) as any
    )
    .accounts({
      authority: getAuthorityKeypair().publicKey,
      globalState: globalStatePda,
      bounty: new PublicKey(bountyPda),
    })
    .rpc();

  console.log(`[Solana] Mission revealed: ${signature}`);
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

  const signature = await program.methods
    .proposeResolution(success)
    .accounts({
      authority: getAuthorityKeypair().publicKey,
      globalState: globalStatePda,
      bounty: new PublicKey(bountyPda),
    })
    .rpc();

  console.log(`[Solana] Resolution proposed (${success ? 'WIN' : 'LOSS'}): ${signature}`);
  return signature;
}

/**
 * Finalize bounty on-chain (after challenge period ends)
 * Part 3 of resolution: actually executes payout or distribution
 */
export async function finalizeBountyOnChain(
  bountyPda: string,
  playerWallet: string
): Promise<{ signature: string; singularityWon?: boolean }> {
  const program = getProgram();
  const authority = getAuthorityKeypair();
  const [globalStatePda] = deriveGlobalStatePda();
  const [houseVaultPda] = deriveHouseVaultPda();
  const [singularityVaultPda] = deriveSingularityVaultPda();
  const playerPubkey = new PublicKey(playerWallet);

  // Get player's associated token account for SKR
  const playerTokenAccount = await getAssociatedTokenAddress(
    SKR_MINT,
    playerPubkey
  );

  // Get global state to find protocol treasury
  const globalState = await (program.account as any).globalState.fetch(globalStatePda);
  const protocolTreasury = (globalState as any).protocolTreasury as PublicKey;

  const signature = await program.methods
    .finalizeBounty()
    .accounts({
      caller: authority.publicKey,
      globalState: globalStatePda,
      bounty: new PublicKey(bountyPda),
      playerTokenAccount,
      houseVault: houseVaultPda,
      singularityVault: singularityVaultPda,
      protocolTreasury,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  // Check if singularity was won by reading the bounty account
  const bountyAccount = await (program.account as any).bounty.fetch(new PublicKey(bountyPda));
  const singularityWon = (bountyAccount as any).singularityWon as boolean;

  console.log(`[Solana] Bounty finalized: ${signature} | Singularity: ${singularityWon}`);
  return { signature, singularityWon };
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

    // Step 2: Propose resolution
    await proposeResolutionOnChain(bountyPda, success);

    // Step 3: Finalize bounty
    // In production, this would wait for the challenge period to end.
    // For devnet, we finalize immediately since challenge period is short.
    // The on-chain check will enforce the challenge period timing.
    const result = await finalizeBountyOnChain(bountyPda, playerWallet);

    return result;
  } catch (error: any) {
    console.error(`[Solana] Resolve bounty error:`, error?.message || error);

    // If finalization fails due to challenge period, return the propose signature
    // The frontend/cron can retry finalization later
    if (error?.message?.includes('ChallengePeriodActive')) {
      console.log('[Solana] Challenge period still active, finalization deferred');
      return {
        signature: `pending_finalize_${bountyPda.slice(0, 16)}`,
        singularityWon: false,
      };
    }

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
