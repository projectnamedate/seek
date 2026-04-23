/**
 * Bounded-time wrapper for outbound calls. Stuck calls (Anthropic, Helius,
 * Solana RPC) hold per-bounty locks indefinitely and starve the request
 * pipeline — every external dependency must have a timeout.
 */

export class TimeoutError extends Error {
  constructor(public ms: number, public label?: string) {
    super(`${label ?? 'operation'} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Race a promise against a timeout. The underlying operation may continue
 * running after the timeout fires (network calls can't be aborted from JS
 * without an AbortController) — pass a controller via the inner call site
 * if you need true cancellation.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(ms, label)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
