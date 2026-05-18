# Where we are - Seek - 2026-05-18 - v1.0.3 permission-preflight update

## Current State

- Mainnet program `DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v` is
  deployed, initialized, IDL-published, and still upgradeable under Ledger
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`. Never use `--final`.
- Global State PDA: `8KUctm4YQRns3788cQWyjc7SFtKSnws4m4FTZ72YDfYm`;
  latest live health on 2026-05-17 shows house vault `59,488 SKR`,
  Singularity `2,200 SKR`, no pending/validating bounties, finalizer queue `0`,
  and no finalizer safety pause.
- Tier entries are `1000 / 3000 / 5000 SKR` with the same `180s / 120s / 60s`
  timers. The deployed mainnet program now has the approved `2x` total-return
  payout math, zero-delay finalization config, 600 approved missions, and the
  success-screen settlement note removed from the submitted app.
- Cold Ledger is `usb://ledger?key=1` / `44'/501'/1'`,
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`. After the successful
  2026-05-17 upgrade and durable-payer drain, its verified balance is
  `3.999597033 SOL`.
- Hot authority pubkey is `Gm6x8CZU7SQFVVHx2VnCQGteqT8gYnHFgEmdr3eqGdLk`. The
  prior local temp files `/tmp/seek-mainnet-hot-authority.json` and
  `/tmp/seek-mainnet-hot-authority.env` are not present in the current session.
  Treat local custody as unresolved unless recovered from durable secrets or
  Railway secret state without exposing private key material.
- The old temp mainnet deploy wallet pubkey
  `6zZG7iKLdtWdzjKEBY478PoZpNPDjzPyp25qeRAezSUt` still has
  `0.167563443 SOL`, but its `/tmp/seek-mainnet-fee-payer.json` key file is
  not present in the current session. The 2026-05-17 upgrade temp payer pubkey
  `5bGdsBtnmgU96DKyknUX35QwUNcewkNp2x387uZYwZWR` holds `3.4 SOL`, but
  `/private/tmp/seek-upgrade-fee-payer.json` is not present in the current
  session. Future generated keypairs must be created directly in durable
  git-ignored secrets storage, `0600`, pubkey-verified, and backed up or paired
  with a drain plan before funding.
- Current upgrade checks are using `https://api.mainnet-beta.solana.com`.
  On 2026-05-15 Railway `SOLANA_RPC_URL` was moved there because the Helius
  endpoint returned `429 max usage reached`; keep Helius as a future paid-RPC
  option after quota is restored. Do not paste or commit RPC keys.
  During the paused 2026-05-17 upgrade attempt, one command briefly sourced the
  private project RPC from `backend/.env`; no config or repo file was changed,
  and `solana config set --url https://api.mainnet-beta.solana.com` was run
  afterward. Current Solana CLI config should show public mainnet RPC.
- Publisher wallet exists at `.secrets/dapp-store/publisher.json`, pubkey
  `Dzbqbjh8qowVK7x89vj1vo1ApUz7LNRqmR39yYXehenR`, balance
  `0.11787386 SOL` after the v1.0.2 update submission. Solana Mobile docs currently
  recommend about `0.2 SOL` for fees and ArDrive upload costs, so top it up
  before any further release/update attempt.
- Publisher Portal API key is stored outside the repo at
  `/Users/hammer/Desktop/Claude/Solanamobile api.rtf`; do not paste it in chat. The
  RTF's first non-empty line is a label and the second non-empty line is the
  actual key.
- User reports Solana Mobile dApp Store v1.0.1 / versionCode `2` is live.
  Release mint: `ATChUKmCC4zzqj9g54etDd7bW5uLFtLsxj5Dib2kqzRe`; collection
  mint: `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`; ticket ID:
  `311418671831`.
- v1.0.2 / versionCode `3` was submitted to Solana Mobile dApp Store review on
  2026-05-17 with the approved changelog and no payout-math language. Release
  mint: `2jKWGs79qJC2j8LTRfwER6fn4Taz35hymzTWMZvyTBXS`; collection mint:
  `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`; ticket ID:
  `311747315429`. User reported Solana Mobile accepted the update and the app
  store listing now serves this build.
- 2026-05-18 incident response: reports said the app could crash around
  permission grant after a paid hunt started. Root cause class is mobile/backend
  ordering, not contract logic: older clients could sign `accept_bounty` before
  camera/location permission was proven usable. The v1.0.3 update gates paid
  flow on camera + foreground-location permission and backend `/prepare`
  requires an explicit permission preflight before returning transaction data.
- v1.0.3 / versionCode `4` is the next emergency update path. Changelog draft:
  "Adds camera and location permission preflight before paid hunts."
- The sideloaded/debug hardware-test package was removed from the Seeker on
  2026-05-17 before unplugged store testing. Removed package:
  `app.seek.mobile`, version `1.0.3` / versionCode `4`,
  `installerPackageName=null`.
- Release Android keystore/env exist under `.secrets/android/`. Back them up
  before store submission; losing the keystore means losing update ability.
- Release APK exists at `mobile/android/app/build/outputs/apk/release/app-release.apk`,
  package `app.seek.mobile`, version `1.0.3` / versionCode `4`, SHA-256
  `83d5c49b6b4d010b1d604c65efc6d7221732f8d44e4e444b871d6e7412471a43`.
  This is the v1.0.3 permission-preflight candidate built on 2026-05-18; it is
  not yet submitted to Solana Mobile review.
- Local dependency audit on 2026-05-17 applied normal `npm audit fix` updates
  in backend, mobile, and contracts. Remaining production high-severity audit
  finding is the Solana `@solana/spl-token` transitive `bigint-buffer`
  advisory; npm's offered `--force` fix is a breaking downgrade and should not
  be applied without a deliberate Solana SDK migration plan.
- User now has Solana Mobile hardware available. The remaining validation is an
  official-store, unplugged Seeker smoke after v1.0.2 acceptance: Wallet
  Adapter, Seeker Genesis Token verification, camera/location capture, and
  finalization behavior.
- Railway project `seek` is live with `seek-backend` + Redis. Health:
  `https://seek-backend-production-0134.up.railway.app/api/health` and
  `https://api.seek.mythx.art/api/health`. Current Railway deployment:
  `a75a586a-448f-456b-9ed5-b4dd6827dc4c`.
- Solana Mobile support reported an unknown/unrecoverable backend ingest error
  on their side for the original v1.0.0 ticket and asked for another
  submission. A same-APK resubmit was tried on 2026-05-15 with idempotency key
  `seek-resubmit-1.0.0-a420b658897d4631-20260515`; ingestion session
  `8e1ac82b-b383-4771-8d49-cabb342bd61f` failed with:
  `A release with version code 1 already exists for this app`. Solana Mobile
  confirmed a versionCode bump was acceptable, so v1.0.1 / versionCode `2` was
  rebuilt and submitted successfully.
- Cold-Ledger admin controls are public on-chain instructions:
  `pause`/`resume`, `withdraw-house` capped to unreserved house surplus, and
  `withdraw-singularity` only while paused with zero active bounties.
- Brand/app design is protected; only fix clear store rejection risks,
  unreadable states, capture quality, or approved banner polish.
- Six staged screenshots are in `dapp-store-publishing/assets/screenshots/en-US/`;
  submission config uses photos 1, 4, 5, and 6. Keep all six files in place;
  do not move, delete, or rename screenshot slots.
- `api.seek.mythx.art` is wired through Railway and returns HTTPS 200.
- `seek.mythx.art` legal/marketing site is built from `web/` as a static export
  and deployed on the Helsinki Mythx VPS at `/var/www/seek-web` behind Caddy.
  Namecheap DNS resolves `seek.mythx.art` to `204.168.242.220`; Caddy issued
  a Let's Encrypt certificate for `seek.mythx.art`; `/privacy`, `/terms`,
  `/license`, and `/store` return HTTPS 200. `/store` is the post-friendly
  Solana Mobile dApp Store wrapper for
  `solanadappstore://details?id=app.seek.mobile`.
- Working tree cleanup is being committed as the accepted v1.0.2 release state.
  Keep local screenshots, logs, build output, and secret material out of git.

## Fresh Checks

- GitHub CI on master: PASS, latest run `25222718910`.
- 2026-05-18 v1.0.3 permission-preflight verification PASS: backend
  `npm run build`; backend `npm run test:launch-tools` 34/34; mobile
  `npx tsc --noEmit --pretty false`; contracts `npm test` 23/23; dApp Store
  asset validator PASS; release APK build PASS; `apksigner verify` PASS; `aapt`
  confirms `app.seek.mobile`, version `1.0.3` / versionCode `4`.
- Backend/mobile typecheck PASS; backend launch-tool tests 19/19 PASS;
  contract tests 21/21 PASS.
- `npm run build` in `backend/` PASS; Railway deployment
  `af6c3d3b-c565-4de6-9c81-17b6c637b6b2` SUCCESS.
- `npm run build` and `npm run typecheck` in `web/` PASS after static-export
  setup; public DNS resolvers `1.1.1.1`, `8.8.8.8`, and `9.9.9.9` return
  `204.168.242.220` for `seek.mythx.art`; legal pages verified over HTTPS.
- Contracts mainnet `cargo check` PASS with known Anchor cfg warnings.
- Mainnet `npm run preflight:mainnet` PASS after deploy; program account is
  owned by the upgradeable loader and upgrade authority is the Ledger.
- 2026-05-15 mainnet preflight PASS using public mainnet RPC after Helius quota
  exhaustion; program is upgradeable under Ledger
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`.
- `anchor build` PASS; mainnet binary hash
  `94902289c477be734b85cfd54349cd6bc7fbcf9d419ae488ec8fc375ac88d428`;
  on-chain deployed bytecode hash matched local.
- dApp Store assets validator PASS.
- Portal-backed `@solana-mobile/dapp-store-cli` publish PASS using
  `--api-key-stdin`, APK SHA-256
  `a420b658897d46315bb3d97f01d4c546562b2a1a627042f6a8554c740a46b8f8`, and
  idempotency key `seek-initial-1.0.0-a420b658897d4631`.
- 2026-05-15 same-APK portal resubmit attempt reached portal ingestion but
  failed before review submission because versionCode `1` already exists.
- 2026-05-15 v1.0.1 / versionCode `2` resubmission PASS using
  `--api-key-stdin`, APK SHA-256
  `cdfb339816ae82405ffff8dda181032b88c021c27983416eb69d6bbc65d9707e`, and
  idempotency key `seek-resubmit-1.0.1-v2-20260515`. Ingestion session:
  `da680a7c-f986-4df7-bced-e6af6c269d6d`; release ID:
  `9d8eea78-6b9c-4729-a6c4-18fe2c83091d`; publication session:
  `74c15749-888a-448d-bd82-2008bb214a8f`; ticket ID: `311418671831`.
- Android release build PASS; `apksigner verify` PASS; permissions are
  `CAMERA`, `INTERNET`, `VIBRATE`, Android photo picker/media read, and
  `ACCESS_NETWORK_STATE` only. No `RECORD_AUDIO`, legacy external storage, or
  `exp+seek` dev scheme in badging. Current APK badging confirms
  `app.seek.mobile`, version `1.0.1` / versionCode `2`.
- Release APK emulator smoke PASS on `SeekDryRun_API35`: installed the signed
  APK, launched `app.seek.mobile/.MainActivity`, accepted the 18+ gate, reached
  the home screen, loaded live protocol stats from `api.seek.mythx.art`, and
  logcat showed no fatal exception, activity-start failure, ANR, or React
  TypeError/ReferenceError. This is not a substitute for Seeker/MWA/SGT
  hardware validation.
- `git diff --check` PASS.
- 2026-05-15 Railway readiness PASS:
  `/api/health/ready` returned `ready: true` with RPC/program/Redis OK, and
  `/api/health/stats` returned house vault `58,788` SKR.
- 2026-05-16 v1.0.2 bugfix verification PASS:
  backend `npx tsc --noEmit --pretty false`; mobile
  `npx tsc --noEmit --pretty false`; backend `npm run test:launch-tools`
  22/22; contract `cargo check --features mainnet --no-default-features`
  PASS with known Anchor cfg warnings; contract `npm test` 21/21.
- 2026-05-16 Android release build PASS with release signer loaded from local
  `.secrets/android/`; `apksigner verify --print-certs` PASS. APK badging:
  `app.seek.mobile`, version `1.0.2` / versionCode `3`, permissions
  `CAMERA`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `INTERNET`,
  `VIBRATE`, Android media/photo picker reads, and `ACCESS_NETWORK_STATE`.
- 2026-05-16 v1.0.2 SHA-256:
  `8f2e712f7ab66ea48ee484236c01cb3d7ef3b8ef953990459d4057ac944fff7e`.
- 2026-05-17 release-signing drift check found the older hardware-test v1.0.3
  artifact was debug-signed because `assembleRelease` fell back to the debug
  keystore when signing env was absent. `mobile/android/app/build.gradle` now
  fails release artifact tasks unless `SEEK_KEYSTORE_*` env is present. Rebuilt
  with `.secrets/android/seek-release.env`; `apksigner verify --print-certs`
  reported `CN=Seek, OU=Mobile, O=Projectnamedate LLC, L=Miami, ST=Florida,
  C=US`, version `1.0.3` / versionCode `4`, SHA-256
  `3016039351a47be9975bcce2486310e68e35f7df6a5dde8481c263ec6c0abc21`.
- 2026-05-16 Railway hotfix deploy PASS. Deployment
  `a79d3e97-37ef-4ef3-9fd2-2dd23d4a655e` promoted successfully with Docker
  image digest `sha256:57b644b2ff290480c4741ba692e23a82fb2f26660e853df2d78ad2b262c0506d`.
  Public readiness after promotion: `/api/health/ready` returned
  `ready: true` with RPC/program/Redis OK. Deployment logs show Redis
  connected, workers started, and one active bounty restored from Redis; no
  `>=400` HTTP logs were returned for the new deployment at check time.
- 2026-05-17 finalization-upgrade preflight PASS before mutation:
  local rebuilt program size `470888` bytes, local SHA-256
  `9fc273b43c3c92bd3517539daa2dc621ebb09cefdf10e4fef090241884abac4a`;
  live ProgramData size `470240` bytes, authority
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`; live Global State account
  length `274`, matching current `GlobalState::SIZE`, so no Anchor account
  migration is required.
- 2026-05-17 upgrade attempt paused before any program mutation. Ledger transfer
  signature `LsAZJPCMMZUbXyV166i1kuT83oB6bZYcHeZzpn5R9sHxfuXbZyPAiyk1RH4bsGbtZeZrbrh4E295UuL1zc7CE5Q`
  moved `3.4 SOL` to temp payer `5bGdsBtnmgU96DKyknUX35QwUNcewkNp2x387uZYwZWR`.
  Two `program extend` attempts against public mainnet RPC requested Ledger
  approvals but failed sending the RPC request and did not land. Verified
  afterward: ProgramData remained `470240`, Ledger balance `0.673227433 SOL`,
  temp payer balance `3.4 SOL`.
- 2026-05-17 temp payer recovery check is now FAIL in the current session:
  `/private/tmp/seek-upgrade-fee-payer.json` is not present, local searches did
  not find the keypair, and no local Time Machine destination or data-volume
  snapshot is configured. Do not treat the temp payer pubkey as controllable
  unless the keypair is recovered from another durable source and verified.
- 2026-05-17 CLI Ledger state at pause: macOS and browser/Solflare path could
  see the Ledger, but Solana CLI local probes such as
  `solana address -k 'usb://ledger?key=1'` returned `Error: no device found`.
  Do not run upgrade/extend commands again until this local-only address probe
  returns the expected Ledger authority pubkey.
- 2026-05-17 restart Ledger recovery check PASS: `solana address -k
  'usb://ledger?key=1'` returned
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY` three times in a row.
  macOS IORegistry sees a Ledger Flex, `node-hid` lists Ledger interfaces 0 and
  2, and `@ledgerhq/hw-transport-node-hid` lists the interface-0 transport
  path. Caveat: direct Node HID open of interface 0 currently fails with
  `cannot open device`, while interface 2 opens; use Solana CLI for the program
  upgrade path and do not rely on Node Ledger admin scripts until that is fixed.
  The mobile app settings version display was corrected for the local
  hardware candidate; final submitted store build is `1.0.2`.
- 2026-05-17 final local verification after the approved mission/economics
  patch: backend typecheck PASS; backend launch-tool tests 32/32 PASS; mobile
  typecheck PASS; contract cargo check PASS with known Anchor cfg warnings;
  contract tests 23/23 PASS; `git diff --check` PASS; dApp Store asset
  validator PASS; mainnet offline preflight PASS when provided public launch
  env values; live `/api/health/ready` returned `ready: true` with RPC/program/
  Redis OK; Solana CLI confirmed the program remains upgradeable under Ledger
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`.
- 2026-05-17 final publish verification PASS: release build completed with
  `.secrets/android/seek-release.env`; `apksigner verify --print-certs` PASS;
  `aapt dump badging` confirms `app.seek.mobile`, version `1.0.2` /
  versionCode `3`; exact old success-screen copy
  `funds will settle in your wallet in 5 minutes` is absent from source and
  release bundle; dApp Store asset validator PASS; portal-backed CLI submission
  PASS using `--api-key-stdin` and idempotency key
  `seek-update-1.0.2-v3-20260517`.

## Where The User Paused

On-chain mainnet upgrade, Railway backend update, public legal URLs, store
assets, Seeker negative-flow smoke, and the Solana Mobile Publisher Portal
v1.0.2 update submission are complete. User reports Solana Mobile accepted the
v1.0.2 / versionCode `3` update under ticket `311747315429`. v1.0.3 /
versionCode `4` is the current permission-preflight hotfix candidate. Do not
paste API keys or private keys in chat.

## Next Concrete Action

Permission-preflight hotfix path:

1. Push/deploy the backend guard so old clients cannot receive `/prepare`
   transaction data without `permissionsConfirmed: true`.
2. Submit the v1.0.3 / versionCode `4` APK to Solana Mobile review with
   changelog: "Adds camera and location permission preflight before paid hunts."
3. Run a short Seeker smoke after install: app launch permission prompts,
   wallet connect, passive SGT status, tier 1 start, camera/location capture,
   and loss or win finalization.
4. Top up publisher wallet before upload if fees require it; current
   post-submit balance is `0.11787386 SOL`.

Launch risks: Singularity grinding remains until VRF; Solana JS advisories remain.
