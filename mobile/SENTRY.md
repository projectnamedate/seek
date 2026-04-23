# Sentry (mobile) — setup guide

JS-side init lives in `mobile/src/services/sentry.service.ts`; it's safe to
leave unconfigured (no-op when the DSN is missing). Native setup is one-time
and takes ~10 minutes.

## 1. Get a DSN

Create a project at https://sentry.io/ (React Native platform, free tier
covers ~5k errors/mo). Copy the DSN URL.

## 2. Install the SDK

```bash
cd mobile
npm install --save @sentry/react-native
```

## 3. Native wiring (source maps + Gradle plugin)

Run the official wizard — it edits `android/app/build.gradle`, adds the
Sentry Gradle plugin, and wires up source-map upload:

```bash
cd mobile
npx @sentry/wizard-react-native -i reactNative
```

Accept the defaults. The wizard will:
- Add the Sentry Android Gradle plugin to `android/app/build.gradle`
- Add a `sentry.properties` file with your auth token (add to `.gitignore`)
- Modify `metro.config.js` to enable Hermes source-map generation
- Inject Sentry init boilerplate (you can remove that — we already init via
  `src/services/sentry.service.ts`)

## 4. Configure the DSN at build time

Pick ONE of these (easiest first):

### A. `app.json` extra field (simplest, committed)

```json
{
  "expo": {
    "extra": {
      "sentryDsn": "https://<public-key>@o0.ingest.sentry.io/<project>"
    }
  }
}
```

### B. EAS env var (if using EAS Build)

```bash
eas secret:create --scope project --name SENTRY_DSN --value "https://..."
```

Then reference via `EXPO_PUBLIC_SENTRY_DSN` in `app.json`:

```json
{
  "expo": {
    "extra": { "sentryDsn": "${EXPO_PUBLIC_SENTRY_DSN}" }
  }
}
```

### C. Plain `.env` (gitignored)

Create `mobile/.env`:

```
EXPO_PUBLIC_SENTRY_DSN=https://...
```

Expo Router + Metro auto-load `EXPO_PUBLIC_*` vars.

## 5. Verify

```bash
cd mobile
npx expo run:android --variant release  # release build captures native crashes
```

In the app, intentionally trigger an error. Within ~1 min it should appear
in your Sentry issues dashboard.

## 6. Source-map verification

Break a source line on purpose (throw in a hook), rebuild + run. When the
crash lands in Sentry, the stack trace should show your `.tsx` file and line
number — not minified bundle coordinates. If you see minified coords,
re-run the wizard and confirm the `sentry-cli sourcemaps upload` step ran
during the release build.

## Related

- Backend Sentry lives in `backend/src/services/sentry.service.ts` (v8 node
  SDK with auto-instrumentation). Same free-tier quota.
- PII scrubbing: `beforeBreadcrumb` in our init already strips request +
  response bodies. Adjust for more conservative policies if needed.
