import * as Sentry from '@sentry/node';
import type { Express } from 'express';
import { config } from '../config';

let initialized = false;

/**
 * Initialize Sentry if a DSN is configured. Idempotent and safe to call
 * multiple times. No-op when SENTRY_DSN is unset (dev / local runs).
 *
 * Must be called BEFORE Express app creation for auto-instrumentation to work.
 * Sentry v8+ uses OpenTelemetry under the hood and auto-wraps http + express.
 */
export function initSentry(): void {
  if (initialized) return;
  if (!config.sentry.dsn) {
    console.log('[Sentry] SENTRY_DSN not set — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.server.nodeEnv,
    release: process.env.RAILWAY_DEPLOYMENT_ID || undefined,
    // Trace 10% of requests in prod; 100% in dev.
    tracesSampleRate: config.server.isProd ? 0.1 : 1.0,
    // Scrub known-sensitive headers + body fields before sending.
    beforeSend(event) {
      if (event.request?.headers) {
        const h = event.request.headers as Record<string, string>;
        delete h['authorization'];
        delete h['x-wallet-signature'];
      }
      // Never send request bodies — they can contain photo base64 + wallet addrs
      if (event.request) event.request.data = undefined;
      return event;
    },
  });

  initialized = true;
  console.log('[Sentry] Error tracking enabled');
}

/**
 * Wire the Sentry Express error handler. Must be called BEFORE your own error
 * middleware. No-op when Sentry is disabled.
 */
export function setupSentryErrorHandler(app: Express): void {
  if (!initialized) return;
  Sentry.setupExpressErrorHandler(app);
}

/**
 * Capture an exception manually (for caught errors we want to surface).
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
  }
}

export { Sentry };
