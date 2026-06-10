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

## Current Next Work - Saved 2026-06-10

1. Rebase/review `wip/session-proof-rollout` against current `origin/master`.
2. Run full backend/mobile validation after the rebase.
3. Deploy the backend first in compatibility mode with
   `REQUIRE_BOUNTY_SESSION_PROOF=false`.
4. Build and test the v1.0.5 mobile update on a Seeker:
   - one off-chain session signature
   - one on-chain `accept_bounty_v2` approval
   - no wallet prompt during photo submit
   - result resolves normally
5. Submit v1.0.5 / versionCode 6 to the Solana Mobile dApp Store only after
   the Seeker smoke passes.
6. Flip `REQUIRE_BOUNTY_SESSION_PROOF=true` only after the store serves the v3
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
