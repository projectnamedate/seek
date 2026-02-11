/**
 * Finalization Worker
 *
 * Polls for bounties stuck in challenge period (ChallengeWon/ChallengeLost)
 * and finalizes them once the challenge period has expired.
 *
 * This is necessary because the on-chain flow is:
 *   1. reveal_mission   (immediate after photo submit)
 *   2. propose_resolution (immediate after AI validation)
 *   3. finalize_bounty  (DELAYED - must wait for challenge period to end)
 *
 * The challenge period is 5 minutes (300 seconds on-chain).
 */
import { PublicKey } from '@solana/web3.js';
import {
  getProgram,
  getAuthorityKeypair,
  deriveGlobalStatePda,
  deriveHouseVaultPda,
  deriveSingularityVaultPda,
  SKR_MINT,
  getConnection,
} from './solana.service';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Track bounties pending finalization: bountyPda → { playerWallet, challengeEndsAt, attempts }
interface PendingFinalization {
  bountyPda: string;
  playerWallet: string;
  challengeEndsAt: number; // unix timestamp
  attempts: number;
  addedAt: number;
}

const pendingFinalizations = new Map<string, PendingFinalization>();

// Max retry attempts before giving up
const MAX_ATTEMPTS = 10;

// How often to poll (ms)
const POLL_INTERVAL = 30_000; // 30 seconds

let intervalHandle: NodeJS.Timeout | null = null;

/**
 * Queue a bounty for finalization after its challenge period ends
 */
export function queueFinalization(
  bountyPda: string,
  playerWallet: string,
  challengeEndsAt: number
): void {
  if (pendingFinalizations.has(bountyPda)) {
    console.log(`[Finalizer] Bounty ${bountyPda.slice(0, 8)}... already queued`);
    return;
  }

  pendingFinalizations.set(bountyPda, {
    bountyPda,
    playerWallet,
    challengeEndsAt,
    attempts: 0,
    addedAt: Date.now(),
  });

  console.log(
    `[Finalizer] Queued bounty ${bountyPda.slice(0, 8)}... ` +
    `(finalizes after ${new Date(challengeEndsAt * 1000).toISOString()})`
  );
}

/**
 * Process all pending finalizations
 */
async function processPendingFinalizations(): Promise<void> {
  if (pendingFinalizations.size === 0) return;

  const now = Math.floor(Date.now() / 1000);
  const ready: PendingFinalization[] = [];

  for (const pending of pendingFinalizations.values()) {
    if (now >= pending.challengeEndsAt) {
      ready.push(pending);
    }
  }

  if (ready.length === 0) return;

  console.log(`[Finalizer] Processing ${ready.length} ready bounties...`);

  for (const pending of ready) {
    try {
      await finalizeSingleBounty(pending);
      pendingFinalizations.delete(pending.bountyPda);
      console.log(`[Finalizer] Finalized bounty ${pending.bountyPda.slice(0, 8)}...`);
    } catch (error: any) {
      pending.attempts++;
      console.error(
        `[Finalizer] Failed to finalize ${pending.bountyPda.slice(0, 8)}... ` +
        `(attempt ${pending.attempts}/${MAX_ATTEMPTS}): ${error.message}`
      );

      if (pending.attempts >= MAX_ATTEMPTS) {
        pendingFinalizations.delete(pending.bountyPda);
        console.error(
          `[Finalizer] Giving up on ${pending.bountyPda.slice(0, 8)}... after ${MAX_ATTEMPTS} attempts`
        );
      }
    }
  }
}

/**
 * Finalize a single bounty on-chain
 */
async function finalizeSingleBounty(pending: PendingFinalization): Promise<string> {
  const program = getProgram();
  const authority = getAuthorityKeypair();
  const [globalStatePda] = deriveGlobalStatePda();
  const [houseVaultPda] = deriveHouseVaultPda();
  const [singularityVaultPda] = deriveSingularityVaultPda();
  const playerPubkey = new PublicKey(pending.playerWallet);

  const playerTokenAccount = await getAssociatedTokenAddress(SKR_MINT, playerPubkey);

  // Get protocol treasury from global state
  const globalState = await (program.account as any).globalState.fetch(globalStatePda);
  const protocolTreasury = globalState.protocolTreasury as PublicKey;

  const signature = await program.methods
    .finalizeBounty()
    .accounts({
      caller: authority.publicKey,
      globalState: globalStatePda,
      bounty: new PublicKey(pending.bountyPda),
      playerTokenAccount,
      houseVault: houseVaultPda,
      singularityVault: singularityVaultPda,
      protocolTreasury,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  return signature;
}

/**
 * Start the finalization worker
 */
export function startFinalizationWorker(): void {
  if (intervalHandle) {
    console.log('[Finalizer] Worker already running');
    return;
  }

  console.log(`[Finalizer] Starting worker (polling every ${POLL_INTERVAL / 1000}s)`);

  intervalHandle = setInterval(() => {
    processPendingFinalizations().catch((err) => {
      console.error('[Finalizer] Worker error:', err.message);
    });
  }, POLL_INTERVAL);
}

/**
 * Stop the finalization worker
 */
export function stopFinalizationWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[Finalizer] Worker stopped');
  }
}

/**
 * Get current queue status
 */
export function getFinalizerStatus(): {
  queueSize: number;
  pending: Array<{ bountyPda: string; challengeEndsAt: number; attempts: number }>;
} {
  const pending = Array.from(pendingFinalizations.values()).map((p) => ({
    bountyPda: p.bountyPda,
    challengeEndsAt: p.challengeEndsAt,
    attempts: p.attempts,
  }));

  return { queueSize: pending.length, pending };
}
