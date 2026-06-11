# Seek v1.0.5 Store Review Pause - 2026-06-11 14:08 EDT

## Status

v1.0.5 / versionCode 6 has been tested on the Seeker, rebuilt after the final
copy/timing tweaks, and submitted to Solana Mobile dApp Store review. Backend
session-proof enforcement remains intentionally off until the store build is
live and smoke-tested from the official store path.

## Goal

Ship the session-proof mobile update without a contract upgrade: compatibility
backend first, Seeker smoke, dApp Store submission, then enforcement only after
the official store serves the new client.

## Completed

- Deployed the Railway backend compatibility build earlier with
  `REQUIRE_BOUNTY_SESSION_PROOF=false`.
- Ran the Seeker smoke on device `SM02G4061996755`; the hunt started, revealed
  `PERMIT BOARD`, submitted without a second wallet prompt, and finalized as a
  failed Easy hunt.
- Changed loss-result copy to `MISSION FAILED`, changed the how-to splash hold
  from 2000ms to 4000ms, and aligned dApp Store copy to `failed mission`.
- Rebuilt the signed release APK and reinstalled it on the Seeker.
- Submitted v1.0.5 / versionCode 6 to Solana Mobile dApp Store review.

## Current State

- Repo: `/Users/hammer/Desktop/Claude/seek`
- Branch: `wip/session-proof-rollout`, local-only.
- Latest release commit before this checkpoint: `83d5d5a`.
- APK: `mobile/android/app/build/outputs/apk/release/app-release.apk`
- APK SHA-256:
  `7a867ac83852d44909b319d346279d73afcb65cd50f4d681ef808deaff8e4c72`
- dApp Store ticket: `314741840579`
- Release mint: `2oMPtiGumKGVsvyK2NBe2GXcoKDskgRoMsUUPCa9mb4L`
- Railway deployment: `d970186b-8bfc-478a-b0e0-9c22944e6b06`
- Live backend finalizer queue: 0 at the last check.

## Decisions

- User correction: the app should say `MISSION FAILED`, not `MISSION MISSED`.
- User does not want another local Seeker test right now.
- Do not flip `REQUIRE_BOUNTY_SESSION_PROOF=true` until v1.0.5 is live from
  the official Solana Mobile dApp Store and passes one live smoke.
- No contract update is needed for this rollout.

## Changed Files

- `mobile/src/screens/ResultScreen.tsx` - failed-result copy.
- `mobile/src/screens/SplashScreen.tsx` - longer how-to card hold.
- `dapp-store-publishing/config.yaml` - store listing/testing wording.
- `dapp-store-publishing/README.md` - v1.0.5 submission evidence.
- `tasks/lessons.md` - durable copy correction.
- `tasks/session-proof-rollout-2026-05-25.md` - rollout status and next step.
- `tasks/where-we-are.md` - current pickup state.

## Verification

- `mobile`: `npx tsc --noEmit --pretty false` PASS.
- `mobile/android`: `./gradlew assembleRelease` PASS.
- `apksigner verify --print-certs` PASS; signer SHA-256 unchanged.
- `aapt dump badging` confirmed `app.seek.mobile`, versionName `1.0.5`,
  versionCode `6`.
- `dapp-store-publishing`: `node check-assets.mjs` PASS.
- Wording grep found no `MISSION MISSED` / `missed mission` in app/store
  publishing surfaces.
- Live backend `/api/health/ready` returned `ready:true`; Redis returned `PONG`.
- Live backend `/api/health/stats` showed finalizer queue `0`.

## Risks / Open Items

- v1.0.5 is in review, not yet confirmed live.
- Publisher wallet balance after submission was `0.05588918 SOL`; top up before
  any future store update.
- There is one older git stash from May 30:
  `stash@{0}: On master: wip session-proof before ai hotfix rebase 2026-05-30`.

## Resume Prompt

Seek v1.0.5 is submitted to dApp Store review under ticket `314741840579`.
Check whether the official store now serves v1.0.5 / versionCode 6. If it is
live, install/update from the store path, run one live Seeker smoke, then flip
`REQUIRE_BOUNTY_SESSION_PROOF=true` and verify old clients without sessions are
rejected.
