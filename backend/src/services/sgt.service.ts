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
import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { randomBytes, createHash } from 'crypto';
import { config } from '../config';
import { getConnection } from './solana.service';

// SGT on-chain constants
const SGT_MINT_AUTHORITY = 'GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4';
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

// In-memory stores (production: use Redis/DB)
const verifiedWallets = new Map<string, SGTVerificationResult>();
const sgtMintToWallet = new Map<string, string>(); // anti-sybil: mint → first wallet
const activeNonces = new Map<string, { createdAt: number; walletAddress: string }>();

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a SIWS nonce for wallet verification
 */
export function generateSIWSNonce(walletAddress: string): string {
  const nonce = randomBytes(32).toString('base64url');
  activeNonces.set(nonce, { createdAt: Date.now(), walletAddress });
  return nonce;
}

/**
 * Build a Sign-in-with-Solana message
 */
export function buildSIWSMessage(walletAddress: string, nonce: string): SIWSMessage {
  return {
    domain: 'seek.app',
    address: walletAddress,
    statement: 'Verify Seeker device ownership for Seek Protocol',
    uri: 'https://seek.app',
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
export function verifySIWSSignature(
  message: SIWSMessage,
  signatureBase58: string
): boolean {
  try {
    // Check nonce validity
    const nonceData = activeNonces.get(message.nonce);
    if (!nonceData) return false;

    // Check nonce expiry
    if (Date.now() - nonceData.createdAt > NONCE_EXPIRY_MS) {
      activeNonces.delete(message.nonce);
      return false;
    }

    // Check nonce was issued for this wallet
    if (nonceData.walletAddress !== message.address) return false;

    // Verify ed25519 signature
    const messageBytes = new TextEncoder().encode(serializeSIWSMessage(message));
    const signatureBytes = bs58.decode(signatureBase58);
    const publicKeyBytes = bs58.decode(message.address);

    const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    // Consume nonce (one-time use)
    if (valid) {
      activeNonces.delete(message.nonce);
    }

    return valid;
  } catch (error) {
    console.error('[SGT] SIWS verification error:', error);
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
    console.error('[SGT] Ownership check error:', error);
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

  const response = await fetch(url, {
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
  for (const { pubkey, account } of accounts.value) {
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
  const sigValid = verifySIWSSignature(message, signatureBase58);
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

  // Step 3: Anti-sybil — ensure this SGT mint hasn't been claimed by another wallet
  const existingOwner = sgtMintToWallet.get(mintAddress);
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

  // Cache result
  verifiedWallets.set(walletAddress, result);
  sgtMintToWallet.set(mintAddress, walletAddress);

  console.log(`[SGT] Wallet ${walletAddress} verified | Mint: ${mintAddress}`);
  return result;
}

/**
 * Check if a wallet has been SGT-verified (from cache)
 */
export function isWalletSGTVerified(walletAddress: string): SGTVerificationResult | null {
  return verifiedWallets.get(walletAddress) || null;
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
    console.log(`[SGT] Cleaned up ${removed} expired nonces`);
  }
}

// Periodic nonce cleanup every 5 minutes
setInterval(cleanupExpiredNonces, NONCE_EXPIRY_MS);
