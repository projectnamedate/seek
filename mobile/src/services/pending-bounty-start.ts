import type { TierNumber } from '../types';

/**
 * Durable receipt written before opening the wallet for accept_bounty, then
 * updated if MWA returns a signature. While this exists the app must only
 * retry /start; it must never prepare or sign another entry transaction until
 * the backend proves the original blockhash expired without landing.
 */
export interface PendingBountyStart {
  playerWallet: string;
  tier: TierNumber;
  bountyPda: string;
  transactionSignature?: string;
  recentBlockhash: string;
  lastValidBlockHeight: number;
  prepareId: string;
  sessionToken: string;
  entryAmountSkr: number;
  returnAmountSkr: number;
  createdAt: number;
}

export function pendingStartForWallet(
  receipt: PendingBountyStart | null,
  playerWallet: string,
): PendingBountyStart | null {
  return receipt?.playerWallet === playerWallet ? receipt : null;
}

export function toStartBountyOptions(receipt: PendingBountyStart) {
  return {
    bountyPda: receipt.bountyPda,
    transactionSignature: receipt.transactionSignature,
    recentBlockhash: receipt.recentBlockhash,
    lastValidBlockHeight: receipt.lastValidBlockHeight,
    prepareId: receipt.prepareId,
    sessionToken: receipt.sessionToken,
  };
}
