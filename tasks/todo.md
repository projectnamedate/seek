# Paid Bounty Lifecycle Incident - 2026-07-28

## Goal

Stop Seek from accepting a paid bounty unless the same payment can always be
resumed into its mission, recover cleanly from RPC/API timeouts without asking
the wallet to pay again, and remove stuck validation/finalization states.
The operator has already refunded the 10 identified accounts; this work must
not send or duplicate any refund.

## Checklist

- [x] Re-run the mandatory Seek startup audit and reconstruct current live
  backend, Redis, logs, and on-chain bounty state.
- [x] Pause new `/prepare` admissions through the reversible Redis safety gate
  while leaving health and settlement workers online.
- [x] Add red regression coverage for idempotent `/start`, transaction
  confirmation retries, prepared-state retention, and mobile paid-receipt reuse.
- [x] Make `/start` return the original mission for the same already-created
  bounty instead of returning 409 or requiring another payment.
- [x] Persist a mobile paid-start receipt before the wallet handoff and update
  it after submission;
  retries and app restarts must reuse its signature and never prepare/sign a
  second payment.
- [x] Make resolution and finalization idempotent across RPC timeouts and
  persist the intended outcome before the first on-chain resolution call.
- [x] Reconcile stale backend `validating` records against chain state and
  remove ghost monitoring counts.
- [x] Run focused tests, both TypeScript checks, backend build/test suites,
  contract regression checks, and `git diff --check`; inspect the final diff.
- [x] Deploy the scoped backend repair to `/opt/seek-api` without replacing
  production `.env`, then prove readiness, source parity, worker health, and
  protocol-v3 admission before reopening v1.0.5 paid starts.
- [x] Build, sign, verify, and submit v1.0.6 / versionCode 7 to Solana Mobile
  dApp Store review.
- [ ] Update `tasks/where-we-are.md` and complete the required shared-vault
  end-session sweep.

## Review

- Root cause was an ambiguous wallet-to-app handoff: the transaction could
  land while the app lost its signature or `/start` response. Retrying then
  prepared a different paid bounty. Short prepared-state TTLs and non-idempotent
  resolution/finalization paths amplified the incident.
- Mobile v1.0.6 writes the exact PDA/blockhash/prepare receipt before opening
  MWA, resumes it across app restarts, and will not build another payment until
  chain evidence proves the first transaction failed atomically or its
  blockhash expired without landing.
- Backend `/start` now recovers by exact PDA/account data, polls RPC indexing,
  returns the same mission idempotently, retains prepared secrets for 24 hours,
  and marks mission delivery server-side before returning plaintext so a player
  cannot withhold the client ACK for a risk-free cancel.
- Resolution persists the intended outcome and resumes safely across timeouts;
  finalization reconciles terminal on-chain state instead of retrying a landed
  transaction ten times. The API restart removed two expired Redis monitoring
  ghosts without signing or moving funds.
- Final validation: backend launch suite PASS 68/68, backend build/typecheck
  PASS, mobile typecheck PASS, contract tests PASS 25/25, mainnet cargo check
  PASS with known Anchor cfg warnings, dApp assets PASS, signed APK build PASS,
  and `git diff --check` PASS.
- Production is healthy on the Helsinki VPS and the deployed source hashes
  match local. The incident pause was removed at the operator's direction after
  deployment; the released v1.0.5 protocol-v3 `/prepare` path returned HTTP 200
  in a no-payment smoke test. No transaction was built, signed, or sent.
- v1.0.5 has the repaired idempotent backend but cannot persist an ambiguous
  wallet handoff across a full app crash. The operator accepted that residual
  risk and will personally handle any exceptional refunds until v1.0.6 replaces
  it; this session still sends no refunds.
- Read-only chain proof remained unchanged after all deploys: 218 bounties
  (183 Lost, 25 Won, 7 Pending, 2 Submitted, 1 ChallengeLost), 10 active, and
  13,000 SKR active payout liability. The operator had already refunded the
  identified ten accounts; this session sent no refund, cancel, resolve, or
  finalize transaction for them.
- v1.0.6 / versionCode 7 was submitted to review under ticket `325451334378`,
  release mint `FtooC9RXFo8VYheHiyLXcvRxCRCYHqGKqh3ShVuPpmYn`, and APK SHA-256
  `497f54cf14c7e4d5a99181ea104b23d96198155ecca228414ee39e6fae7d9ae6`.

---

# Wallet Abuse Incident - 2026-07-21

## Goal

Permanently block wallet `3vw6SovWwMAWJeKEqeFuDG2JndEnNp3o7TqDWL4W2Cvv`
from Seek, identify how it is cheating, and close the underlying abuse path
without disturbing unrelated session-proof work.

## Checklist

- [x] Run the mandatory Seek startup audit and verify the live VPS baseline.
- [x] Reconstruct the wallet's bounty history and SGT identity.
- [x] Correlate the wallet with production API/log activity and identify the
  exploit pattern from evidence.
- [x] Add durable wallet and SGT containment through the existing bounty
  denylist.
- [x] Implement the smallest systemic fix required by the confirmed exploit.
- [x] Run targeted abuse tests, backend launch-tool tests, typecheck, and diff
  review.
- [x] Deploy the scoped backend change to `/opt/seek-api` and prove live 403
  denial, readiness, stats, and exploit-path closure.
- [x] Update the repo and shared-vault handoffs with verified results.

## Review

- Wallet `3vw6SovWwMAWJeKEqeFuDG2JndEnNp3o7TqDWL4W2Cvv` used verified
  soulbound SGT `6PbD4qYLYG3n5K3dEaXMZjbhX2Jq44V1uLdvkxdVj1vV` for six Easy
  hunts in 13 minutes and won five (83.3%). The five wins account for the
  live cohort's entire completion-rate spike; excluding this session, the
  observed cohort was 1 win in 16 hunts (6.25%).
- The photos were distinct, geographically coherent captures around a Tbilisi
  university/store area. Evidence supports location farming of broad Easy
  targets, not duplicate-image replay. Standard camera attestation was present
  but remains low-confidence and non-cryptographic until Seeker TEE support
  exists.
- The wallet and its SGT are code-seeded into the denylist. Live `/prepare`
  and `/start` both return HTTP 403.
- A new Redis-backed streak breaker caps paid wins at two per UTC day, keyed by
  soulbound SGT when available and wallet otherwise. It is enforced at both
  `/prepare` and `/start`, and successful resolutions record the win. The VPS
  Compose config pins the cap to `2`.
- TDD proof: the route regression first returned HTTP 500 before the admission
  guard, then HTTP 429 after implementation. Final backend launch-tool suite
  passes 59/59; backend typecheck and `git diff --check` pass.
- Live proof: a synthetic capped identity returned HTTP 429 and its temporary
  Redis key was deleted; readiness is HTTP 200 with RPC/program/Redis OK;
  pending `0`, validating `0`, finalizer queue `0`; deployed source/config
  hashes match local.
- Drift cleanup: removed one stale Redis `validating` record whose on-chain PDA
  was already closed. No transaction or funds moved.

---

# Railway Outage to VPS Recovery - 2026-07-12

## Goal

Restore the production game API without paying Railway, preserve signing-key
custody, keep the existing mobile hostname unchanged, and prove the core game
backend is usable before calling the incident closed.

## Checklist

- [x] Reproduce public `404 Application not found` on all production health
  endpoints.
- [x] Prove DNS and domains remained configured but Railway had removed all
  backend/Redis deployments after the free trial expired.
- [x] Verify backend variables and the Redis volume still existed.
- [x] Back up and pubkey-verify the existing hot authority in durable ignored
  storage; use no temp paths.
- [x] Verify the Helsinki VPS has sufficient RAM/disk and healthy Docker/Caddy.
- [x] Deploy isolated Seek API and persistent Redis containers.
- [x] Fix the container healthcheck false negative (`localhost` to
  `127.0.0.1`) and verify both containers become healthy.
- [x] Add and validate the Caddy host, change DNS to the VPS, and obtain TLS.
- [x] Verify forced-origin readiness, session challenge, validation failures,
  stats, and the production blocklist.
- [ ] Wait for the old Railway CNAME TTL to clear across all sampled Google
  anycast nodes and this Mac's OS cache. Authoritative DNS, Cloudflare, Quad9,
  and unforced public readiness from the VPS already pass.
- [ ] Run one store-installed Seeker smoke through the migrated backend.
- [ ] Add and restore-test an encrypted off-host backup for the VPS Redis AOF;
  the Docker volume alone does not survive total host loss.
- [ ] Obtain explicit operator approval before signing any transaction to
  finalize the old `ChallengeLost` bounty.

## Review

- Root cause was account state, not application code: Railway's expired trial
  removed active deployments but left a misleadingly intact project/domain
  configuration.
- The replacement uses existing paid-for VPS capacity, adds no new provider
  bill, preserves `api.seek.mythx.art`, and keeps session enforcement off for
  v1.0.5 compatibility.
- Railway Redis was not recoverable on the free plan. On-chain inspection found
  one cancellable expired Pending bounty and one permissionlessly finalizable
  old loss; neither was silently mutated during recovery.

---

# Seek Tier Reprice + Global Mission Update Plan - 2026-05-19

## Goal

Plan and ship the next Seek update around two community signals:

1. Reprice visible tiers to `500 / 1000 / 2000 SKR` so more Seeker users can
   try a paid hunt and upper-tier vault exposure is smaller.
2. Reduce missions that feel USA-specific or locally unavailable, such as
   postal/mailbox-style targets, while keeping the pool difficult enough for
   the small launch vault.

## Current Read-Only Snapshot

- Git was clean on `master`, tracking `origin/master`, before this planning doc
  update.
- Fresh GitHub CI on `master`: PASS, latest run `26055065510`.
- Live backend readiness: `ready: true`; RPC/program/Redis all OK.
- Live stats: house `65,488 SKR`, Singularity `4,200 SKR`, pending `0`,
  validating `0`, finalizer queue `0`, total bounties `8`, win rate `12.5%`.
- Program `DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v` is upgradeable under
  Ledger `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`.
- Local `solana address -k 'usb://ledger?key=1'` recovered on 2026-05-19 and
  returned the expected Ledger authority pubkey
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY` three times in a row.

## Baseline Verification - 2026-05-19

- [x] `gh run list --limit 3` and `gh run list --branch master --limit 1`.
- [x] Backend typecheck: `cd backend && npx tsc --noEmit --pretty false`.
- [x] Mobile typecheck: `cd mobile && npx tsc --noEmit --pretty false`.
- [x] Contract mainnet check:
  `cd contracts && cargo check --features mainnet --no-default-features`
  passes with known Anchor cfg warnings.
- [x] Contract tests: `cd contracts && npm test` passes 25/25.
- [x] Backend launch-tool tests:
  `cd backend && npm run test:launch-tools` passes 42/42.
- [x] Mission pool tests:
  `cd backend && node --test -r ts-node/register tests/missions.test.ts`
  passes 4/4.
- [x] Anchor build passed and regenerated IDL was copied to
  `backend/src/idl/seek_protocol.json`.
- [x] Solana `rust_autofixer` reported no issues after the final v2 account
  parser change.
- [x] Demo-residue grep returns no matches.
- [x] dApp Store asset validator passes.
- [x] `git diff --check` passes.

## Recommended Product Decision

Use three visible tiers with new prices:

- Tier 1 / Easy: `500 SKR`, 3 minutes, 1000 SKR total return.
- Tier 2 / Medium: `1000 SKR`, 2 minutes, 2000 SKR total return.
- Tier 3 / Hard: `2000 SKR`, 1 minute, 4000 SKR total return.

Reason: this keeps the app cognitively simple, lowers the first paid decision,
and reduces launch-vault drawdown per win. Under the current 2x total-return
model, net house drawdown on a win becomes `500 / 1000 / 2000 SKR` instead of
`1000 / 3000 / 5000 SKR`.

Compatibility caveat: the existing `accept_bounty(entry_amount, timestamp,
commitment)` instruction infers tier solely from `entry_amount`. If we simply
change the constants, `1000 SKR` becomes ambiguous: old clients mean Easy, new
clients mean Medium. To avoid charging one tier and storing another, add a new
`accept_bounty_v2(tier, entry_amount, timestamp, commitment)` instruction that
validates `(tier, entry_amount)` pairs explicitly. Keep the old instruction
temporarily for installed old clients, then remove or stop serving old clients
after the store update window.

## Contract + IDL Plan

- [x] Add new entry constants:
  `500 / 1000 / 2000 * DECIMALS_MULTIPLIER`.
- [x] Add explicit tier+amount validation for v2, so `1000 SKR` maps to Tier 2
  only in the new path.
- [x] Add `accept_bounty_v2` with an explicit `tier` argument and the same
  account layout as `accept_bounty`; v2 uses its own Anchor account parser so
  the tier-first args still derive the bounty PDA from the timestamp.
- [x] Keep legacy `accept_bounty` accepting `1000 / 3000 / 5000` during the
  rollout, or gate old clients off before backend serves the new release.
- [x] Keep timers `180 / 120 / 60`.
- [x] Keep payout math `2x total return`.
- [x] Update contract comments, error strings, tests, and regenerated IDL.
- [x] Run `rust_autofixer` before returning Solana Rust changes.

## Backend Plan

- [x] Introduce a single source for visible tier economics:
  Easy `500`, Medium `1000`, Hard `2000`.
- [x] Keep a legacy compatibility map for old installed clients if the old
  `accept_bounty` instruction remains live.
- [x] Make `/prepare` return the explicit tier, whole-SKR entry amount, base-unit
  entry amount, whole-SKR return amount, and an instruction version.
- [x] Build/verify transactions against `accept_bounty_v2` for new clients.
- [x] Keep `/start` bound to prepared tier and transaction truth.
- [x] Update balance checks, payout formatting, stats/reporting, tests, and
  dApp Store reviewer notes.
- [x] Add tests for the new `500 / 1000 / 2000` prepare amounts and legacy
  compatibility if kept.

## Mobile Plan

- [x] Redesign the Home screen tier buttons for the new price ladder:
  `500 / 1000 / 2000`, with `Return 1000 / 2000 / 4000`.
- [x] Make the selected tier button show the exact price and return plainly;
  avoid stale copy like `Easy 1000`.
- [x] Prefer backend-returned `entryAmount` and return data after `/prepare` for
  the active bounty object so mobile display cannot diverge from the charged
  amount.
- [x] Update `buildAcceptBountyTransaction` to support `accept_bounty_v2` with
  explicit tier serialization; keep old serialization only if needed for
  backward-compatible testing.
- [x] Review Home tier card layout on Seeker-sized viewport for 500/1000/2000
  text fit and button spacing.
- [x] Bump app version/versionCode for the next Solana Mobile update.
- [x] Rebuild signed APK only after contract/backend verification passes.

## Mission Globalization Plan

- [x] Keep the approved 600-mission taxonomy and counts unless we explicitly
  replace the taxonomy: T1 `140/60`, T2 `120/80`, T3 `100/100`.
- [x] Audit the production pool for country-specific or region-narrow targets:
  postal/mailbox/mail slot, curb/sidewalk-heavy wording, parking pay-machine
  assumptions, transit stop sign assumptions, and any US-style civic objects.
- [x] Replace narrow targets with globally common equivalents from the same
  location family, preserving tier and indoor/outdoor count.
- [x] Regenerate `tasks/mission-list-by-tier.md` from source.
- [x] Add a regression check that flags banned terms like `USPS`, national postal
  brands, and other country-specific objects before future mission exports.
- [x] Document the full pass in
  `tasks/mission-globalization-audit-2026-05-19.md`.

## Upgrade/Release Gate

- [x] Run a pre-release audit before any final contract upgrade or mobile app
  update: inspect the diff, regenerated IDL, backend/mobile compatibility,
  country-neutral mission pool, dApp Store copy/assets, durable fee-payer
  custody, release ordering, and test results. Do not proceed to Ledger signing
  or store submission until this audit passes and the user approves. Completed
  locally in `tasks/pre-release-audit-2026-05-19-tier-reprice.md`; still
  requires explicit user approval before Ledger signing.
- [x] User approval to proceed from the passed pre-release audit into the
  Ledger/program-upgrade stage.
- [x] Do not deploy backend or mobile changes that charge/display
  `500 / 1000 / 2000` until the upgraded program is live or the backend is
  explicitly gated.
- [x] Before any program upgrade, rerun the Ledger probe and verify it returns
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`.
- [x] Use only durable ignored key storage for any fee-payer/buffer key:
  `0600`, pubkey verified, backup/drain plan documented before funding.
- [x] Never use `--final`; program must remain upgradeable under the cold
  Ledger.
- [x] Verify ProgramData authority after upgrade.
- [x] Deploy backend after program compatibility is confirmed.
- [x] Smoke test the upgraded flow on the user's Solana Mobile test app after
  the program upgrade/backend deploy and before any Solana Mobile dApp Store
  update submission.
- [x] Submit a signed app update only after typechecks, contract checks, tests,
  APK signing verification, the post-upgrade Solana Mobile test-app smoke, and
  explicit user approval of the exact store changelog.

## Product Decision

`500 / 1000 / 2000 SKR` is the live visible production ladder for v1.0.4.
Do not change it again without re-running the backend/mobile/store copy audit.

---

# Previous Seek Upgrade + dApp Store Update Plan - 2026-05-17

## Goal

Prepare and ship the next Seek update in this order:

1. Clean stale docs and handoff state so no one follows the old mobile-first/no-upgrade plan.
2. Replace the old 300-mission pool with the approved 600-mission global location taxonomy and verify the picker draws from the full pool.
3. Upgrade the contract to keep zero finalization delay and change payouts to `2x` total return / `1x` net profit.
4. Align backend, mobile, IDL, store copy, and docs with the upgraded contract.
5. Redeploy with durable, git-ignored, non-temp keypair storage for any buffer or fee-payer key.
6. Rebuild, verify, smoke on Seeker, and submit the signed APK update to the Solana Mobile dApp Store.

## Non-Negotiables

- Do not create, store, fund, or assign authority to keypairs in `/tmp`, `/private/tmp`, shell heredocs, terminal scrollback, or chat.
- Any generated buffer/fee-payer key must live under durable ignored storage, have `0600`, have a verified pubkey, and have a backup or drain plan before funding.
- Do not use `--final`; the program must remain upgradeable under the cold Ledger.
- Do not publish the APK or run the program upgrade until the verification bundle below passes and the user approves the final go/no-go.

## Current Drift Clean-Up

- [x] Replace old "mobile-first v1.0.3 before contract upgrade" handoff language with the new upgrade-first path.
- [x] Replace stale `3x total / 2x profit` user-facing economics with target `2x total / 1x profit`.
- [x] Keep current-state docs honest before and after the live program upgrade.
- [x] Remove the success-screen settlement-note task because the note must be removed, not preserved.
- [x] Update dApp Store copy and draft "what's new" language for the upgraded release.
- [x] Do not mention `2x` total return, payout math, or economics in the Solana Mobile Store changelog.
- [x] Before any Publisher upload, show the exact changelog text to the user and get explicit approval.

## Mission Audit

- [x] Add a generated location-family audit table for the approved mission taxonomy.
- [x] Remove the old apartment-farmable Tier 1 pool in favor of broad location-native Tier 1 tasks.
- [x] Expand to 600 missions while preserving the deliberate outdoor-first ratios: T1 140/60, T2 120/80, T3 100/100.
- [x] Keep the launch target at 8-12% realistic completion rate, with a hard 15% ceiling.
- [x] Regenerate `tasks/mission-list-by-tier.md` after source changes.

## Contract + IDL

- [x] Confirm live active bounty/liability/finalizer state is clean before any upgrade.
- [x] Keep `CHALLENGE_PERIOD` at zero for mainnet and devnet while public disputes remain disabled.
- [x] Change `payout_amount` from `entry_amount * 3` to `entry_amount * 2`.
- [x] Update comments, tests, IDL, backend IDL copy, and liability docs from `3x` to `2x`.
- [x] Verify no account-size migration is needed; the `payout_amount` field remains the same type.
- [x] Review the legacy dispute path. If it remains inaccessible because the window is zero-length, leave it compatible but do not expose public disputes.

## Backend + Mobile

- [x] Set backend finalization delay default/config to match the upgraded zero-delay program.
- [x] Change backend success payout formatting to `entryAmount * 2n`.
- [x] Remove the Result screen text: `funds will settle in your wallet in 5 minutes`.
- [x] Make reward/return labels unambiguous: users receive `2x` total back on wins, meaning `1x` net profit.
- [x] Update mobile config challenge period from `300` to `0`.
- [x] Ensure release copy does not say `+2000 SKR profit` for a 1000 SKR entry; that is total return, not net profit.

## Verification Bundle

- [x] `git diff --check`.
- [x] Backend typecheck: `cd backend && npx tsc --noEmit --pretty false`.
- [x] Mobile typecheck: `cd mobile && npx tsc --noEmit --pretty false`.
- [x] Contract cargo check: `cd contracts && cargo check --features mainnet --no-default-features`.
- [x] Contract tests: `cd contracts && npm test`.
- [x] Anchor build and IDL copy verification.
- [x] Mainnet preflight before deploy; program account, ProgramData size, and Ledger upgrade authority verified.
- [x] Signed release APK build using `.secrets/android/seek-release.env`, then `apksigner` and `aapt` verification.
- [x] dApp asset validator: `cd dapp-store-publishing && node check-assets.mjs`.
- [x] Solana Mobile test-app smoke before v1.0.4 store submission: wallet
  connect, funded 500 SKR accept flow, camera/location capture, loss display,
  finalizer settlement, no public dispute/deposit action, balance refresh, and
  Try Again return to Home.
- [ ] Post-approval store-build smoke: install/open the store-delivered v1.0.4
  build on Seeker and rerun wallet, passive SGT, camera/location, and funded
  hunt flow.
- [x] Uninstall sideloaded/debug `app.seek.mobile` v1.0.3 / versionCode `4` from Seeker before official unplugged store test.
- [x] User approval of exact Solana Mobile Store "What's new" changelog text.

## Audit Findings To Carry Forward

- `npm audit fix` was applied without `--force` in backend/mobile/contracts. It
  cleared the actionable high-severity mobile/backend transitives. Remaining
  production audit item is the Solana `@solana/spl-token` ->
  `@solana/buffer-layout-utils` -> `bigint-buffer` advisory; npm's offered fix
  is a breaking downgrade to `@solana/spl-token@0.1.8`, so do not apply it
  blindly. Track a Solana SDK migration or upstream package fix.
- Live `/api/health/stats` currently shows no pending/validating bounties and
  finalizer queue `0`, but the small smoke-test sample is `4` wins / `10`
  losses and should not be treated as production completion-rate evidence.
- One local finalizer blocklist entry is still an intentional manual-
  remediation guard for an on-chain `ChallengeLost` smoke-test bounty. Do not
  remove it until that account is remediated or explicitly accepted as finalized
  loss.

## Deploy Gate

- [x] Create any upgrade buffer/fee-payer key directly in durable ignored storage, not temp.
- [x] Verify key file permissions and pubkey before funding.
- [x] Fund only the verified durable pubkey.
- [x] Run the upgrade without `--final`.
- [x] Verify ProgramData authority remains the cold Ledger.
- [x] Drain or document the durable fee-payer/buffer remainder plan.
- [x] Deploy backend after the program upgrade is confirmed.
- [x] Submit dApp Store update only after APK verification, hardware smoke, and explicit changelog approval pass.
