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

### B2. Production domain — ✅ DECIDED 2026-04-23
**Structure:** namespaced under user-owned `mythx.art`.
- `seek.mythx.art` — marketing + legal pages (Vercel one-pager). Brand-facing URL — what wallet shows in SIWS prompt.
- `api.seek.mythx.art` — Railway backend.

**App distribution:** Seeker-exclusive via Solana Mobile dApp Store. No iOS, no general Play Store, no web build.

**Done in code:** `PROD_URL`, SIWS domain/uri, MWA `identity.uri`, dApp Store config.yaml + listing copy all reference `seek.mythx.art` / `api.seek.mythx.art`.

**Still TODO (user, post-deploy):**
1. DNS: CNAME `api.seek.mythx.art` → Railway custom-domain target (Phase C step 11 gives the target).
2. Build a one-page Vercel site at `seek.mythx.art` containing `/privacy` and `/terms` (use the in-app legal copy as the content). Optional: a brief landing/marketing section on `/`.

### B3. Ledger pubkey + funding
**Runbook:** [backend/scripts/DEPLOY_MAINNET.md](../backend/scripts/DEPLOY_MAINNET.md) § 2.
**Needs:** Ledger with Solana app installed, ~5 SOL mainnet funded.
**Unblocks:** mainnet program deploy, cold authority rotation.

### B4. SKR holdings for house vault
**Plan:** ~58,824 SKR (≈ $1,000 at $0.017) starter — intentionally small (revised 2026-04-23, was $170k). Mission pool + AI thresholds tuned for 8-12% target win rate to grow this organically.
**Needs:** user confirms SKR wallet + source (airdrop / DEX buy).
**Unblocks:** `admin.ts fund 58824` after protocol init.

### B4b. Fees wallet wired + ROTATABLE (✅ 2026-04-23)
**Address:** `Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr` (a separate Ledger from cold authority) — receives the 10% protocol-treasury cut. Set at `initialize_singularity_vault` and **rotatable post-init** via the new `set_treasury` contract instruction + `admin.ts set-treasury <new_pubkey>` CLI command (cold-authority signed). The dead `withdraw_treasury` instruction was removed 2026-04-23 (it required PDA-owned treasury; non-functional under FEES_WALLET-owned-ATA). FEES_WALLET swaps SKR rake directly on a DEX (Ledger-signed) and off-ramps to fiat — the rake is income, not operating budget. Wired through:
- `contracts/programs/seek-protocol/src/lib.rs` — `set_treasury` instruction + `SetTreasury` accounts struct + `TreasuryRotated` event
- `backend/src/idl/seek_protocol.json` — IDL regenerated + copied
- `backend/scripts/admin.ts` — `set-treasury` command
- `backend/.env.example` + `backend/scripts/initialize-protocol.ts` — `FEES_WALLET` env required, init script throws if unset
- `backend/scripts/DEPLOY_MAINNET.md` — prereqs + step 6 export + step 7b rotation runbook
- `memory/project_fees_wallet.md` + `memory/project_ledger_architecture.md`

### B5. Publisher wallet for dApp Store
**Runbook:** [dapp-store-publishing/README.md](../dapp-store-publishing/README.md).
**Needs:** new Solana keypair + ≥0.5 SOL mainnet + 1Password backup.
**Unblocks:** Publisher NFT mint (one-time), App NFT, Release NFT.

### B6. dApp Store visual assets
**Needs:** 5-6 screenshots at Seeker aspect ratio (1080×2400), feature
graphic (1200×630), app icon (512×512 — may reuse `mobile/assets/icon.png`).
**Unblocks:** `dapp-store-publishing/config.yaml` final fill + release NFT mint.

### B9. seek.mythx.art marketing + legal site — 🟡 QUEUED (agency-tier build)

**Goal:** $100k+ agency-quality landing page that makes Seek look inevitable. Awe-inspiring on first scroll. Solana Mobile Seeker brand language. Required for dApp Store policy compliance (privacy + ToS URLs must resolve to real pages).

**Stack (proposed — confirm before build):**
- Next.js 15 App Router + TypeScript + Tailwind v4
- Framer Motion for entrance/scroll animations + Lenis for buttery smooth scroll
- shadcn/ui primitives (only what's needed — keep bundle small)
- Three.js / React Three Fiber if we go for a hero 3D scene (e.g. orbiting Seeker phones, particle field, generative SKR coin)
- Vercel deploy (free tier, edge-rendered, auto SSL on `seek.mythx.art`)

**Pages:**
- `/` — hero (animated headline, CTA "Get on Seeker"), live stats counter (bounties played, SKR in jackpot, biggest win), how-it-works 3-step, mission examples carousel, dApp Store badge + Seeker phone mockup, FAQ, footer
- `/privacy` — privacy policy (lift in-app copy, render in clean typographic layout)
- `/terms` — terms of service (same treatment)
- `/license` — license page (referenced by dApp Store config `license_url` + `copyright_url`)

**Brand source — STRICT:**
- **Reference:** https://solanamobile.com/seeker — clone the Seeker visual language end-to-end (palette, gradients, type, motion, imagery).
- **NOT generic Solana brand** — Seeker has its own distinct look (olive/sage accent, not bright Solana green; restrained motion vs. crypto-maximalist). User was explicit.
- **At build time:** use Playwright to screenshot the page + `browser_evaluate` computed CSS to extract exact color hex values, gradient stops, font-family stacks, border-radius, shadow tokens. `WebFetch` alone returns thin markdown (JS-rendered site).
- **Site should feel like an official Solana Mobile partner app**, not a generic crypto landing page.

**Per CLAUDE.md global "Shipping a Website" rules — bake in from day one:**
1. **Analytics:** `@vercel/analytics` + `@vercel/speed-insights` installed in root layout. `track()` events on: dApp Store CTA click, "Get on Seeker" CTA, scroll-past-fold, FAQ expand.
2. **SEO:** `metadata` per route, `app/sitemap.ts`, `app/robots.ts`, OG image (1200×630) generated via `@vercel/og`, JSON-LD `Organization` + `SoftwareApplication`, canonical URLs, alt text on all images, semantic `<h1>` `<nav>` `<main>` `<article>`.
3. **Vercel SSO:** PATCH project to clear `ssoProtection` after first deploy (per global rule — Vercel auto-applies and gates the URL behind a 401 wall otherwise).

**User needs to provide:**
- Brand assets if any exist (logo, color palette beyond Solana defaults, screenshots — overlap with B6)
- Final copy approval (or accept Claude-drafted copy)
- A Vercel account + `seek.mythx.art` DNS access (I'll do the wiring once user clicks deploy)

**Effort estimate (after global rule "divide by 10"): ~30-45 min** to scaffold + ship a strong v1, longer for any custom 3D / video work.

**Lives in repo:** new top-level `web/` directory — keeps it separate from `mobile/` and `backend/` and gets its own Vercel project.

---

### B7. Mission pool difficulty audit — ✅ COMPLETE 2026-04-23

**Target (revised for $1k vault):** 8-12% realistic win rate = 35-45% house edge per bet. Hard ceiling 15%. See [memory/project_economic_model.md](../../.claude/projects/-Users-hammer-Desktop-Claude-seek/memory/project_economic_model.md) for full math + variance analysis.

**Done:**
- Rewrote all 300 missions in `backend/src/data/missions.ts`. Every tier-1 mission now requires color/condition/context specificity (e.g. "find a USPS mailbox with the red flag in the up position", not "find a mailbox"). ~20% of each tier is intentionally near-impossible inside the timer (e.g. "house number ending in 7", "bird actively eating from a feeder", "dog mid-bark"). Indoor/outdoor split preserved: T1 70/30, T2 60/40, T3 50/50.
- Bumped `TIER_CONFIDENCE_THRESHOLDS` 0.80/0.85/0.90 → **0.88/0.92/0.95** in `backend/src/types/index.ts`. Bias hard toward false negatives — false negatives cost a fraction of a bet, false positives cost 3-10% of vault.
- Kept tier timers at 180s/120s/60s (already aggressive enough; further compression hurts UX without proportional house-edge gain).
- Typecheck green. Mission helpers (`getRandomMission`, `getMissionsByTierAndLocation`) verified for all tier+location combos.

**Post-launch monitoring (CRITICAL with $1k vault):**
- 20-bet rolling win rate > 25% → page operator immediately, consider pausing new bounties.
- Vault < 50,000 SKR (85% of starting) → first alert.
- Vault < 30,000 SKR → tracked follow-up: auto-pause new bounty preparation (see § E8).
- Track win-rate-by-mission to find any single mission with > 30% win rate; either retire or harden it.

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

## Phase B8 — Comprehensive audit + remediation (2026-04-23)

Three parallel sub-agent audits (security / simplify / architecture) ran across contract + backend + mobile. Top CRIT items fixed in this pass; HIGH items queued.

### CRIT — fixed
- [x] **Wallet auth wired on `/prepare`, `/start`, `/submit`** — `requireWalletAuth` was defined but applied to ZERO routes. Mobile `getWalletAuthHeaders` flow now properly enforced server-side. `BountyRevealScreen` signs auth headers ONCE (single MWA prompt) and reuses across prepare → start within the 120s window. `req.body.playerWallet` replaced with `req.verifiedWallet`.
- [x] **`verifyTransaction` parses on-chain tx properly** — was checking only `confirmationStatus`, trivially bypassed with any random confirmed sig. Now fetches tx, asserts (a) status confirmed, (b) accountKeys includes `expectedPlayer`, (c) accountKeys includes `expectedBountyPda`, (d) at least one instruction targets SEEK PROGRAM_ID. `transactionSignature` now required (no longer optional).
- [x] **`player_token_account` pinned to canonical ATA** — in `AcceptBounty`, `FinalizeBounty`, `DisputeBounty`, `ResolveDispute`, `CancelBounty`. Constraint is now `player_token_account.key() == get_associated_token_address(&owner, &SKR_MINT)`. Closes the "alt-ATA-redirect" attack on win payouts.
- [x] **`close_bounty` 24h cooldown** — was `close = player` with no time guard, allowed PDA-reuse races (close + re-init same `(player, timestamp)` PDA). Now requires `now >= bounty.created_at + 86_400`. New `BountyCooldown` error variant.
- [x] **Expirer worker calls `propose_resolution(false)` on stale Pending bounties** — was only marking `'expired'` in memory. Without on-chain proposal, `cancel_bounty`'s 1h grace let patient players reclaim 100% of entry → loss rate 0. New `expireAndResolveOldBounties()` runs every 30s, locks per-bounty, calls `resolveBountyOnChain(false, ...)` for any Pending past expiry.

### Simplify wins applied (~150 lines deleted, dead surface removed)
- [x] Removed `withdraw_treasury` instruction + `WithdrawTreasury` accounts struct + `TreasuryWithdrawn` event (done in earlier session — non-functional under FEES_WALLET-owned-ATA)
- [x] Removed `finalizeBountyOnChain` + `getAuthorityKeypair` from `solana.service.ts` (dead — finalizer worker inlines its own)
- [x] Removed `/api/bounty/demo/start` + `/api/bounty/demo/submit` + `startBountyDemoSchema` (~135 lines — mobile `USE_DEMO_ENDPOINTS=false`, never called)
- [x] Removed `calculateDistance` Haversine helper from `exif.service.ts` (no GPS-pinned missions in current design)
- [x] Removed dead contract surface: `DISPUTE_WINDOW` const, `DisputeWindowExpired` / `InvalidDisputeStake` / `StillInChallengePeriod` error variants

### HIGH — ✅ all 9 fixed in second pass
- [x] **B8-1** Nonce store + operation-bound auth message — Redis SETNX with 120s TTL. Message now `seek:{op}:{wallet}:{ts}` where `op ∈ {prepare, start, submit}`. `requireWalletAuth(operation)` factory consumes the nonce; replay impossible.
- [x] **B8-2** SIWS domain/uri/chainId checks — `verifySIWSSignature` now validates `message.domain === SIWS_DOMAIN`, `message.uri === SIWS_URI`, and `message.chainId === 'mainnet'|'devnet'` before signature check. Cross-domain phishing relay closed.
- [x] **B8-3** Timeouts on outbound calls — new `backend/src/utils/timeout.ts` `withTimeout()` wrapper. Applied to Anthropic (45s), Helius RPC, and `finalize_bounty` RPC (30s). `TimeoutError` class for typed catch.
- [x] **B8-4** Atomicity — `queueFinalization` now async + awaits `persistQueueEntry` before returning so propose-then-queue is at-least-once. Finalizer reconciler scans the persisted queue on hydrate.
- [x] **B8-5** Hot/cold key disjointness — `config/index.ts` throws on mainnet boot if `HOT_AUTHORITY_PRIVATE_KEY === AUTHORITY_PRIVATE_KEY`.
- [x] **B8-6** In-memory locks → Redis — `acquireWalletLock` / `acquireBountyLock` / `releaseWalletLock` / `releaseBountyLock` all async, backed by `redisAcquireLock` (SETNX + EX). TTLs 60s wallet / 120s bounty. All call sites awaited.
- [x] **B8-7** NETWORK assertion — `mobile/src/config/index.ts` throws at module load if `!__DEV__ && NETWORK !== 'mainnet-beta'`. Release builds cannot ship pointing at devnet.
- [x] **B8-8** Hot wallet SOL balance alert — `checkHotWalletBalance()` runs every 5min, emits `Sentry.captureMessage('hot wallet low')` at < 0.1 SOL. Managed handle in `start/stop` hooks.
- [x] **B8-9** SGT verifications + nonces → Redis — verifications cached 30d (`RK.sgtVerified`), anti-sybil mint→owner mapping persisted no-TTL (`RK.sgtMintOwner`), nonces in Redis with TTL (`RK.sgtNonce`). All verification reads async.

### MED — ✅ all 6 cleaned up
- [x] **B8-10** Pino migration — remaining service files now use `childLogger('name')` (bounty, sgt, attestation, ai, finalizer). No more `console.*` in service code.
- [x] **B8-11** TEE provider stub collapsed — `AttestationService` is now a single class with one `verifyAttestation` method. `AttestationProvider` interface, `TEEAttestationProvider`, providers Map all deleted. Type narrowed to `'none' | 'standard'`.
- [x] **B8-12** Mobile dedupe — single `mobile/src/utils/bs58.ts` source of truth (replaces hand-rolled encoders in api.service.ts + sgt.service.ts). `formatTime` consolidated in `utils/format.ts`. `BountyRevealScreen` uses shared utils.
- [x] **B8-13** setInterval shutdown hooks — `bounty.service.ts` exports `startBountyWorkers()` / `stopBountyWorkers()` managing `expirerHandle` + `cleanupHandle`. Wired into `index.ts` listen + shutdown. No more module-load intervals.
- [x] **B8-14** DEMO_MODE collapse + dead wallet code — `startDemoBounty`, `deductEntry`, `addWinnings`, demo branches in BountyRevealScreen all removed. `getFullAddress` returns real wallet only.
- [x] **B8-15** Single source of truth for tier constants — `mobile/src/types/index.ts` re-exports `TIERS` from `config/index.ts`. `AttestationPayload.type` narrowed to `'standard'`.

### Result
Backend `tsc --noEmit` clean. Contract `cargo check` + `cargo test` pass (1 unit test, 28 unrelated cfg warnings). Mobile typecheck clean apart from pre-existing `@sentry/react-native` types not yet installed. ~150 lines net deletion across the three layers.

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

### E8. Vault-protection mechanics (added 2026-04-23 post-B7)
The $1k launch vault makes per-bet variance the dominant risk. These
are not on the critical path but should land within the first month live.
- [ ] **Tier gating by vault size** — contract change. Disable tier 2 acceptance until `house_fund_balance > 200_000 SKR` (~$3.4k); disable tier 3 until > 500_000 SKR (~$8.5k). Caps tail-risk exposure on the small vault. Adds one new error variant + branch in `accept_bounty`.
- [ ] **Vault floor pause** — contract or backend gate. New `accept_bounty` calls reject when `house_fund_balance < 30_000 SKR` (~$510). Backend can enforce this in `/prepare` for v1; contract enforcement is cleaner.
- [ ] **Per-wallet daily bet rate limit** — backend-side. Cap each wallet at e.g. 20 bounties/day to prevent a single attacker from draining via lucky streak before we notice. Track in Redis with `EXPIRE 86400`.
- [ ] **Per-mission win-rate dashboard** — track `wins[missionId] / attempts[missionId]` in Redis or Postgres. Auto-flag any mission with > 30% win rate over 50+ attempts for retirement.
- [ ] **Auto-throttle on win-rate drift** — if 20-bet rolling win rate > 25%, automatically tighten AI thresholds by +0.02 until it normalizes. Reset when stable.

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
