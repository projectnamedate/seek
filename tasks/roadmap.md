# Seek Roadmap

**Current phase:** mainnet prep → mainnet launch → Solana dApp Store.
**Snapshot date:** 2026-04-22.
**Timeline target:** 2-week solid launch.
**Founder/operator:** Jeff (solo). Ledger hot/cold split. External audit skipped.

This is the single source of truth for what's done, what's in-flight, what's
gated on user action, and what's deferred post-launch. Historical / detail
docs are linked inline.

---

## Phase A — Hardening (✅ COMPLETE)

Finished 2026-04-22. 12 commits on `master`. CI green.

### Contract (`contracts/programs/seek-protocol/`)
- [x] Feature-gated SKR_MINT + SKR_DECIMALS + CHALLENGE_PERIOD (mainnet default, `--features devnet` for devnet)
- [x] TIER_*_ENTRY derived from DECIMALS_MULTIPLIER → 1000 SKR = 10⁶ base units on mainnet (was 10¹² — bug)
- [x] All `msg!` divisors use `DECIMALS_MULTIPLIER` (14 call sites)
- [x] `GlobalState` extended with `hot_authority` + `pending_authority`; SIZE bumped 193 → 257
- [x] Two-step authority transfer: `propose_authority_transfer` + `accept_authority_transfer` + `cancel_authority_transfer`
- [x] Hot/cold auth split: `reveal_mission` + `propose_resolution` now sign with `hot_authority`; admin ops still cold
- [x] `set_hot_authority` (cold-signed rotation)
- [x] Strengthened jackpot RNG — `hash(mission_commitment || bounty_pda || slot || timestamp) % 500`
- [x] `get_tier_duration` returns `Result` with error on unknown tier
- [x] 19 client-side unit tests (PDA derivations, decimals math, commit-reveal hash, IDL integrity)

### Backend (`backend/`)
- [x] Claude Sonnet 4.0 → Sonnet 4.6 upgrade
- [x] `HOT_AUTHORITY_PRIVATE_KEY` env with mainnet-required guard
- [x] Redis-backed mission secrets + prepared bounties + finalizer queue (survives restart)
- [x] Finalizer hydrates queue from Redis on startup
- [x] Redis lock helpers (SETNX + EX TTL)
- [x] @sentry/node v8 with PII-scrub beforeSend + setupExpressErrorHandler
- [x] Structured logging via pino + pino-http with `x-request-id` correlation
- [x] Finalizer worker migrated to pino child logger
- [x] `/api/health` liveness + `/api/health/ready` readiness (checks RPC + program init + Redis)
- [x] Rate limiter on `/prepare` (closes DoS vector — was unauthenticated + unlimited)
- [x] Global rate limit 100 → 300 per 15 min
- [x] Magic-byte image validation (defeats MIME spoofing)
- [x] Claude Vision prompt hardened against injection-via-photo-text
- [x] `admin.ts` decimals-aware (looks up mint decimals dynamically); added `set-hot`, `propose-transfer`, `accept-transfer`, `cancel-transfer`
- [x] Dockerfile (multi-stage Node 20 Alpine, non-root, healthcheck) + railway.json + .dockerignore
- [x] `.env.example` rewritten with mainnet defaults

### Mobile (`mobile/`)
- [x] `NETWORK` toggle in `src/config/index.ts` drives SKR mint + decimals + challenge period
- [x] `App.tsx` follows NETWORK (was hardcoded devnet)
- [x] @sentry/react-native JS init wired (native wizard is user-run)
- [x] Release keystore signing in `android/app/build.gradle` reads from `SEEK_KEYSTORE_*` env vars
- [x] R8/Proguard minification enabled + keep rules for RN, Expo, Solana Mobile, native crypto
- [x] AndroidManifest hardened: no cleartext, no allowBackup, trimmed permissions (7 removed)
- [x] `network_security_config.xml` + `data_extraction_rules.xml`
- [x] `seek://` deep-link scheme (production)
- [x] `app.json` android.permissions trimmed + top-level `scheme: "seek"`
- [x] Dead demo wallet functions removed (`deductEntry`, `addWinnings`)
- [x] `getFullAddress` bug fixed — now returns real wallet addr, not demo constant

### Infrastructure
- [x] GitHub Actions CI: backend typecheck, mobile typecheck, cargo check (both features), cargo clippy, contract unit tests
- [x] `.gitignore` excludes large binaries (APK, AAB, MP4, deck PDF)
- [x] `mobile/android/*` source tree committed (bare workflow — manual edits persist across clones)

### Docs
- [x] [tasks/audit-2026-04-22.md](audit-2026-04-22.md) — full mainnet-readiness audit
- [x] [tasks/mainnet-plan.md](mainnet-plan.md) — 6-phase detailed execution plan
- [x] [tasks/dapp-store-checklist.md](dapp-store-checklist.md) — dApp Store submission requirements + CLI
- [x] [tasks/dapp-store-listing-copy.md](dapp-store-listing-copy.md) — ready-to-paste listing copy
- [x] [tasks/lessons.md](lessons.md) — updated with 2026-04-22 audit lessons
- [x] [backend/scripts/DEPLOY_MAINNET.md](../backend/scripts/DEPLOY_MAINNET.md) — 14-step Ledger-signed runbook
- [x] [mobile/android/SIGNING.md](../mobile/android/SIGNING.md) — keystore generation + backup
- [x] [mobile/SENTRY.md](../mobile/SENTRY.md) — native wizard + DSN wiring
- [x] [dapp-store-publishing/README.md](../dapp-store-publishing/README.md) — publisher NFT flow
- [x] CLAUDE.md — appended Seek project reference

---

## Phase B — User-gated actions (🔴 BLOCKED ON USER)

These items need user hardware/funds/decisions. Work queued; once unblocked
I can execute each in ≤10 minutes except the deploy itself.

### B1. Release keystore generation
**Runbook:** [mobile/android/SIGNING.md](../mobile/android/SIGNING.md).
**Needs:** `keytool` on user's laptop + 1Password backup + paper backup.
**Unblocks:** release APK builds, dApp Store submission.

### B2. Production domain
**Options:** `seek.app` (likely premium), `seekgame.xyz`, `playseek.xyz`, or
Railway default `*.up.railway.app` for v1.
**Needs:** user purchase + DNS CNAME to Railway.
**Unblocks:** final `PROD_URL` wiring in `mobile/src/config/index.ts`, dApp Store listing URLs.

### B3. Ledger pubkey + funding
**Runbook:** [backend/scripts/DEPLOY_MAINNET.md](../backend/scripts/DEPLOY_MAINNET.md) § 2.
**Needs:** Ledger with Solana app installed, ~5 SOL mainnet funded.
**Unblocks:** mainnet program deploy, cold authority rotation.

### B4. SKR holdings for house vault
**Plan:** ≥10M SKR (≈$170k at $0.017) to seed house vault.
**Needs:** user confirms SKR wallet + source (airdrop / DEX buy).
**Unblocks:** `admin.ts fund` after protocol init.

### B5. Publisher wallet for dApp Store
**Runbook:** [dapp-store-publishing/README.md](../dapp-store-publishing/README.md).
**Needs:** new Solana keypair + ≥0.5 SOL mainnet + 1Password backup.
**Unblocks:** Publisher NFT mint (one-time), App NFT, Release NFT.

### B6. dApp Store visual assets
**Needs:** 5-6 screenshots at Seeker aspect ratio (1080×2400), feature
graphic (1200×630), app icon (512×512 — may reuse `mobile/assets/icon.png`).
**Unblocks:** `dapp-store-publishing/config.yaml` final fill + release NFT mint.

### B7. Mission pool difficulty audit — HOUSE-EDGE CRITICAL
**Target:** 15-18% player win rate = 20-30% house edge per bet. Anything
above ~26% and the house pool bleeds. See
[memory/project_economic_model.md](../../.claude/projects/-Users-hammer-Desktop-Claude-seek/memory/project_economic_model.md)
for the full math.

**Scope:**
- Walk all 300 missions in `backend/src/data/missions.ts`; rate each for
  realistic completion probability within its tier's timer (180s / 120s / 60s).
- Rebalance so ~20% of each tier is *intentionally near-impossible*
  within the time window (obscure combinations, specific brand/attribute
  requirements, unusual conditions).
- Remaining ~80% should be hard-but-doable — require specificity or
  scarcity that raises the realistic pass bar to ~30% per attempt.
- If the mission set alone can't hit target win rate, shorten timers
  and/or raise `TIER_CONFIDENCE_THRESHOLDS` in `backend/src/types/index.ts`
  (current 0.80 / 0.85 / 0.90 → suggested 0.85 / 0.90 / 0.93).

**Do in this order pre-launch:**
1. Categorize every mission by realistic completion rate (trivial /
   moderate / hard / near-impossible).
2. Prune + replace until the distribution matches target.
3. Recompile expected win rate; compare to target.
4. Tune AI thresholds + timers to close any remaining gap.
5. Post-launch, monitor actual win rate weekly via
   `GlobalState.total_bounties_won / total_bounties_created`. Alert if
   weekly win rate drifts above 22%.

**Blocks:** launch. A too-easy mission pool = immediate capital loss.
The house vault funding is irreversible once deposited, so we audit
before we fund, not after.

---

## Phase C — Mainnet launch (sequential, ≤1 day once B complete)

Per [backend/scripts/DEPLOY_MAINNET.md](../backend/scripts/DEPLOY_MAINNET.md):

1. `anchor build` (mainnet default)
2. `anchor deploy --provider.cluster mainnet --provider.wallet usb://ledger` (~3-4 SOL)
3. `anchor idl init` — publish IDL on-chain
4. `solana-verify build && solana-verify upload` — verified build attestation
5. Generate hot keypair, fund with 0.3 SOL
6. Run `initialize` → `initialize_house_vault` → `initialize_singularity_vault`
7. `admin.ts set-hot <hot_pubkey>`
8. `admin.ts propose-transfer <ledger_pubkey>` then `accept-transfer` as Ledger
9. Optionally transfer program upgrade authority to Ledger via `solana program set-upgrade-authority`
10. Transfer SKR to authority ATA, then `admin.ts fund 10000000`
11. Deploy backend to Railway, set env vars, add Upstash Redis addon, point custom domain
12. Flip `mobile/src/config/index.ts` `NETWORK` → `'mainnet-beta'`
13. Build release APK with `SEEK_KEYSTORE_*` env vars
14. Sideload APK on Seeker, run full smoke test with real SKR

---

## Phase D — Solana dApp Store submission (≤1 hr active + 2-5 business days review)

Per [dapp-store-publishing/README.md](../dapp-store-publishing/README.md):

1. `npm i -g @solana-mobile/dapp-store-cli`
2. `npx dapp-store create publisher` (~0.03 SOL)
3. `npx dapp-store create app` (~0.02 SOL)
4. `npx dapp-store create release` (~0.1-0.2 SOL)
5. `npx dapp-store publish submit --requestor-is-authorized --complies-with-solana-dapp-store-policies`
6. Wait 2-5 business days; iterate on any review feedback
7. Ship

---

## Phase E — Post-launch hardening (rolling, after first 2-4 weeks live)

Not on the critical path. Each unblocks future scale or raises the security bar.

### E1. Switchboard On-Demand VRF
**When:** Singularity jackpot pool > ~$50k USD (grinding ROI threshold).
**Cost:** ~0.002 SOL per VRF request (≈ per win at launch volume).
**Scope:** split `finalize_bounty` into 3-instruction flow (propose → commit VRF → consume). Touches contract + backend finalizer.
**Effort:** ~3-4 hrs.

### E2. Full Anchor integration tests
**Scope:** accept → reveal → propose → finalize win + loss paths, dispute flow both outcomes, two-step authority rotation, cancel after grace, hot authority rotation.
**Blocker:** SKR_MINT const is compile-gated. Either (a) add a `test` feature that makes the mint pluggable, or (b) run tests against `solana-test-validator --clone <devnet SKR mint>`.
**Effort:** ~2-3 hrs.

### E3. Complete Redis migration
**Remaining Maps:** `activeBounties`, `bountyByPlayer`, `walletLocks`, `bountyLocks`.
**Unblocks:** horizontal scale beyond single Railway instance.
**Effort:** ~1 hr.

### E4. Full pino migration
**Scope:** remaining ~65 `console.log`/`console.error` calls across services + routes.
**Effort:** ~30 min.

### E5. Ledger signing wired into `admin.ts` + `initialize-protocol.ts`
**Scope:** replace env-based base58 keypair with a signer abstraction that supports `@solana/wallet-adapter-ledger` or similar.
**Effort:** ~1 hr.

### E6. Seeker Camera SDK / TEE attestation
**When:** Solana Mobile ships the SDK (status unclear as of 2026-04-22).
**Scope:** wire real TEE attestation into `backend/src/services/attestation.service.ts` (placeholder already in place).

### E7. Features from the pitch deck
- [ ] Leaderboard + player stats (on-chain or via indexer)
- [ ] Mission pool expansion 300 → 1000+
- [ ] Community-submitted missions with staking
- [ ] GPS Super Hunts (partner-hosted, city-wide events)

---

## Deferred by decision (2026-04-22 gate)

- **External smart contract audit** — user skipped. Internal audit only. Revisit if contract surface changes materially or a major exploit class is discovered.
- **Squads v4 multisig for authority** — user prefers Ledger (solo operator). Revisit if team grows or multi-sig coordination is needed.
- **Postgres for analytics** — Redis-only at launch. Add when analytics/leaderboard needs structured queries.

---

## Observability KPIs to set alerts on

Once Railway + Sentry + Upstash are live:
- p99 latency on `/api/bounty/prepare`, `/api/bounty/start`, `/api/bounty/submit`
- AI validation latency (Claude Vision call)
- Finalizer queue depth (alarm at > 50)
- On-chain tx failure rate
- House vault balance (alarm if < 1M SKR)
- Singularity vault balance (informational)
- Mobile crash-free session rate
- Sentry new-issue rate

---

## Historical references

- [tasks/archive/security-audit-2026-02-27.md](archive/security-audit-2026-02-27.md) — Feb 2026 hackathon-era audit. Most findings now fixed; superseded by [audit-2026-04-22.md](audit-2026-04-22.md).
- [tasks/archive/real-device-demo-2026-02-27.md](archive/real-device-demo-2026-02-27.md) — hackathon device-demo setup. Superseded by production deploy runbook.
