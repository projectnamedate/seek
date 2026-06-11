# Session Proof Rollout - 2026-05-25

## Goal

Ship wallet-signed bounty sessions with SGT mint binding, without a contract
upgrade and without adding any extra on-chain transaction approvals.

Expected user approval flow in the v3 app:

1. One off-chain wallet message signature to create/reuse the bounty session.
2. One on-chain `accept_bounty_v2` transaction approval to start the paid hunt.
3. No wallet prompt on photo submission.

## Current Local State

- Backend session support is implemented locally:
  - `POST /api/session/challenge`
  - `POST /api/session/verify`
  - opaque `seek_sess_*` session tokens stored server-side
  - session bound to wallet, client protocol version, and backend-verified SGT
    mint
  - `/prepare`, `/start`, and `/submit` accept and bind the same session token
- Mobile session support is implemented locally:
  - `CLIENT_PROTOCOL_VERSION = 3`
  - session token is created before `/prepare`
  - same token is passed to `/prepare`, `/start`, and `/submit`
- Enforcement is intentionally configurable:
  - deploy first with `REQUIRE_BOUNTY_SESSION_PROOF=false`
  - only flip true after the mobile update is live in the Solana Mobile dApp
    Store

## Progress - 2026-06-11

- Rebased `wip/session-proof-rollout` onto `origin/master` and preserved the
  pre-rebase branch at `backup/session-proof-pre-rebase-20260611`.
- Validation after rebase/prep:
  - backend `npx tsc --noEmit --pretty false` PASS
  - backend `npm run test:launch-tools` PASS after the rebase
  - mobile `npx tsc --noEmit --pretty false` PASS
  - contracts `cargo check --features mainnet --no-default-features` PASS
  - contracts `npm test` PASS 25/25
  - `git diff --check` PASS
  - `cd dapp-store-publishing && node check-assets.mjs` PASS
- Deployed the backend compatibility build to Railway production deployment
  `d970186b-8bfc-478a-b0e0-9c22944e6b06` with strict enforcement still off
  (`REQUIRE_BOUNTY_SESSION_PROOF` is not explicitly set, so config defaults to
  `false`).
- Live verification after deploy:
  - `https://api.seek.mythx.art/api/health` returns `status: ok`
  - `/api/health/ready` returns `ready: true` with RPC/program/Redis OK
  - `/api/session/challenge` returns `success: true`, `sessionRequired: false`,
    `clientProtocolVersion: 3`, `domain: seek.mythx.art`
  - the blocked wallet still receives HTTP `403` with
    `This wallet is not eligible for Seek bounties`
- Built release-signed APK candidate:
  - path: `mobile/android/app/build/outputs/apk/release/app-release.apk`
  - package: `app.seek.mobile`
  - version: `1.0.5`
  - versionCode: `6`
  - final SHA-256 after copy/timing fix:
    `7a867ac83852d44909b319d346279d73afcb65cd50f4d681ef808deaff8e4c72`
  - signer certificate SHA-256:
    `c50d2751f3ede1c7e3e04aab312f497783e79b95b28a1835ee23b668d80af17c`
- Seeker smoke PASS on device `SM02G4061996755` after installing the signed
  v1.0.5 / versionCode `6` APK:
  - connected wallet displayed as `hammathyme.skr`
  - Easy hunt started with a 500 SKR entry
  - session path created the off-chain bounty session, then one on-chain
    `accept_bounty_v2` approval started the paid hunt
  - mission revealed as `PERMIT BOARD`
  - photo submission did not require a wallet prompt
  - validation/finalization completed as a loss
  - final live stats: pending `0`, validating `0`, won `0`, lost `1`,
    finalizer queue `0`, house `78,638 SKR`, Singularity `9,100 SKR`
  - tester balance moved from `753.024 $SKR` to `253.024 $SKR`, matching the
    500 SKR Easy entry loss
- User corrected loss-result wording during smoke. The submitted build now says
  `MISSION FAILED` instead of `MISSION MISSED`, the how-to splash holds for
  `4000ms` instead of `2000ms`, and dApp Store listing/testing copy uses
  `failed mission`.
- Submitted v1.0.5 / versionCode `6` to Solana Mobile dApp Store review with
  `--api-key-stdin` and idempotency key
  `seek-update-1.0.5-v6-20260611`:
  - Release mint: `2oMPtiGumKGVsvyK2NBe2GXcoKDskgRoMsUUPCa9mb4L`
  - Collection mint: `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`
  - Ticket ID: `314741840579`
  - Ingestion session: `393e6329-4a02-43a9-9471-691684350fc9`
  - Release ID: `3ec1276d-b3a3-48cd-a911-85d4dcb7fb5b`
  - Publication session: `e1424d63-6a78-4cca-b178-8952c58cb488`
  - Release tx:
    `2KUEjBDzmyGFzgxTXuraRyJXmmoEXcdqQmUEMpy5Fk6xzF73Nx6tSTwexoqf19NDPwyZAv9dZNffw74LunA9p5pX`
  - Collection tx:
    `5C6kYPWz7u7Zpuci5XVWSWFBymcRuBZxtAvnr3WZ99ikiCacada3JJiLjEDY6eEbNLJpwpGXiRLgqNhEaqaU12Ee`
  - Attestation request ID: `32557393368506399883497423818849`
  - Publisher wallet balance after submission: `0.05588918 SOL`
- Railway compatibility backend remains live on production deployment
  `d970186b-8bfc-478a-b0e0-9c22944e6b06` with strict session enforcement still
  off. No backend source changed after that compatibility deploy, so no
  no-op Railway redeploy was needed; final live checks still returned
  `/api/health/ready ready:true`, Redis `PONG`, and
  `/api/session/challenge sessionRequired:false`.

## Current Next Work - Saved 2026-06-11

1. Wait for Solana Mobile dApp Store review of v1.0.5 / versionCode `6`
   (ticket `314741840579`).
2. After the store serves the v3 client, install/update from the official store
   path and run one live smoke.
3. Flip `REQUIRE_BOUNTY_SESSION_PROOF=true` only after the store serves the v3
   client and a live smoke confirms the new client path works.

Parallel/non-blocking follow-ups:

- Audit active Helsinki Caddy config against the May backups before future VPS
  edits; restore only confirmed-active hosts. The 2026-06-10 repair restored
  `seek.mythx.art`, `mythx.art`, and `www.mythx.art`; `api.opencrawl.gg` and
  `claudedammit-api.mythx.art` are deprecated and should stay out unless
  deliberately revived.
- Submit the Superteam Instagrant packet once the 200+ dApp Store reviews
  screenshot is attached or verified.
- Refresh the grant deck app screenshot later; the copy uses current
  `500 / 1000 / 2000 SKR` tiers, but one real screenshot still shows older
  tier/reward text.

## Why This Needs v1.0.5

The backend can be deployed first without breaking current users because
`REQUIRE_BOUNTY_SESSION_PROOF=false` keeps old clients compatible. But actual
session-proof enforcement requires a mobile client that knows how to:

1. request `/api/session/challenge`;
2. ask the wallet for one off-chain message signature;
3. exchange that signature for a `seek_sess_*` token;
4. send that token to `/prepare`, `/start`, and `/submit`.

The current store build is v1.0.4 / versionCode 5 and does not have that client
flow. Android and the Solana Mobile dApp Store require a new `versionCode` for
each uploaded APK, so the next upload must be versionCode 6. Calling it
v1.0.5 is the clean user-facing version name for that versionCode bump. The
important technical requirement is versionCode 6; the `1.0.5` name keeps store,
docs, and operator language aligned.

## Live Rollout Order

### 1. Deploy Backend In Compatibility Mode

Deploy the backend first with session routes available but enforcement off:

```bash
REQUIRE_BOUNTY_SESSION_PROOF=false
MIN_SESSION_CLIENT_PROTOCOL_VERSION=3
BOUNTY_SESSION_TTL_SECONDS=1800
```

Then verify:

```bash
curl -s https://api.seek.mythx.art/api/health
curl -s https://api.seek.mythx.art/api/health/ready
```

Done when:

- health returns OK
- readiness returns `ready: true`
- currently live store app still starts bounties
- blocked wallet/SGT response still returns 403

### 2. Prepare Mobile Update

Before building the store candidate:

- bump Android `versionCode` from `5` to `6`
- bump Android `versionName` from `1.0.4` to `1.0.5`
- align `mobile/package.json` and `mobile/app.json` version metadata if needed
- update `dapp-store-publishing/config.yaml` `new_in_version`

Suggested changelog:

```text
Adds secure bounty sessions and strengthens Seeker Genesis Token verification for paid hunts.
```

Do not mention exploit details, blocked users, or internal anti-abuse logic in
store copy.

### 3. Build And Install Test APK On Seeker

Build a release-signed APK with the real keystore env loaded. Verify signer and
version before installing.

Test-phone checklist:

- install APK on the testing Seeker
- connect wallet holding an SGT
- start an Easy tier hunt
- confirm one off-chain wallet message signature appears for the session
- confirm one on-chain `accept_bounty_v2` transaction approval appears
- confirm mission reveal works
- take photo
- submit photo
- confirm no wallet prompt appears during submit
- confirm result resolves on-chain

Failure conditions:

- more than one on-chain transaction approval before photo submission
- wallet prompt during photo submit
- session created for a non-SGT wallet
- `/start` succeeds without the session token when the bounty was prepared with
  one

### 4. Submit DApp Store Update

Only after the Seeker test APK passes:

- run the normal release validation bundle
- top up publisher wallet if needed before upload
- submit v1.0.5 / versionCode 6 to Solana Mobile dApp Store
- keep backend enforcement off while review and user update rollout happen

### 5. Flip Backend Enforcement After Store Build Is Live

After the dApp Store serves the v3 client:

```bash
REQUIRE_BOUNTY_SESSION_PROOF=true
MIN_SESSION_CLIENT_PROTOCOL_VERSION=3
BOUNTY_SESSION_TTL_SECONDS=1800
```

Redeploy/restart backend, then smoke:

- v3 client can start and submit a bounty
- old/custom clients without a session get `401 Bounty session proof required`
- old/custom clients cannot get mission details through `/start`
- no new contract deploy or program upgrade happened

## Rollback

If the mobile update has trouble before enforcement:

- leave `REQUIRE_BOUNTY_SESSION_PROOF=false`
- old and new clients keep working

If enforcement causes live issues after the update:

- set `REQUIRE_BOUNTY_SESSION_PROOF=false`
- redeploy/restart backend
- investigate without touching the contract

## Validation Already Run Locally

- `backend`: `node --test -r ts-node/register tests/session-proof.test.ts`
- `backend`: `npm run test:launch-tools` 53/53
- `backend`: `npx tsc --noEmit --pretty false`
- `backend`: `npm run build`
- `mobile`: `npx tsc --noEmit --pretty false`
- repo: `git diff --check`
