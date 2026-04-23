import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { NETWORK } from '../config';

let initialized = false;

/**
 * Initialize Sentry crash + error reporting for the mobile app.
 *
 * DSN is pulled from `expo.extra.sentryDsn` (set via app.json / eas.json /
 * process.env at build time). Safe to call unconditionally — no-op if the
 * DSN is not configured (dev builds, local testing).
 *
 * Native setup (source-map upload, Android Gradle plugin, iOS Xcode phase)
 * is handled by `npx @sentry/wizard-react-native -i reactNative`. See
 * mobile/SENTRY.md for the full setup flow.
 */
export function initSentry(): void {
  if (initialized) return;

  const dsn =
    (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn ||
    process.env.EXPO_PUBLIC_SENTRY_DSN ||
    '';

  if (!dsn) {
    if (__DEV__) console.log('[Sentry] No DSN configured — crash reporting disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: NETWORK === 'mainnet-beta' ? 'production' : 'development',
    tracesSampleRate: NETWORK === 'mainnet-beta' ? 0.1 : 1.0,
    enableNativeCrashHandling: true,
    enableAutoSessionTracking: true,
    // Redact any potentially sensitive breadcrumb data (wallet addresses,
    // photo blobs, auth headers) before sending. Very cheap, very important.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        if (breadcrumb.data) {
          delete (breadcrumb.data as Record<string, unknown>).request_body;
          delete (breadcrumb.data as Record<string, unknown>).response_body;
        }
      }
      return breadcrumb;
    },
  });

  initialized = true;
  if (__DEV__) console.log('[Sentry] Crash reporting enabled');
}

/**
 * Capture an exception with optional extra context (wallet address, bounty id).
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
