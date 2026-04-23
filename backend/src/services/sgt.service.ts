/**
 * Seeker Genesis Token (SGT) Verification Service
 *
 * Verifies Seeker device ownership via:
 * 1. Sign-in-with-Solana (SIWS) — proves wallet ownership
 * 2. SGT NFT ownership check — proves Seeker device
 * 3. Anti-sybil tracking — prevents mint reuse across wallets
 *
 * Docs: https://docs.solanamobile.com/marketing/engaging-seeker-users
 */
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { randomBytes } from 'crypto';
import { config } from '../config';
import { getConnection } from './solana.service';
import { getRedis, RK, redisConsumeNonce } from './redis.service';
import { withTimeout } from '../utils/timeout';
import { childLogger } from './logger.service';

const log = childLogger('sgt');

const HELIUS_TIMEOUT_MS = 15_000;
const SGT_VERIFICATION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30d — re-prove monthly

// SGT on-chain constants
const SGT_GROUP_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

// Types
export interface SGTVerificationResult {
  verified: boolean;
  sgtMintAddress: string | null;
  walletAddress: string;
  verifiedAt: Date | null;
  error?: string;
}

export interface SIWSMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
}

// In-memory caches in front of Redis. Both wipe on restart and rebuild from
// Redis on the next read; Redis is the source of truth.
const verifiedWallets = new Map<string, SGTVerificationResult>();
const sgtMintToWallet = new Map<string, string>(); // anti-sybil: mint → first wallet
const activeNonces = new Map<string, { createdAt: number; walletAddress: string }>();

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const NONCE_EXPIRY_SECONDS = Math.floor(NONCE_EXPIRY_MS / 1000);

/**
 * Generate a SIWS nonce for wallet verification.
 * Persisted to Redis (with TTL) so multi-instance backends share state and
 * a restart between nonce-issue and nonce-consume doesn't break verification.
 */
export async function generateSIWSNonce(walletAddress: string): Promise<string> {
  const nonce = randomBytes(32).toString('base64url');
  activeNonces.set(nonce, { createdAt: Date.now(), walletAddress });

  const r = await getRedis();
  if (r) {
    await r.set(
      RK.sgtNonce(nonce),
      JSON.stringify({ walletAddress, createdAt: Date.now() }),
      { EX: NONCE_EXPIRY_SECONDS },
    );
  }
  return nonce;
}

/**
 * Build a Sign-in-with-Solana message
 */
export function buildSIWSMessage(walletAddress: string, nonce: string): SIWSMessage {
  return {
    domain: 'seek.mythx.art',
    address: walletAddress,
    statement: 'Verify Seeker device ownership for Seek Protocol',
    uri: 'https://seek.mythx.art',
    version: '1',
    chainId: config.solana.network === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet',
    nonce,
    issuedAt: new Date().toISOString(),
  };
}

/**
 * Serialize a SIWS message to the standard string format for signing
 */
function serializeSIWSMessage(message: SIWSMessage): string {
  return [
    `${message.domain} wants you to sign in with your Solana account:`,
    message.address,
    '',
    message.statement,
    '',
    `URI: ${message.uri}`,
    `Version: ${message.version}`,
    `Chain ID: ${message.chainId}`,
    `Nonce: ${message.nonce}`,
    `Issued At: ${message.issuedAt}`,
  ].join('\n');
}

/**
 * Verify a SIWS signature
 */
export async function verifySIWSSignature(
  message: SIWSMessage,
  signatureBase58: string
): Promise<boolean> {
  try {
    // Domain / URI / chainId binding — prevents cross-domain phishing replay.
    const expectedDomain = 'seek.mythx.art';
    const expectedUri = 'https://seek.mythx.art';
    const expectedChainId = config.solana.network === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet';
    if (message.domain !== expectedDomain) return false;
    if (message.uri !== expectedUri) return false;
    if (message.chainId !== expectedChainId) return false;

    // Nonce check via Redis (multi-instance + restart safe), with in-memory
    // cache for warm-path latency.
    let nonceData = activeNonces.get(message.nonce);
    if (!nonceData) {
      const r = await getRedis();
      if (r) {
        const raw = await r.get(RK.sgtNonce(message.nonce));
        if (raw) {
          try {
            nonceData = JSON.parse(raw);
            if (nonceData) activeNonces.set(message.nonce, nonceData);
          } catch { /* corrupt nonce entry */ }
        }
      }
    }
    if (!nonceData) return false;

    if (Date.now() - nonceData.createdAt > NONCE_EXPIRY_MS) {
      activeNonces.delete(message.nonce);
      const r = await getRedis();
      if (r) await r.del(RK.sgtNonce(message.nonce));
      return false;
    }

    if (nonceData.walletAddress !== message.address) return false;

    const messageBytes = new TextEncoder().encode(serializeSIWSMessage(message));
    const signatureBytes = bs58.decode(signatureBase58);
    const publicKeyBytes = bs58.decode(message.address);

    const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    // Consume nonce atomically. If the SETNX-equivalent fails the same nonce
    // was concurrently used by another instance — reject this verification.
    if (valid) {
      const r = await getRedis();
      if (r) {
        const reservedKey = `${RK.sgtNonce(message.nonce)}:consumed`;
        const consumeOk = await redisConsumeNonce(reservedKey, NONCE_EXPIRY_SECONDS);
        if (!consumeOk) return false;
        await r.del(RK.sgtNonce(message.nonce));
      }
      activeNonces.delete(message.nonce);
    }

    return valid;
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'SIWS verification error');
    return false;
  }
}

/**
 * Check if a wallet holds an SGT via Token-2022 account query
 *
 * Uses direct RPC getTokenAccountsByOwner with Token-2022 program filter.
 * For production with high volume, use Helius DAS API instead.
 */
export async function checkSGTOwnership(
  walletAddress: string
): Promise<{ hasSGT: boolean; mintAddress: string | null }> {
  try {
    // Try Helius DAS API first (if key configured)
    if (config.sgt.heliusApiKey) {
      return await checkSGTViaHelius(walletAddress);
    }

    // Fallback: direct RPC query for Token-2022 accounts
    return await checkSGTViaRPC(walletAddress);
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'ownership check error');
    return { hasSGT: false, mintAddress: null };
  }
}

/**
 * Check SGT via Helius DAS API (recommended for production)
 */
async function checkSGTViaHelius(
  walletAddress: string
): Promise<{ hasSGT: boolean; mintAddress: string | null }> {
  const url = `https://mainnet.helius-rpc.com/?api-key=${config.sgt.heliusApiKey}`;

  const controller = new AbortController();
  const response = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'sgt-check',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          displayOptions: { showFungible: false, showNativeBalance: false },
        },
      }),
      signal: controller.signal,
    }),
    HELIUS_TIMEOUT_MS,
    'helius-getAssetsByOwner',
  ).catch((err) => {
    controller.abort();
    throw err;
  });

  const data: any = await response.json();
  const items = data?.result?.items || [];

  // Look for an asset in the SGT group
  for (const asset of items) {
    const grouping = asset.grouping || [];
    for (const group of grouping) {
      if (group.group_key === 'collection' && group.group_value === SGT_GROUP_ADDRESS) {
        return { hasSGT: true, mintAddress: asset.id };
      }
    }
  }

  return { hasSGT: false, mintAddress: null };
}

/**
 * Check SGT via direct RPC (Token-2022 program accounts)
 */
async function checkSGTViaRPC(
  walletAddress: string
): Promise<{ hasSGT: boolean; mintAddress: string | null }> {
  const conn = getConnection();
  const ownerPubkey = new PublicKey(walletAddress);

  // Get all Token-2022 token accounts owned by this wallet
  const accounts = await conn.getTokenAccountsByOwner(ownerPubkey, {
    programId: TOKEN_2022_PROGRAM_ID,
  });

  // Check each account for SGT characteristics
  // In a full implementation, we'd decode the Token-2022 extensions
  // to verify the group membership. For now, check if any Token-2022
  // token account has a balance of 1 (SGT is a unique NFT).
  for (const { account } of accounts.value) {
    // Token accounts have a standard layout; amount is at offset 64 (8 bytes LE)
    const data = account.data;
    if (data.length >= 72) {
      const amount = data.readBigUInt64LE(64);
      if (amount === 1n) {
        // Extract mint address (first 32 bytes of token account data)
        const mintBytes = data.subarray(0, 32);
        const mintAddress = new PublicKey(mintBytes).toBase58();
        return { hasSGT: true, mintAddress };
      }
    }
  }

  return { hasSGT: false, mintAddress: null };
}

/**
 * Full SGT verification: SIWS + ownership + anti-sybil
 */
export async function verifySGTForWallet(
  walletAddress: string,
  signatureBase58: string,
  message: SIWSMessage
): Promise<SGTVerificationResult> {
  // Step 1: Verify SIWS signature
  const sigValid = await verifySIWSSignature(message, signatureBase58);
  if (!sigValid) {
    return {
      verified: false,
      sgtMintAddress: null,
      walletAddress,
      verifiedAt: null,
      error: 'Invalid signature',
    };
  }

  // Step 2: Check SGT ownership
  const { hasSGT, mintAddress } = await checkSGTOwnership(walletAddress);
  if (!hasSGT || !mintAddress) {
    return {
      verified: false,
      sgtMintAddress: null,
      walletAddress,
      verifiedAt: null,
      error: 'No Seeker Genesis Token found',
    };
  }

  // Step 3: Anti-sybil — Redis-backed mint→wallet mapping. Check Redis first
  // (source of truth across instances + restarts), fall back to in-memory.
  const r = await getRedis();
  let existingOwner: string | null = sgtMintToWallet.get(mintAddress) ?? null;
  if (!existingOwner && r) {
    existingOwner = await r.get(RK.sgtMintOwner(mintAddress));
    if (existingOwner) sgtMintToWallet.set(mintAddress, existingOwner);
  }
  if (existingOwner && existingOwner !== walletAddress) {
    return {
      verified: false,
      sgtMintAddress: mintAddress,
      walletAddress,
      verifiedAt: null,
      error: 'This SGT is already registered to another wallet',
    };
  }

  // All checks passed
  const result: SGTVerificationResult = {
    verified: true,
    sgtMintAddress: mintAddress,
    walletAddress,
    verifiedAt: new Date(),
  };

  // Persist to Redis (no TTL on anti-sybil mapping; TTL on the verification
  // itself so users re-prove ownership periodically).
  verifiedWallets.set(walletAddress, result);
  sgtMintToWallet.set(mintAddress, walletAddress);
  if (r) {
    await r.set(
      RK.sgtVerified(walletAddress),
      JSON.stringify({ ...result, verifiedAt: result.verifiedAt?.toISOString() }),
      { EX: SGT_VERIFICATION_TTL_SECONDS },
    );
    // Anti-sybil mapping must NEVER expire — once an SGT is bound to a
    // wallet, no other wallet can claim it (until the user explicitly
    // releases it via a future endpoint).
    await r.set(RK.sgtMintOwner(mintAddress), walletAddress);
  }

  log.info({ walletAddress, mintAddress }, 'wallet verified');
  return result;
}

/**
 * Check if a wallet has been SGT-verified.
 * Reads from in-memory cache first, falls back to Redis (rebuilds the cache).
 */
export async function isWalletSGTVerified(walletAddress: string): Promise<SGTVerificationResult | null> {
  const cached = verifiedWallets.get(walletAddress);
  if (cached) return cached;

  const r = await getRedis();
  if (!r) return null;
  const raw = await r.get(RK.sgtVerified(walletAddress));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result: SGTVerificationResult = {
      ...parsed,
      verifiedAt: parsed.verifiedAt ? new Date(parsed.verifiedAt) : null,
    };
    verifiedWallets.set(walletAddress, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Get verification stats for monitoring
 */
export function getSGTStats() {
  return {
    verifiedWallets: verifiedWallets.size,
    registeredMints: sgtMintToWallet.size,
    activeNonces: activeNonces.size,
  };
}

/**
 * Cleanup expired nonces (called periodically)
 */
export function cleanupExpiredNonces(): void {
  const now = Date.now();
  let removed = 0;
  for (const [nonce, data] of activeNonces) {
    if (now - data.createdAt > NONCE_EXPIRY_MS) {
      activeNonces.delete(nonce);
      removed++;
    }
  }
  if (removed > 0) {
    log.info({ removed }, 'cleaned up expired nonces');
  }
}

// Periodic nonce cleanup every 5 minutes
setInterval(cleanupExpiredNonces, NONCE_EXPIRY_MS);
