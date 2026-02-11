import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const SIGNATURE_MAX_AGE_MS = 30_000; // 30 seconds

/**
 * Wallet signature verification middleware.
 * Always enforced — demo routes skip this middleware entirely.
 *
 * Expects headers:
 *   x-wallet-address: base58 public key
 *   x-wallet-signature: base58-encoded signature
 *   x-signature-timestamp: unix ms timestamp that was signed
 *
 * The client signs the message: `seek:{walletAddress}:{timestamp}`
 */
export function requireWalletAuth(req: Request, res: Response, next: NextFunction) {
  const walletAddress = req.headers['x-wallet-address'] as string | undefined;
  const signature = req.headers['x-wallet-signature'] as string | undefined;
  const timestamp = req.headers['x-signature-timestamp'] as string | undefined;

  if (!walletAddress || !signature || !timestamp) {
    return res.status(401).json({
      success: false,
      error: 'Missing authentication headers (x-wallet-address, x-wallet-signature, x-signature-timestamp)',
    });
  }

  // Validate timestamp is a number and not expired
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid timestamp',
    });
  }

  const age = Date.now() - ts;
  if (age > SIGNATURE_MAX_AGE_MS || age < -5000) {
    return res.status(401).json({
      success: false,
      error: 'Signature expired or timestamp in the future',
    });
  }

  // Validate wallet address is a valid public key
  let publicKey: PublicKey;
  try {
    publicKey = new PublicKey(walletAddress);
    if (!PublicKey.isOnCurve(publicKey.toBytes())) {
      throw new Error('Not on curve');
    }
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Invalid wallet address',
    });
  }

  // Verify signature
  const message = `seek:${walletAddress}:${timestamp}`;
  const messageBytes = new TextEncoder().encode(message);

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = bs58.decode(signature);
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Invalid signature encoding',
    });
  }

  const isValid = nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    publicKey.toBytes()
  );

  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid signature',
    });
  }

  // Ensure the wallet in the body matches the authenticated wallet
  if (req.body?.playerWallet && req.body.playerWallet !== walletAddress) {
    return res.status(403).json({
      success: false,
      error: 'Wallet address mismatch between auth header and request body',
    });
  }

  // Store verified wallet on request for downstream use (rate limiters, handlers)
  (req as any).verifiedWallet = walletAddress;

  next();
}
