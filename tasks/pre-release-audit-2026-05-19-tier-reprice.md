# Pre-Release Audit - v1.0.4 Tier Reprice + Global Mission Update - 2026-05-19

## Audit Result

PASS for the staged local patch.

NOT RELEASED. No mainnet program upgrade, backend deployment, signed APK build,
or Solana Mobile dApp Store update has been performed from this patch.

The release must remain paused until the user explicitly approves moving from
this audit into the Ledger/program-upgrade stage.

## Objective Checked

- Change visible Seek tiers to `500 / 1000 / 2000 SKR`.
- Keep returns at `2x` total return: `1000 / 2000 / 4000 SKR`.
- Preserve old installed clients by keeping legacy `accept_bounty` economics.
- Add a non-ambiguous v2 contract instruction for new clients.
- Remove or rewrite missions that depend on USA-specific objects or assumptions.
- Update backend, mobile, Solana Mobile store copy/assets, and release docs.
- Keep public/release docs clear that v1.0.4 is staged locally, not live.
- Add an audit gate before final contract upgrade and mobile app update.
- Keep all fee-payer wallet handling durable and git-ignored.
- Smoke test the upgraded flow on the user's Solana Mobile test app after the
  contract/backend upgrade and before app-store submission.

## User Request Mapping

| Request | Status | Evidence |
|---|---:|---|
| Add a `500 SKR` tier / consider `500/1k/2k` | PASS | Contract, backend, mobile, screenshots, and store copy now use `500 / 1000 / 2000` for new clients. |
| Change Home screen buttons | PASS | `mobile/src/config/index.ts`, `mobile/src/screens/HomeScreen.tsx`, and prepared bounty display paths were updated for the new ladder. |
| Contract upgrade likely required | PASS, staged only | `accept_bounty_v2(tier, entry_amount, timestamp, mission_commitment)` was added and IDL regenerated. No upgrade has been sent. |
| App Store update required | PASS, staged only | v1.0.4 config/copy/screenshots are prepared. No Publisher submission has been sent. |
| Avoid confusing staged work with live production | PASS | README, listing copy, config, and status docs label v1.0.4 as staged/not submitted and preserve the Ledger/backend/smoke/store gate. |
| Durable fee-payer wallet | PASS for custody precheck | `.secrets/solana/seek-upgrade-payer-20260517.json` and buffer key are durable, git-ignored, and `0600`; both are currently unfunded. |
| Pause for Ledger work | PASS | Release is stopped before Ledger signing, funding, or program upgrade. |
| Add audit to todo list before final upgrade/update | PASS | This audit is the referenced gate in `tasks/todo.md`. |
| Remove USA-only mission items thoroughly | PASS | Mission generator, approved lists, and backend data were regenerated after a full country-neutral audit. |
| Smoke test Solana Mobile test app after upgrade before app store update | PASS, gated | Release order docs require this after program upgrade/backend deploy and before Publisher submission. |

## Contract Audit

Status: PASS for staged source and IDL.

- New visible constants are `500 / 1000 / 2000 SKR`.
- Legacy constants remain `1000 / 3000 / 5000 SKR` for old clients.
- `accept_bounty_v2` validates explicit `(tier, entry_amount)` pairs so
  `1000 SKR` cannot be interpreted as both old Easy and new Medium.
- v2 uses a dedicated Anchor accounts struct with
  `#[instruction(tier: u8, entry_amount: u64, timestamp: i64)]`, preserving the
  timestamp seed parsing for the bounty PDA.
- `accept_bounty` remains available for legacy clients.
- Timers remain `180 / 120 / 60`.
- Payout remains `2x` total return.
- Program remains intended to stay upgradeable. Do not use `--final`.

Files checked:

- `contracts/programs/seek-protocol/src/lib.rs`
- `contracts/tests/seek-protocol.ts`
- `backend/src/idl/seek_protocol.json`

## Backend Audit

Status: PASS for staged source.

- `/prepare` now accepts `clientProtocolVersion`.
- New clients get current v2 economics and `instructionVersion: 2`.
- Old clients without protocol version get legacy v1 economics and
  `instructionVersion: 1`.
- Prepared bounty storage records instruction version and exact entry amount.
- `/start` verifies transaction discriminator, tier, entry amount, timestamp,
  and mission commitment against the prepared record.
- Pure parser tests lock the v1 and v2 instruction layouts.
- Launch tests assert the backend hardcoded `accept_bounty` discriminators and
  v2 arg/account order against the regenerated IDL.

Files checked:

- `backend/src/routes/bounty.routes.ts`
- `backend/src/services/bounty.service.ts`
- `backend/src/services/solana.service.ts`
- `backend/src/types/index.ts`
- `backend/tests/accept-bounty-instruction-layout.test.ts`
- `backend/tests/skr-normalization.test.ts`
- `backend/tests/missions.test.ts`

## Mobile Audit

Status: PASS for staged source.

- Mobile client protocol version is `2`.
- Tier config is `500 / 1000 / 2000`.
- Prepare calls include `clientProtocolVersion`.
- Transaction builder supports v2 discriminator and layout:
  discriminator, tier, entry amount, timestamp, commitment.
- Bounty reveal flow uses backend-prepared entry and return amounts for display.
- Android/app package versions are staged as v1.0.4 / versionCode 5.

Files checked:

- `mobile/src/config/index.ts`
- `mobile/src/services/api.service.ts`
- `mobile/src/services/solana.mobile.ts`
- `mobile/src/screens/BountyRevealScreen.tsx`
- `mobile/src/screens/HomeScreen.tsx`
- `mobile/android/app/build.gradle`
- `mobile/package.json`
- `mobile/package-lock.json`

## Mission Globalization Audit

Status: PASS for staged mission pool.

- Production mission count remains 600.
- Tier/location ratios remain aligned with the approved taxonomy.
- Postal/mailbox/mail slot/mailroom, porch, curb/sidewalk-only, drinking
  fountain-only, picnic-table/lawn-only, rideshare, garage-or-lot, transit stop
  sign, and parking pay machine assumptions were removed or generalized.
- Replacements use globally plausible targets such as doorbell/buzzer, parcel
  shelf/locker, pedestrian path/ramped edge/street-edge, entry light, public
  water point, public seating/open park area, hired-car/taxi, parking area, and
  route marker.
- A backend mission regression test now rejects broad USA/country-specific
  terms in generated production data.

Files checked:

- `tasks/mission-globalization-audit-2026-05-19.md`
- `tasks/scripts/generate-mission-final-list-draft.mjs`
- `tasks/mission-final-list-draft.md`
- `tasks/mission-list-by-tier.md`
- `backend/src/data/missions.ts`
- `backend/tests/missions.test.ts`

## Store/Release Audit

Status: PASS for staged store metadata and screenshots.

- Solana Mobile config uses v1.0.4/versionCode 5 release notes.
- `dapp-store-publishing/config.yaml` is explicitly labeled as staged v1.0.4
  update config and says not to submit until program upgrade, backend deploy,
  post-upgrade Solana Mobile test-app smoke, signed APK verification, and user
  changelog approval are complete.
- Store copy describes `500 / 1000 / 2000 SKR`.
- `tasks/dapp-store-listing-copy.md` is explicitly labeled as a staged v1.0.4
  draft and separates the proposed v1.0.4 changelog from the historical initial
  release changelog.
- Reviewer notes mention `accept_bounty_v2`.
- Listing examples avoid the old USA-centered examples.
- Screenshot source and PNGs were regenerated for the new tier ladder.
- All six screenshots validate at 1440x2880.

Files checked:

- `dapp-store-publishing/config.yaml`
- `tasks/dapp-store-listing-copy.md`
- `dapp-store-publishing/README.md`
- `dapp-store-publishing/assets/source/screenshots/generate-screenshots.mjs`
- `dapp-store-publishing/assets/screenshots/en-US/*.png`

## Public Docs Audit

Status: PASS for staged/live distinction.

- `README.md` now opens with a release-status warning: this checkout stages the
  v1.0.4 tier/mission update, while the currently deployed program and submitted
  store build remain on the legacy production path until Ledger upgrade,
  backend deploy, Solana Mobile test-app smoke, and dApp Store update finish.
- README tier and `accept_bounty_v2` examples are labeled as staged v1.0.4
  behavior.
- README mainnet deploy status explicitly says v1.0.4 is not deployed or
  submitted.

Files checked:

- `README.md`

## Durable Fee-Payer Audit

Status: PASS for staged custody precheck; NOT funded.

- Durable path: `.secrets/solana/seek-upgrade-payer-20260517.json`
- Payer pubkey derived from file: `3EKi2PzKrDi22Ld6NgixdBX7djSKMrZA2TG1utg1tJAS`
- Buffer path: `.secrets/solana/seek-upgrade-buffer-20260517.json`
- Buffer pubkey derived from file: `C3y6AWfaM4vR5vocLa8Bozv768PkeyDwmaQWhM3buH2i`
- `.secrets/` is git-ignored by `.gitignore`.
- `.secrets/solana/` was verified `0700`.
- Both keypair files were verified `0600`.
- Both balances were `0 SOL`.
- No temp path was used for the current staged upgrade keys.

Before funding or signing, rerun full public-key verification from the durable
files and document the result. The earlier `solana-keygen verify` attempt was
blocked by the local approval guard, so do not treat funding as approved yet.
Drain plan: fund only what the upgrade needs, then drain the durable payer
after the upgrade completes.

## Validation Run

- `anchor build`: PASS.
- IDL copied to `backend/src/idl/seek_protocol.json`: PASS.
- Solana `rust_autofixer`: PASS, no issues reported.
- `cd backend && npx tsc --noEmit --pretty false`: PASS.
- `cd backend && npm run test:launch-tools`: PASS, 42/42.
- `cd mobile && npx tsc --noEmit --pretty false`: PASS.
- `cd contracts && npm test`: PASS, 25/25.
- `cd contracts && cargo check --features mainnet --no-default-features`: PASS
  with known Anchor cfg warnings.
- `cd dapp-store-publishing && node check-assets.mjs`: PASS.
- `git diff --check`: PASS.
- Country-specific mission/store-copy grep: PASS, no matches.
- Public/store doc staged-state check: PASS. README, dApp Store listing copy,
  and dApp Store config label the v1.0.4 behavior as staged and blocked on the
  Ledger/backend/smoke/store sequence.
- Release runbook custody check: PASS. `backend/scripts/DEPLOY_MAINNET.md`
  keeps the cold Ledger as `--upgrade-authority`, uses the durable ignored
  payer only as `--fee-payer`, and uses a durable ignored buffer key instead of
  a random or temp buffer. The runbook now requires the connected Ledger pubkey
  and both exact durable payer/buffer pubkeys to match before funding or
  deploying.
- Read-only live gate check at `2026-05-19T18:29:55Z`: PASS. `solana program
  show` reports upgrade authority
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`; backend readiness is
  `ready: true`; `/api/health/stats` reports pending `0`, validating `0`,
  finalizer queue `0`, and no safety pause.

## Required Release Order

1. User approves moving from this audit into Ledger/program-upgrade work.
2. Rerun Ledger probe and verify the cold Ledger returns
   `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`.
3. Rerun durable payer verification, then fund only after the pubkey, path,
   permissions, ignore status, and drain plan are confirmed.
4. Upgrade the program without `--final`.
5. Verify ProgramData authority remains the cold Ledger.
6. Deploy the backend with the v2 IDL and transaction verifier.
7. Smoke test the upgraded paid flow on the user's Solana Mobile test app.
8. Build and verify the signed v1.0.4 APK.
9. Show the exact Solana Mobile store changelog to the user.
10. Submit the dApp Store update only after explicit user approval.

## Open Blockers

- User approval for Ledger/program-upgrade stage.
- Live Ledger probe immediately before signing.
- Durable payer full pubkey verification and funding.
- Mainnet program upgrade.
- Post-upgrade ProgramData authority verification.
- Backend production deploy.
- Solana Mobile test-app smoke on upgraded flow.
- Signed v1.0.4 APK build and signature verification.
- User approval of exact store changelog.
- Solana Mobile dApp Store update submission.
