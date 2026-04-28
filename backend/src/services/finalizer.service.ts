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
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import {
  getProgram,
  getHotAuthorityKeypair,
  getConnection,
  deriveGlobalStatePda,
  deriveHouseVaultPda,
  deriveSingularityVaultPda,
  SKR_MINT,
} from './solana.service';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { config } from '../config';
import { getRedis, RK } from './redis.service';
import { childLogger } from './logger.service';
import { captureException } from './sentry.service';
import { withTimeout } from '../utils/timeout';

const RPC_TIMEOUT_MS = 30_000;
const HOT_WALLET_LOW_THRESHOLD_SOL = 0.1;
const HOT_WALLET_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const log = childLogger('finalizer');

// Track bounties pending finalization: bountyPda → { playerWallet, challengeEndsAt, attempts }
interface PendingFinalization {
  bountyPda: string;
  playerWallet: string;
  challengeEndsAt: number; // unix timestamp
  attempts: number;
  addedAt: number;
}

// In-memory mirror. On Redis-backed deploys this is a cache of the sorted set
// + hash in Redis; on plain dev it's the sole source of truth. Either way the
// public API (queueFinalization / processPendingFinalizations) is the same.
const pendingFinalizations = new Map<string, PendingFinalization>();

// Max retry attempts before giving up
const MAX_ATTEMPTS = 10;

// How often to poll (ms). ~1/5 of the challenge period keeps latency low without
// hammering the RPC (mainnet 300s → 60s poll; devnet 10s → 2s poll).
const POLL_INTERVAL = Math.max(2_000, Math.floor(config.protocol.challengePeriodSeconds * 1000 / 5));

let intervalHandle: NodeJS.Timeout | null = null;
let hotWalletCheckHandle: NodeJS.Timeout | null = null;

/**
 * Queue a bounty for finalization after its challenge period ends.
 * Awaits the Redis persist before returning — closes the crash window
 * between propose_resolution succeeding on-chain and the queue entry
 * being durable. Without this, a process crash here strands the bounty
 * in ChallengeWon/ChallengeLost state with no finalizer record.
 */
export async function queueFinalization(
  bountyPda: string,
  playerWallet: string,
  challengeEndsAt: number
): Promise<void> {
  if (pendingFinalizations.has(bountyPda)) {
    log.info({ bountyPda: bountyPda.slice(0, 8) }, 'bounty already queued');
    return;
  }

  const entry: PendingFinalization = {
    bountyPda,
    playerWallet,
    challengeEndsAt,
    attempts: 0,
    addedAt: Date.now(),
  };

  pendingFinalizations.set(bountyPda, entry);

  // Await Redis persist (closes the propose→persist race window).
  // If Redis is unavailable, persistQueueEntry early-returns; in-memory copy
  // is the only record until restart (dev fallback only — production must
  // have REDIS_URL set per config validation).
  try {
    await persistQueueEntry(entry);
  } catch (err) {
    log.error({ err, bountyPda: bountyPda.slice(0, 8) }, 'redis persist failed — bounty in queue is in-memory only');
  }

  log.info(
    {
      bountyPda: bountyPda.slice(0, 8),
      finalizeAt: new Date(challengeEndsAt * 1000).toISOString(),
    },
    'queued bounty for finalization'
  );
}

async function persistQueueEntry(entry: PendingFinalization): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  await r.zAdd(RK.finalizerQueue(), { score: entry.challengeEndsAt, value: entry.bountyPda });
  await r.set(
    RK.finalizerMeta(entry.bountyPda),
    JSON.stringify(entry),
    { EX: 24 * 60 * 60 } // 24h — plenty for any realistic dispute + retry cycle
  );
}

async function removeQueueEntry(bountyPda: string): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  await r.zRem(RK.finalizerQueue(), bountyPda);
  await r.del(RK.finalizerMeta(bountyPda));
}

/**
 * On startup, hydrate the in-memory queue from Redis. Ensures bounties queued
 * by a previous backend instance get finalized after a restart.
 */
async function hydrateFromRedis(): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  try {
    const bountyPdas = await r.zRange(RK.finalizerQueue(), 0, -1);
    if (bountyPdas.length === 0) return;

    let restored = 0;
    for (const bountyPda of bountyPdas) {
      if (pendingFinalizations.has(bountyPda)) continue;
      const raw = await r.get(RK.finalizerMeta(bountyPda));
      if (!raw) continue;
      try {
        const entry = JSON.parse(raw) as PendingFinalization;
        pendingFinalizations.set(bountyPda, entry);
        restored++;
      } catch {
        // Bad payload — drop the queue entry to avoid loop
        await r.zRem(RK.finalizerQueue(), bountyPda);
      }
    }
    if (restored > 0) {
      log.info({ restored }, 'restored pending finalizations from redis');
    }
  } catch (err) {
    log.error({ err }, 'redis hydration failed');
  }
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

  log.info({ count: ready.length }, 'processing ready bounties');

  for (const pending of ready) {
    try {
      await finalizeSingleBounty(pending);
      pendingFinalizations.delete(pending.bountyPda);
      await removeQueueEntry(pending.bountyPda);
      log.info({ bountyPda: pending.bountyPda.slice(0, 8) }, 'finalized bounty');
    } catch (error: any) {
      pending.attempts++;
      // Persist attempt count so retries survive restart
      void persistQueueEntry(pending).catch(() => { /* non-critical */ });

      log.warn(
        {
          bountyPda: pending.bountyPda.slice(0, 8),
          attempt: pending.attempts,
          max: MAX_ATTEMPTS,
          err: error.message,
        },
        'finalize failed'
      );

      if (pending.attempts >= MAX_ATTEMPTS) {
        pendingFinalizations.delete(pending.bountyPda);
        await removeQueueEntry(pending.bountyPda);
        log.error(
          { bountyPda: pending.bountyPda.slice(0, 8), max: MAX_ATTEMPTS },
          'giving up on bounty after max attempts'
        );
        // Page operator — bounty is permanently stuck on-chain. Manual
        // intervention required (call finalize_bounty via admin.ts or
        // investigate the on-chain state).
        captureException(error, {
          bountyPda: pending.bountyPda,
          playerWallet: pending.playerWallet,
          attempts: pending.attempts,
          severity: 'critical',
          context: 'finalizer-max-attempts',
        });
      }
    }
  }
}

/**
 * Finalize a single bounty on-chain
 */
async function finalizeSingleBounty(pending: PendingFinalization): Promise<string> {
  const program = getProgram();
  // finalize_bounty is permissionless — anyone can crank. We use the hot
  // authority because it's already the program's default signer.
  const caller = getHotAuthorityKeypair();
  const [globalStatePda] = deriveGlobalStatePda();
  const [houseVaultPda] = deriveHouseVaultPda();
  const [singularityVaultPda] = deriveSingularityVaultPda();
  const playerPubkey = new PublicKey(pending.playerWallet);

  const playerTokenAccount = await getAssociatedTokenAddress(SKR_MINT, playerPubkey);

  // Get protocol treasury from global state
  const globalState = await (program.account as any).globalState.fetch(globalStatePda);
  const protocolTreasury = globalState.protocolTreasury as PublicKey;

  const signature = await withTimeout(
    program.methods
      .finalizeBounty()
      .accounts({
        caller: caller.publicKey,
        globalState: globalStatePda,
        bounty: new PublicKey(pending.bountyPda),
        playerTokenAccount,
        houseVault: houseVaultPda,
        singularityVault: singularityVaultPda,
        protocolTreasury,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc(),
    RPC_TIMEOUT_MS,
    'finalize_bounty',
  );

  return signature;
}

/**
 * Periodic hot-wallet SOL balance check. Hot key burns ~5000 lamports per
 * finalize call; depletion stalls the entire finalizer pipeline. Page the
 * operator (via Sentry) before that happens. Top up via:
 *   solana transfer <HOT_PUBKEY> 1 --keypair usb://ledger --url mainnet-beta
 */
async function checkHotWalletBalance(): Promise<void> {
  try {
    const conn = getConnection();
    const hot = getHotAuthorityKeypair();
    const lamports = await withTimeout(
      conn.getBalance(hot.publicKey, 'confirmed'),
      RPC_TIMEOUT_MS,
      'getBalance(hot)',
    );
    const sol = lamports / LAMPORTS_PER_SOL;
    if (sol < HOT_WALLET_LOW_THRESHOLD_SOL) {
      const msg = `Hot wallet SOL balance LOW: ${sol.toFixed(4)} SOL (< ${HOT_WALLET_LOW_THRESHOLD_SOL}). Finalizer will stall.`;
      log.warn({ pubkey: hot.publicKey.toBase58(), sol }, msg);
      captureException(new Error(msg));
    } else {
      log.debug({ sol }, 'hot wallet balance ok');
    }
  } catch (err) {
    log.error({ err }, 'hot wallet balance check failed');
  }
}

/**
 * Start the finalization worker
 */
export function startFinalizationWorker(): void {
  if (intervalHandle) {
    log.info('worker already running');
    return;
  }

  log.info({ pollIntervalMs: POLL_INTERVAL }, 'starting worker');

  // Restore queue from Redis first (no-op if Redis disabled)
  void hydrateFromRedis().catch((err) => log.error({ err }, 'hydrate error'));

  intervalHandle = setInterval(() => {
    processPendingFinalizations().catch((err) => {
      log.error({ err: err.message }, 'worker error');
    });
  }, POLL_INTERVAL);

  // Periodic hot-wallet balance check + immediate first run.
  void checkHotWalletBalance();
  hotWalletCheckHandle = setInterval(() => {
    void checkHotWalletBalance();
  }, HOT_WALLET_CHECK_INTERVAL_MS);
}

/**
 * Stop the finalization worker
 */
export function stopFinalizationWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  if (hotWalletCheckHandle) {
    clearInterval(hotWalletCheckHandle);
    hotWalletCheckHandle = null;
  }
  log.info('worker stopped');
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
