# Seek Upgrade + dApp Store Update Plan - 2026-05-17

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
- [ ] Seeker hardware smoke: wallet connect, passive SGT, camera/location capture, win display, loss display, immediate settlement behavior, no public dispute/deposit action. Negative/loss path passed before store submission; run a short post-approval store-build smoke.
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
