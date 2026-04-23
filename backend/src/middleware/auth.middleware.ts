import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { redisConsumeNonce, RK } from '../services/redis.service';

const SIGNATURE_MAX_AGE_MS = 120_000; // 120s — covers MWA UI delay + network jitter
const SIGNATURE_FUTURE_TOLERANCE_MS = 5_000; // 5s clock skew tolerance

export type AuthOperation = 'prepare' | 'start' | 'submit';

/**
 * Wallet signature verification middleware factory.
 *
 * Signed message format:
 *   `seek:{operation}:{walletAddress}:{timestamp}`
 *
 * Operation binding prevents signature replay across endpoints (a /prepare
 * auth header can't be reused on /submit). Redis-backed nonce store with 120s
 * TTL prevents replay within the validity window.
 *
 * Headers required:
 *   x-wallet-address       base58 public key
 *   x-wallet-signature     base58-encoded signature
 *   x-signature-timestamp  unix ms timestamp that was signed
 */
export function requireWalletAuth(operation: AuthOperation) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const walletAddress = req.headers['x-wallet-address'] as string | undefined;
    const signature = req.headers['x-wallet-signature'] as string | undefined;
    const timestamp = req.headers['x-signature-timestamp'] as string | undefined;

    if (!walletAddress || !signature || !timestamp) {
      return res.status(401).json({
        success: false,
        error: 'Missing authentication headers (x-wallet-address, x-wallet-signature, x-signature-timestamp)',
      });
    }

    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) {
      return res.status(401).json({ success: false, error: 'Invalid timestamp' });
    }

    const age = Date.now() - ts;
    if (age > SIGNATURE_MAX_AGE_MS || age < -SIGNATURE_FUTURE_TOLERANCE_MS) {
      return res.status(401).json({
        success: false,
        error: 'Signature expired or timestamp in the future',
      });
    }

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(walletAddress);
      if (!PublicKey.isOnCurve(publicKey.toBytes())) {
        throw new Error('Not on curve');
      }
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid wallet address' });
    }

    const message = `seek:${operation}:${walletAddress}:${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);

    let signatureBytes: Uint8Array;
    try {
      signatureBytes = bs58.decode(signature);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid signature encoding' });
    }

    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    if (req.body?.playerWallet && req.body.playerWallet !== walletAddress) {
      return res.status(403).json({
        success: false,
        error: 'Wallet address mismatch between auth header and request body',
      });
    }

    // Atomic one-time-use nonce check via Redis SETNX. TTL must outlive the
    // signature window so a replay attempt from t+119s still hits the nonce.
    const nonceKey = RK.authNonce(walletAddress, timestamp, operation);
    const nonceFresh = await redisConsumeNonce(nonceKey, Math.ceil(SIGNATURE_MAX_AGE_MS / 1000) + 5);
    if (!nonceFresh) {
      return res.status(401).json({
        success: false,
        error: 'Signature already used (replay rejected)',
      });
    }

    (req as any).verifiedWallet = walletAddress;
    next();
  };
}
