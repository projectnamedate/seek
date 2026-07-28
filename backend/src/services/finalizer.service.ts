/**
 * Finalization Worker
 *
 * Polls for bounties in pending-finalization states (ChallengeWon/ChallengeLost)
 * and finalizes them once their configured delay has elapsed.
 *
 * This is necessary because the on-chain flow is:
 *   1. reveal_mission   (immediate after photo submit)
 *   2. propose_resolution (immediate after AI validation)
 *   3. finalize_bounty  (immediate while public disputes are disabled)
 *
 * Keep this delay aligned with the currently deployed program.
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
  getBountyOnChain,
  isTerminalBountyStatus,
} from './solana.service';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { config } from '../config';
import { getRedis, RK, redisAcquireLock, redisReleaseLock } from './redis.service';
import { childLogger } from './logger.service';
import { captureException } from './sentry.service';
import { withTimeout } from '../utils/timeout';

const RPC_TIMEOUT_MS = 30_000;
const HOT_WALLET_LOW_THRESHOLD_SOL = 0.1;
const HOT_WALLET_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const FINALIZER_POLL_INTERVAL_MS = config.solana.network === 'mainnet-beta' ? 10_000 : 2_000;
const FINALIZER_CONCURRENCY = 3;
const FINALIZER_LOCK_TTL_SECONDS = 120;
const FINALIZER_QUEUE_WARN_DEPTH = 50;
const FINALIZER_LAG_WARN_SECONDS = 120;
const FINALIZER_LAG_PAUSE_SECONDS = 300;
const FINALIZER_SAFETY_PAUSE_SECONDS = 10 * 60;
const FINALIZER_ALERT_COOLDOWN_MS = 5 * 60 * 1000;
const CHALLENGE_PERIOD_RETRY_SECONDS = 30;

const log = childLogger('finalizer');

// Temporary production containment for a 2026-05-17 timestamp-precheck false
// win. This prevents the queued optimistic WIN from auto-finalizing while the
// bounty is handled manually. Remove after the on-chain position is remediated.
const FINALIZER_BLOCKLIST = new Set([
  '4M7vPT92eJ968Tij59i7f5VKiTaE1uwqm8wV9QRihWHR',
  // 2026-05-17 hardware smoke false loss caused by retired Anthropic model id.
  'CqmxbMsLYbW7eUoxzNTqskeEUv41GNM6qKu9WyoF8dwk',
]);

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

let intervalHandle: NodeJS.Timeout | null = null;
let hotWalletCheckHandle: NodeJS.Timeout | null = null;
let processing = false;
let lastBacklogAlertAt = 0;
let safetyPauseUntil = 0;

/**
 * Queue a bounty for finalization after its configured finalization delay ends.
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
  if (FINALIZER_BLOCKLIST.has(bountyPda)) {
    await removeQueueEntry(bountyPda);
    log.warn({ bountyPda: bountyPda.slice(0, 8) }, 'blocked bounty not queued for finalization');
    return;
  }

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

export async function cancelFinalization(bountyPda: string): Promise<void> {
  pendingFinalizations.delete(bountyPda);
  await removeQueueEntry(bountyPda);
  log.info({ bountyPda: bountyPda.slice(0, 8) }, 'cancelled pending finalization');
}

export async function getFinalizerSafetyPause(): Promise<{
  paused: boolean;
  until: number | null;
  reason?: string;
}> {
  const now = Math.floor(Date.now() / 1000);
  if (safetyPauseUntil > now) {
    return { paused: true, until: safetyPauseUntil, reason: 'finalizer-lag' };
  }

  const r = await getRedis();
  if (!r) return { paused: false, until: null };

  const raw = await r.get(RK.finalizerSafetyPause());
  if (!raw) return { paused: false, until: null };

  try {
    const parsed = JSON.parse(raw) as { until?: number; reason?: string };
    if (typeof parsed.until === 'number' && parsed.until > now) {
      safetyPauseUntil = parsed.until;
      return {
        paused: true,
        until: parsed.until,
        reason: parsed.reason || 'finalizer-lag',
      };
    }
  } catch {
    // Bad payload: ignore; TTL will clear it.
  }

  return { paused: false, until: null };
}

async function activateFinalizerSafetyPause(lagSeconds: number, queueSize: number): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const until = now + FINALIZER_SAFETY_PAUSE_SECONDS;
  if (safetyPauseUntil >= until - 30) return;

  safetyPauseUntil = until;
  const payload = JSON.stringify({
    until,
    reason: 'finalizer-lag',
    lagSeconds,
    queueSize,
  });

  const r = await getRedis();
  if (r) {
    await r.set(RK.finalizerSafetyPause(), payload, { EX: FINALIZER_SAFETY_PAUSE_SECONDS });
  }

  const msg = `Finalizer lag ${lagSeconds}s exceeds ${FINALIZER_LAG_PAUSE_SECONDS}s; pausing backend bounty preparation until ${new Date(until * 1000).toISOString()}.`;
  log.error({ lagSeconds, queueSize, pauseUntil: until }, msg);
  captureException(new Error(msg), {
    severity: 'critical',
    context: 'finalizer-safety-pause',
    lagSeconds,
    queueSize,
    pauseUntil: until,
  });
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
      if (FINALIZER_BLOCKLIST.has(bountyPda)) {
        await removeQueueEntry(bountyPda);
        log.warn({ bountyPda: bountyPda.slice(0, 8) }, 'removed blocked bounty from finalization queue');
        continue;
      }
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

function getReadyFinalizations(now: number): PendingFinalization[] {
  return Array.from(pendingFinalizations.values()).filter(
    (pending) => now >= pending.challengeEndsAt,
  );
}

function getOldestReadyLagSeconds(now: number): number {
  let oldestLag = 0;
  for (const pending of pendingFinalizations.values()) {
    if (now >= pending.challengeEndsAt) {
      oldestLag = Math.max(oldestLag, now - pending.challengeEndsAt);
    }
  }
  return oldestLag;
}

async function monitorBacklog(readyCount: number, now: number): Promise<void> {
  const queueSize = pendingFinalizations.size;
  const oldestReadyLagSeconds = getOldestReadyLagSeconds(now);
  if (oldestReadyLagSeconds >= FINALIZER_LAG_PAUSE_SECONDS) {
    await activateFinalizerSafetyPause(oldestReadyLagSeconds, queueSize);
  }

  const shouldWarn =
    queueSize >= FINALIZER_QUEUE_WARN_DEPTH ||
    oldestReadyLagSeconds >= FINALIZER_LAG_WARN_SECONDS;
  if (!shouldWarn) return;

  const nowMs = Date.now();
  if (nowMs - lastBacklogAlertAt < FINALIZER_ALERT_COOLDOWN_MS) return;
  lastBacklogAlertAt = nowMs;

  const msg = `Finalizer backlog warning: queue=${queueSize}, ready=${readyCount}, oldestReadyLag=${oldestReadyLagSeconds}s.`;
  log.warn({ queueSize, readyCount, oldestReadyLagSeconds }, msg);
  captureException(new Error(msg), {
    severity: 'warning',
    context: 'finalizer-backlog',
    queueSize,
    readyCount,
    oldestReadyLagSeconds,
  });
}

async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next++];
        await worker(item);
      }
    },
  );
  await Promise.all(workers);
}

/**
 * Process all pending finalizations
 */
async function processPendingFinalizations(): Promise<void> {
  if (processing) {
    log.warn('previous finalizer tick still running; skipping overlapping tick');
    return;
  }

  if (pendingFinalizations.size === 0) return;
  processing = true;

  try {
    const now = Math.floor(Date.now() / 1000);
    const ready = getReadyFinalizations(now);

    await monitorBacklog(ready.length, now);

    if (ready.length === 0) return;

    log.info(
      {
        count: ready.length,
        concurrency: FINALIZER_CONCURRENCY,
        oldestReadyLagSeconds: getOldestReadyLagSeconds(now),
      },
      'processing ready bounties',
    );

    await processWithConcurrency(ready, FINALIZER_CONCURRENCY, finalizeReadyBounty);
  } finally {
    processing = false;
  }
}

async function finalizeReadyBounty(pending: PendingFinalization): Promise<void> {
  if (FINALIZER_BLOCKLIST.has(pending.bountyPda)) {
    pendingFinalizations.delete(pending.bountyPda);
    await removeQueueEntry(pending.bountyPda);
    log.warn({ bountyPda: pending.bountyPda.slice(0, 8) }, 'skipped blocked bounty finalization');
    return;
  }

  const lockKey = RK.finalizerLock(pending.bountyPda);
  const lockAcquired = await redisAcquireLock(lockKey, FINALIZER_LOCK_TTL_SECONDS);
  if (!lockAcquired) {
    log.warn({ bountyPda: pending.bountyPda.slice(0, 8) }, 'finalizer lock not acquired; another worker may be processing bounty');
    return;
  }

  try {
    const signature = await finalizeSingleBounty(pending);
    pendingFinalizations.delete(pending.bountyPda);
    await removeQueueEntry(pending.bountyPda);
    log.info({ bountyPda: pending.bountyPda.slice(0, 8), signature }, 'finalized bounty');
  } catch (error: any) {
    // A timed-out finalize RPC can still land. Reconcile before counting an
    // attempt so an already terminal bounty is success, not ten false
    // BountyNotPending failures followed by a critical page.
    const onChainBounty = await getBountyOnChain(pending.bountyPda);
    if (isTerminalBountyStatus(onChainBounty)) {
      pendingFinalizations.delete(pending.bountyPda);
      await removeQueueEntry(pending.bountyPda);
      log.info(
        {
          bountyPda: pending.bountyPda.slice(0, 8),
          status: Object.keys(onChainBounty.status ?? {})[0] ?? 'terminal',
        },
        'finalize reconciled after ambiguous RPC result',
      );
      return;
    }

    if (isChallengePeriodActiveError(error)) {
      const now = Math.floor(Date.now() / 1000);
      pending.challengeEndsAt = now + CHALLENGE_PERIOD_RETRY_SECONDS;
      await persistQueueEntry(pending);
      log.warn(
        {
          bountyPda: pending.bountyPda.slice(0, 8),
          retryAt: new Date(pending.challengeEndsAt * 1000).toISOString(),
          attempts: pending.attempts,
          err: error.message,
        },
        'finalize deferred; on-chain challenge period still active',
      );
      return;
    }

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
      'finalize failed',
    );

    if (pending.attempts >= MAX_ATTEMPTS) {
      pendingFinalizations.delete(pending.bountyPda);
      await removeQueueEntry(pending.bountyPda);
      log.error(
        { bountyPda: pending.bountyPda.slice(0, 8), max: MAX_ATTEMPTS },
        'giving up on bounty after max attempts',
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
  } finally {
    await redisReleaseLock(lockKey);
  }
}

function isChallengePeriodActiveError(error: any): boolean {
  const message = String(error?.message ?? error ?? '');
  return message.includes('ChallengePeriodActive') || message.includes('Error Number: 6018');
}

/**
 * Ops helper for recovering a bounty that was proposed on-chain but is missing
 * from the worker queue. finalize_bounty is permissionless, so this uses the
 * same hot signer as the background worker.
 */
export async function finalizeBountyNow(bountyPda: string): Promise<string> {
  const program = getProgram();
  const bounty = await (program.account as any).bounty.fetch(new PublicKey(bountyPda));
  const playerWallet = (bounty.player as PublicKey).toBase58();

  return finalizeSingleBounty({
    bountyPda,
    playerWallet,
    challengeEndsAt: 0,
    attempts: 0,
    addedAt: Date.now(),
  });
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

  log.info(
    {
      pollIntervalMs: FINALIZER_POLL_INTERVAL_MS,
      concurrency: FINALIZER_CONCURRENCY,
    },
    'starting worker',
  );

  // Restore queue from Redis first (no-op if Redis disabled)
  void hydrateFromRedis().catch((err) => log.error({ err }, 'hydrate error'));

  intervalHandle = setInterval(() => {
    processPendingFinalizations().catch((err) => {
      log.error({ err: err.message }, 'worker error');
    });
  }, FINALIZER_POLL_INTERVAL_MS);

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
  readyCount: number;
  oldestReadyLagSeconds: number;
  nextFinalizeAt: number | null;
  processing: boolean;
  safetyPauseUntil: number | null;
  pending: Array<{ bountyPda: string; challengeEndsAt: number; attempts: number }>;
} {
  const now = Math.floor(Date.now() / 1000);
  const pending = Array.from(pendingFinalizations.values()).map((p) => ({
    bountyPda: p.bountyPda,
    challengeEndsAt: p.challengeEndsAt,
    attempts: p.attempts,
  })).sort((a, b) => a.challengeEndsAt - b.challengeEndsAt);
  const readyCount = pending.filter((p) => now >= p.challengeEndsAt).length;
  const nextFinalizeAt = pending[0]?.challengeEndsAt ?? null;

  return {
    queueSize: pending.length,
    readyCount,
    oldestReadyLagSeconds: getOldestReadyLagSeconds(now),
    nextFinalizeAt,
    processing,
    safetyPauseUntil: safetyPauseUntil > now ? safetyPauseUntil : null,
    pending,
  };
}
