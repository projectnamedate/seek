# Seek Roadmap

**Current phase:** live dApp Store -> v1.0.2 official-store smoke.
**Snapshot date:** 2026-05-17.
**Timeline target:** 2-week solid launch.
**Founder/operator:** Jeff (solo). Ledger hot/cold split. External audit skipped.

This is the single source of truth for what's done, what's in-flight, what's
gated on user action, and what's deferred post-launch. Historical / detail
docs are linked inline.

---

## Phase A — Hardening (✅ COMPLETE)

Finished 2026-04-22. 12 commits on `master`. CI was added in this phase but
turned out to be red on every push until 2026-04-27 (see Phase B9 below) —
roadmap previously misclaimed "green" without actually checking the runs.

### Contract (`contracts/programs/seek-protocol/`)
- [x] Feature-gated SKR_MINT + SKR_DECIMALS; public-release `CHALLENGE_PERIOD`
  is zero on mainnet/devnet while public disputes are disabled
- [x] TIER_*_ENTRY derived from DECIMALS_MULTIPLIER → 1000/3000/5000 SKR use 10⁶ base units on mainnet (was 10¹² — bug)
- [x] All `msg!` divisors use `DECIMALS_MULTIPLIER` (14 call sites)
- [x] `GlobalState` extended with `hot_authority` + `pending_authority`; SIZE bumped 193 → 257
- [x] Two-step authority transfer: `propose_authority_transfer` + `accept_authority_transfer` + `cancel_authority_transfer`
- [x] Hot/cold auth split: `reveal_mission` + `propose_resolution` now sign with `hot_authority`; admin ops still cold
- [x] `set_hot_authority` (cold-signed rotation)
- [x] Strengthened Singularity bonus RNG — `hash(mission_commitment || bounty_pda || slot || timestamp) % 500`
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
- [x] `NETWORK` toggle in `src/config/index.ts` drives SKR mint + decimals;
  finalization delay is zero while public disputes are disabled
- [x] `App.tsx` follows NETWORK (was hardcoded devnet)
- [x] @sentry/react-native JS init wired (native wizard is user-run)
- [x] Release keystore signing in `android/app/build.gradle` reads from `SEEK_KEYSTORE_*` env vars
- [x] R8/Proguard minification enabled + keep rules for RN, Expo, Solana Mobile, native crypto
- [x] AndroidManifest hardened: no cleartext, no allowBackup, trimmed permissions (7 removed)
- [x] `network_security_config.xml` + `data_extraction_rules.xml`
- [x] `seek://` deep-link scheme (production)
- [x] `app.json` android.permissions trimmed + top-level `scheme: "seek"`
- [~] Demo wallet functions partially removed — `deductEntry` only. `addWinnings`, `DEMO_TARGETS`, `DEMO_WALLET`, `DEMO_MODE.INITIAL_BALANCE` fallback, `useFallbackDemoBounty`, `isDemoMode` badge all still shipped until B9 fully stripped them on 2026-04-27.
- [x] `getFullAddress` bug fixed — now returns real wallet addr, not demo constant

### Infrastructure
- [x] GitHub Actions CI: backend typecheck, mobile typecheck, cargo check (both features), cargo clippy, contract unit tests
- [x] `.gitignore` excludes large binaries (APK, AAB, MP4, deck PDF)
- [x] `mobile/android/*` source tree committed (bare workflow — manual edits persist across clones)

### Docs
- [x] [tasks/audit-2026-04-22.md](audit-2026-04-22.md) — full mainnet-readiness audit
- [x] [tasks/archive/mainnet-plan-2026-04-22.md](archive/mainnet-plan-2026-04-22.md) — original 6-phase plan, superseded by this roadmap (archived 2026-04-23)
- [x] [tasks/dapp-store-checklist.md](dapp-store-checklist.md) — dApp Store submission requirements + CLI
- [x] [tasks/dapp-store-listing-copy.md](dapp-store-listing-copy.md) — ready-to-paste listing copy
- [x] [tasks/lessons.md](lessons.md) — updated with 2026-04-22 audit lessons
- [x] [backend/scripts/DEPLOY_MAINNET.md](../backend/scripts/DEPLOY_MAINNET.md) — 14-step Ledger-signed runbook
- [x] [mobile/android/SIGNING.md](../mobile/android/SIGNING.md) — keystore generation + backup
- [x] [mobile/SENTRY.md](../mobile/SENTRY.md) — native wizard + DSN wiring
- [x] [dapp-store-publishing/README.md](../dapp-store-publishing/README.md) — publisher NFT flow
- [x] CLAUDE.md — appended Seek project reference

---

## Phase B — User-gated actions (✅ LIVE; UPGRADE-FIRST PATCH NEXT)

The on-chain hardware/funding actions, Railway/Redis/backend DNS, legal site,
Publisher Portal app setup, API-key submission, and dApp Store release
resubmission are complete. User reports the v1.0.1 dApp Store listing is live.
The first real Solana Mobile runs exposed camera metadata, AI/provider,
passive-SGT, public-dispute, mission-farmability, stale settlement copy, and
payout-economics issues now tracked in `tasks/todo.md`. The previous
mobile-first/no-upgrade path is superseded. Remaining user-gated work is the
audited mainnet program upgrade that removes the stale finalization delay,
changes the payout to `2x` total return, removes the success-screen settlement
note, then another Seeker smoke before any Publisher upload. The Solana Mobile
Store changelog must be shown to the user and approved before upload, and it
must not mention payout math or `2x` total return.

**📋 Execution playbook:** [tasks/phase-b-execution.md](phase-b-execution.md) —
sequenced sub-items B0-B9 with parallelization plan, hard dependencies,
and Phase C/D follow-on. Read that first when starting launch work.

### B0a. Ledger signing support for init/admin — ✅ CODE COMPLETE
**Runbook impact:** `backend/scripts/DEPLOY_MAINNET.md` steps 6-10.
**Done:** `backend/src/utils/authority-signer.ts`,
`initialize-protocol.ts`, and cold-admin paths in `admin.ts` now support
`AUTHORITY_SIGNER=ledger` with optional `AUTHORITY_LEDGER_PUBKEY` mismatch
protection. `backend/scripts/mainnet-preflight.ts` checks the launch constants
and upgrade authority.
**Why:** Mainnet `initialize` is now constrained to the hardcoded expected
authority. The signer running init must be the same Ledger.
**Still needs:** real-device Ledger smoke with the Solana app open.
**Unblocks:** B0, Phase C init/admin operations after user provides the pubkey.

### B1. Release keystore generation
**Runbook:** [mobile/android/SIGNING.md](../mobile/android/SIGNING.md).
**Status:** Generated at `.secrets/android/seek-release.keystore` with env file
`.secrets/android/seek-release.env`; release APK signing verified by
`apksigner`. Still needs user backup to 1Password/offline storage before any
public submission.
**Unblocks:** release APK builds, dApp Store submission.

### B2. Production domain — ✅ DECIDED 2026-04-23
**Structure:** namespaced under user-owned `mythx.art`.
- `seek.mythx.art` — marketing + legal pages on the Helsinki Mythx VPS
  through Caddy static hosting. Brand-facing URL — what wallet shows in SIWS
  prompt.
- `api.seek.mythx.art` — Railway backend.

**App distribution:** Seeker-exclusive via Solana Mobile dApp Store. No iOS, no general Play Store, no web build.

**Done in code:** `PROD_URL`, SIWS domain/uri, MWA `identity.uri`, dApp Store config.yaml + listing copy all reference `seek.mythx.art` / `api.seek.mythx.art`.

**Done:** `api.seek.mythx.art` is wired to Railway and returns HTTPS 200.
`seek.mythx.art` static site is deployed on the Mythx VPS at
`/var/www/seek-web`; Namecheap DNS points `seek` to `204.168.242.220`; Caddy
issued a Let's Encrypt certificate and the legal URLs return HTTPS 200.

### B3. Ledger pubkey + funding
**Runbook:** [backend/scripts/DEPLOY_MAINNET.md](../backend/scripts/DEPLOY_MAINNET.md) § 2.
**Status:** Done. Cold Ledger `GkpX...YNtY` is the protocol authority and
program upgrade authority. Current cold SOL balance verified at
`1.373232333 SOL`.
**Unblocks:** mainnet program deploy, cold authority rotation.

### B4. SKR holdings for house vault
**Plan:** ~58,824 SKR (≈ $1,000 at $0.017) starter — intentionally small (revised 2026-04-23, was $170k). Mission pool + AI thresholds tuned for 8-12% target completion rate to grow this organically.
**Status:** User loaded the cold Seek Ledger wallet with ~58k SKR on 2026-05-05.
**Unblocks:** `admin.ts fund 58824` after protocol init.

### B4b. Fees wallet wired + ROTATABLE (✅ 2026-04-23)
**Address:** `Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr` (a separate Ledger from cold authority) — receives the 10% protocol-treasury cut. Set at `initialize_singularity_vault` and **rotatable post-init** via the new `set_treasury` contract instruction + `admin.ts set-treasury <new_pubkey>` CLI command (cold-authority signed). The dead `withdraw_treasury` instruction was removed 2026-04-23 (it required PDA-owned treasury; non-functional under FEES_WALLET-owned-ATA). FEES_WALLET swaps SKR rake directly on a DEX (Ledger-signed) and off-ramps to fiat — the rake is income, not operating budget. Wired through:
- `contracts/programs/seek-protocol/src/lib.rs` — `initialize_singularity_vault` and `set_treasury` now require the treasury owner account and pin the treasury token account to that owner's canonical SKR ATA
- `backend/src/idl/seek_protocol.json` — IDL regenerated + copied
- `backend/scripts/admin.ts` — `set-treasury` command
- `backend/.env.example` + `backend/scripts/initialize-protocol.ts` — `FEES_WALLET` env required, init script throws if unset
- `backend/scripts/DEPLOY_MAINNET.md` — prereqs + step 6 export + step 7b rotation runbook
- `memory/project_fees_wallet.md` + `memory/project_ledger_architecture.md`

### B4c. Cold-Ledger emergency controls (✅ 2026-05-05)
**Status:** Contract and admin CLI expose explicit public controls:
`set_protocol_paused`, `withdraw_unreserved_house`, and
`withdraw_singularity`. `accept_bounty` rejects new entries while paused.
House withdrawals are capped to tracked house balance minus active payout
liability. Singularity withdrawals require the protocol to be paused with zero
active bounties.

**CLI:** `admin.ts pause`, `admin.ts resume`,
`admin.ts withdraw-house <amount>`, `admin.ts withdraw-singularity <amount>`.

### B5. Publisher wallet for dApp Store
**Runbook:** [dapp-store-publishing/README.md](../dapp-store-publishing/README.md).
**Status:** Generated at `.secrets/dapp-store/publisher.json`, pubkey
`Dzbqbjh8qowVK7x89vj1vo1ApUz7LNRqmR39yYXehenR`, balance `0.11787386 SOL`
after the v1.0.2 store submission. Top up before the next update.
**Unblocks:** Publisher NFT mint (one-time), App NFT, Release NFT.

### B6. dApp Store visual assets
**Needs production art, not placeholder reuse.** Current mobile icon/banner
quality should not be assumed good enough for review or launch conversion.

- [x] **Design/brand audit first:** review current Seek logo, in-app visual
  language, store listing, and marketing-site direction against Solana Mobile
  dApp Store requirements, Solana Mobile co-marketing guidance, and official
  Solana brand constraints before producing final assets.
  Sources to re-check during the audit:
  `https://docs.solanamobile.com/dapp-store/submit-new-app`,
  `https://docs.solanamobile.com/marketing/comarketing-guidelines`,
  `https://solana.com/branding/`.
  Done in `dapp-store-publishing/assets/source/brand-audit.md`.
- [x] **Seek logo system:** iris mark, wordmark, app-icon variant, monochrome
  variant, and dark/light lockups are soft-locked by user approval. Keep this
  Seek-owned branding; do not misuse or recolor Solana/Solana Mobile marks.
- [x] **New app icon:** `dapp-store-publishing/assets/icon.png`, 512x512 PNG.
  Soft-locked by user approval. Do not churn unless a concrete submission issue
  appears.
- [x] **New required banner:** `dapp-store-publishing/assets/banner.png`,
  1200x600 PNG/JPG. Should communicate "real-world Seeker hunt + SKR entries"
  immediately, using real app/product visuals rather than generic gradients or
  over-weighted token/economics messaging. `source/banner.svg` and
  `06-dapp-store-banner-1200x600.png` use screenshot 1 as the app visual.
  Final portal banner was accepted by user and uploaded before submission.
- [x] **Screenshots/videos:** at least 4 app screenshots/videos under
  `dapp-store-publishing/assets/screenshots/en-US/`; images must be >=1080x1080
  and share orientation + aspect ratio. Use
  `dapp-store-publishing/scripts/capture-screenshot.sh` for the six planned
  slots. 2026-05-04 submission set was captured from the disposable devnet
  capture fork with `hammer.skr` because dApp Store submission blocks organic
  Seeker distribution until screenshots exist. Submission config uses photos 1,
  4, 5, and 6 only; keep all six PNGs in place for review history.
- [x] **Optional feature graphic:** `dapp-store-publishing/assets/feature-graphic.png`,
  1200x1200 for Editor's Choice consideration. Soft-locked by user approval.
- [x] **Asset QA:** verify icon legibility at small sizes, banner readability
  in dark/light contexts, screenshot text fit, and contrast/accessibility before
  running `check-assets.mjs`. Brand approval comes before screenshot/app-design
  review; do not use generated comps or phone renders as final submission captures.

**Unblocks:** `dapp-store-publishing/config.yaml` final fill + release NFT mint.
**Guard:** `cd dapp-store-publishing && node check-assets.mjs`.

### B9. seek.mythx.art marketing + legal site — ✅ LEGAL URLS LIVE

**Goal:** $100k+ agency-quality landing page that makes Seek look inevitable. Awe-inspiring on first scroll. Solana Mobile Seeker brand language. Required for dApp Store policy compliance (privacy + ToS URLs must resolve to real pages).

**Current stack:** Next.js App Router + TypeScript + plain CSS, exported as
static HTML from `web/` and served by Caddy on the Helsinki Mythx VPS. Server
files live at `/var/www/seek-web`. DNS and TLS are live for
`seek.mythx.art`.

**Pages:**
- `/` — hero (animated headline, CTA "Get on Seeker"), live stats counter (bounties played, SKR in Singularity pool, largest reward), how-it-works 3-step, mission examples carousel, dApp Store badge + Seeker phone mockup, FAQ, footer
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
3. **Static hosting:** use `output: 'export'` and deploy `web/out/` to
   `/var/www/seek-web`; no long-running Node service is required.

**User needs to provide:** final copy approval for any future marketing polish.

**Current status:** public legal URLs are live and ready for dApp Store review:
`/privacy`, `/terms`, and `/license`.

**Lives in repo:** new top-level `web/` directory — separate from `mobile/` and
`backend/`.

---

### B7. Mission pool difficulty audit — 🟡 REOPENED 2026-05-17

**Target (revised for $1k vault):** 8-12% realistic completion rate = 35-45% protocol edge per entry. Hard ceiling 15%. See [memory/project_economic_model.md](../../.claude/projects/-Users-hammer-Desktop-Claude-seek/memory/project_economic_model.md) for full math + variance analysis.

**Done in the first pass:**
- Rewrote all 300 missions in `backend/src/data/missions.ts`. Indoor/outdoor split preserved: T1 70/30, T2 60/40, T3 50/50.
- Bumped `TIER_CONFIDENCE_THRESHOLDS` 0.80/0.85/0.90 → **0.88/0.92/0.95** in `backend/src/types/index.ts`. Bias hard toward false negatives — false negatives cost a fraction of an entry, false positives cost 3-10% of vault.
- Kept tier timers at 180s/120s/60s (already aggressive enough; further compression hurts UX without proportional house-edge gain).
- Typecheck green. Mission helpers (`getRandomMission`, `getMissionsByTierAndLocation`) verified for all tier+location combos.

**Reopened scope:** user reported several Tier 1 missions were easy inside an
apartment while others were extremely difficult. For the next app update, the
approved 2026-05-17 taxonomy expands the pool to 600 missions across 20 global
location families. Tier 1 is broad/simple, Tier 2 adds visible constraints, and
Tier 3 uses rare multi-cue combinations. Outdoor/indoor split is now T1 140/60,
T2 120/80, T3 100/100.

**Post-launch monitoring (CRITICAL with $1k vault):**
- 20-entry rolling completion rate > 25% → page operator immediately, consider pausing new bounties.
- Vault < 50,000 SKR (85% of starting) → first alert.
- Vault < 30,000 SKR → tracked follow-up: auto-pause new bounty preparation (see § E8).
- Track completion-rate-by-mission to find any single mission with > 30% completion rate; either retire or harden it.

---

## Phase C — Mainnet launch (sequential, ≤1 day once B complete)

Per [backend/scripts/DEPLOY_MAINNET.md](../backend/scripts/DEPLOY_MAINNET.md):

1. [x] `anchor build` (mainnet default)
2. [x] Initial program deploy completed and bytecode hash verified. For all
   future upgrades, create any deploy/buffer/fee-payer key only in durable
   ignored storage, verify permissions/pubkey before funding, and never use
   `--final`.
3. [x] Transfer program upgrade authority to Ledger `GkpX...YNtY`.
4. [x] Publish IDL on-chain; IDL authority set to Ledger `GkpX...YNtY`.
5. [x] Generate hot keypair, fund with 0.3 SOL, and set on-chain hot authority.
6. [x] Run `initialize` → `initialize_house_vault` → `initialize_singularity_vault`.
7. [x] Confirm Ledger remains program upgrade authority; program stays upgradeable.
8. [x] Fund house vault with `58,788 SKR`.
9. [ ] `solana-verify build && solana-verify upload` — verified build attestation.
10. [x] Deploy backend to Railway, set env vars, add Redis, point custom domain.
    Backend is live at `https://seek-backend-production-0134.up.railway.app`
    and `https://api.seek.mythx.art/api/health`; `/api/health/ready` passes
    RPC/program/Redis.
11. [x] Flip `mobile/src/config/index.ts` `NETWORK` → `'mainnet-beta'`.
12. [x] Build release APK with `SEEK_KEYSTORE_*` env vars; `apksigner verify` PASS.
13. [~] Sideload APK on Seeker, run full smoke test with real SKR. A normal
    negative-flow hardware smoke passed before the v1.0.2 upload; run a
    post-approval smoke from the store build when review completes.

---

## Phase D — Solana dApp Store submission (✅ LIVE; v1.0.2 ACCEPTED)

Per [dapp-store-publishing/README.md](../dapp-store-publishing/README.md):

1. [x] Create/verify Publisher Portal account, LLC/KYC/KYB/profile info,
   storage provider, and App NFT.
2. [x] Install/use `@solana-mobile/dapp-store-cli` through `npx`.
3. [x] Pass Publisher Portal API key via `--api-key-stdin` without printing it.
4. [x] `cd dapp-store-publishing && node check-assets.mjs`.
5. [x] Publish release APK with
   `dapp-store --apk-file ../mobile/android/app/build/outputs/apk/release/app-release.apk --keypair ../.secrets/dapp-store/publisher.json --whats-new "Fixes Seeker camera capture, passive SGT verification, AI validation reliability, and mission settlement flow."`.
6. [x] Release NFT minted and collection verified by portal-backed CLI.
7. [x] Wait 3-5 business days; iterate on review feedback.
8. [x] Submit next update for live-hardware fixes and upgrade-first economics.
   Backend deployment `a75a586a-448f-456b-9ed5-b4dd6827dc4c` is live; signed
   APK `mobile/android/app/build/outputs/apk/release/app-release.apk` is
   version `1.0.2` / versionCode `3`, SHA-256
   `eb3fc8b3559eea2ed0e1650b27ad9aaee82ac3cfb08cecf8de60bb131274cefd`.
   Portal-backed CLI submission passed on 2026-05-17 with idempotency key
   `seek-update-1.0.2-v3-20260517`.

Active v1.0.1 / versionCode `2` listing was submitted 2026-05-15 and is now
reported live by the user. Ticket ID `311418671831`; release mint
`ATChUKmCC4zzqj9g54etDd7bW5uLFtLsxj5Dib2kqzRe`; collection mint
`4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`.

v1.0.2 / versionCode `3` was accepted by Solana Mobile on 2026-05-17 by user
report. Ticket ID
`311747315429`; release mint
`2jKWGs79qJC2j8LTRfwER6fn4Taz35hymzTWMZvyTBXS`; collection mint
`4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`.

Sideloaded/debug package `app.seek.mobile` v1.0.3 / versionCode `4` was
uninstalled from the Seeker before the official unplugged store test.

Original v1.0.0 ticket `310370751180` was superseded after Solana Mobile
reported a backend ingest failure and approved the versionCode bump.

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
- [~] **B8-14** DEMO_MODE collapse + dead wallet code — `startDemoBounty`, `deductEntry`, demo branches in `BountyRevealScreen` removed. `getFullAddress` returns real wallet. **However:** `addWinnings`, `DEMO_TARGETS`, `DEMO_WALLET`, `DEMO_MODE.INITIAL_BALANCE` fallback, `useFallbackDemoBounty`, `isDemoMode` UI badge survived this pass and were not closed until B9 (2026-04-27). The original B8 claim of "complete" was wrong.
- [x] **B8-15** Single source of truth for tier constants — `mobile/src/types/index.ts` re-exports `TIERS` from `config/index.ts`. `AttestationPayload.type` narrowed to `'standard'`.

### Result
Backend `tsc --noEmit` clean. Contract `cargo check` + `cargo test` pass (1 unit test, 28 unrelated cfg warnings). Mobile typecheck clean apart from pre-existing `@sentry/react-native` types not yet installed. ~150 lines net deletion across the three layers.

---

## Phase B9 — Pre-mainnet re-audit + remediation (2026-04-27 — ✅ COMPLETE)

Independent re-audit (parallel sub-agents on contract / backend / mobile +
mission pool + economic-model alignment) found **15 new CRIT/HIGH items**
that B8 missed. All fixed in this pass.

### CRIT — fixed
- [x] **B9-1 `cancel_bounty` Submitted-state exploit** — accepted both `Pending` and `Submitted` with 1h grace. If backend stopped cranking `propose_resolution` for >1h (Anthropic outage, Helius outage, deploy gap), every Submitted bounty became refundable → 100% win rate during outage. Contract now requires `Pending` only; recovery for stuck Submitted bounties flows through dispute / admin path.
- [x] **B9-2 `initialize` permissionless** — bot watching mainnet mempool could front-run the legitimate Ledger init by 1 block and become `global_state.authority`. Added `EXPECTED_INITIAL_AUTHORITY` constant + `is_expected_initial_authority` constraint, gated behind `cfg(feature = "mainnet")`. Defaults to System Program pubkey (placeholder); constraint also rejects the placeholder so a forgotten edit fails fast at init time. **User action required: paste Ledger pubkey into `lib.rs` before mainnet build (see DEPLOY_MAINNET.md step 1).**
- [x] **B9-3 Redis fail-open on locks AND nonces** — when `REDIS_URL` was set but the client unavailable, locks became no-ops AND auth nonces could be replayed. Now fails closed in production: `redisAcquireLock` and `redisConsumeNonce` return `false` on Redis failure, callers get 503/401. Dev mode without `REDIS_URL` keeps in-memory fallback.
- [x] **B9-4 `types/index.ts` dotenv timing** — `process.env.SOLANA_NETWORK` was read at module load, defaulting to devnet (9 decimals → 1000× too-large amounts) if dotenv hadn't fired yet. Now reads from `config.solana.network` (post-dotenv).
- [x] **B9-5 SGT `cleanupExpiredNonces` module-load setInterval** — no shutdown hook, blocked SIGTERM force-exit. Refactored to `startSGTWorkers()` / `stopSGTWorkers()` wired into `index.ts` listen + shutdown.
- [x] **B9-6 Mobile demo code shipping in release** — `addWinnings` mutated UI balance independent of on-chain; `DEMO_TARGETS` array of fake hints, `DEMO_WALLET` keypair, `DEMO_MODE.INITIAL_BALANCE = 50000` fallback (real wallet with 0 SKR showed 50k SKR), `useFallbackDemoBounty`, `isDemoMode` UI badge — all bundled into the production APK. **Removed completely.** AppContext rewritten to MWA-only flow. `wallet.service.ts` collapsed to balance fetch + state mirror. `useWallet` hook (dead) deleted.

### HIGH — fixed
- [x] **B9-7 `revealMissionOnChain` + `proposeResolutionOnChain` no withTimeout** — stuck Solana RPC held the bounty lock for the full 120s TTL, blocking the player. Both now wrapped in `withTimeout(..., 30_000, label)`.
- [x] **B9-8 Finalizer drops bounty after 10 attempts with no Sentry alert** — bounty was permanently stuck on-chain with no signal to operator. Now `captureException` with `severity: 'critical'` + bounty PDA + player wallet for manual intervention.
- [x] **B9-9 SGT routes unrate-limited** — `/nonce` and `/verify` triggered Helius RPC calls per request. Added `sgtLimiter` (30/min/IP) at router level.
- [x] **B9-10 SKR routes unrate-limited + no input length cap** — `/lookup/:input` triggered mainnet RPC per request, no upper bound on input length. Added `skrLookupLimiter` (60/min/IP) and `MAX_LOOKUP_LENGTH = 64` rejection.
- [x] **B9-11 Sentry PII scrub gaps** — `x-wallet-address`, `x-wallet-message`, `x-wallet-timestamp` headers were not scrubbed; wallet pubkeys leaked through URL paths (`/api/bounty/player/:wallet`, `/api/sgt/status/:wallet`, `/api/skr/lookup/:input`); IP retained. Now scrubbed: all wallet headers, dynamic URL segments rewritten to `<wallet>`, `event.user.ip_address` cleared.

### Mission pool — calibration fixes (4 of 7 outliers patched, ~85% → ~90% calibrated)
- [x] **B9-12** Tightened `t1-005` "tree taller than two stories" → "deciduous tree with completely bare branches".
- [x] **B9-13** Tightened `t1-013` "cat outdoors" → "outdoor cat with collar + tag".
- [x] **B9-14** Tightened `t1-019` "sidewalk with cracks" → "sidewalk slab with crack running edge to edge".
- [x] **B9-15** Softened `t1-091` "ceiling fan blades spinning" (motion in still photo, AI ambiguous) → "ceiling fan with visible pull-chain".
- [x] **B9-16** Replaced `t3-014` "dog mid-air catching frisbee" (functional duplicate of `t3-006`) → "person playing chess at outdoor public chess table".

Remaining post-launch: ~3 more T1 trivials worth tightening (mowed lawn, closed garage, closed door) + per-mission win-rate tracking for retire/rewrite triggers (see § E8).

### dApp Store + deploy docs
- [x] `config.yaml:24` — added publisher wallet path and backup instructions using `.secrets/dapp-store/publisher.json` before publisher NFT mint.
- [x] `config.yaml:86` — testing instructions rewritten for mainnet (mainnet SKR, no demo mode).
- [x] **2026-05-01 dApp Store asset update** — config now points at required
  `banner.png` plus six screenshot slots; `assets/README.md` and
  `check-assets.mjs` encode official icon/banner/screenshot requirements.

### CI — green for the first time
- [x] **B9-17** Fixed Rust 1.82's `clippy::doc-lazy-continuation` errors at `lib.rs:197, 293` (reflowed multi-line size comments).
- [x] **B9-18** Regenerated `mobile/package-lock.json` to include `@sentry/react-native` family deps (lock was stale from Mar 3 vs package.json updated Apr 22).

### Result
- Contract: `cargo check --features mainnet` AND `--features devnet` both clean.
- Backend: `tsc --noEmit` clean.
- Mobile: `tsc --noEmit` clean (pre-existing SafeAreaView deprecation warnings only).
- Contract unit tests: 19/19 passing in <10ms.
- ~840 LoC + / ~2820 LoC − across 23 files (mostly mobile lock regeneration).

### Still gated on user
- Real Seeker hardware validation after the upgrade-first contract/backend/mobile
  changes: Wallet Adapter, passive Seeker Genesis Token, location-backed camera
  capture, funded-wallet hunt flow, immediate settlement behavior, and no public
  challenge/deposit action.
- Next dApp Store update submission only after hardware smoke passes, the exact
  store changelog is approved by the user, and the user explicitly approves
  Publisher upload.

---

## Phase E — Post-launch hardening (rolling, after first 2-4 weeks live)

Not on the critical path. Each unblocks future scale or raises the security bar.

### E1. Switchboard On-Demand VRF
**When:** Singularity pool > ~$50k USD (grinding ROI threshold).
**Cost:** ~0.002 SOL per VRF request (≈ per completion at launch volume).
**Scope:** split `finalize_bounty` into 3-instruction flow (propose → commit VRF → consume). Touches contract + backend finalizer.
**Effort:** ~3-4 hrs.

### E2. Full Anchor integration tests
**Scope:** accept → reveal → propose → finalize win + loss paths, dispute flow both outcomes, two-step authority rotation, cancel after grace, hot authority rotation.
**Blocker:** SKR_MINT const is compile-gated. Either (a) add a `test` feature that makes the mint pluggable, or (b) run tests against `solana-test-validator --clone <devnet SKR mint>`.
**Effort:** ~2-3 hrs.

### E3. Complete Redis migration (✅ 2026-05-01)
`activeBounties` and `bountyByPlayer` now persist to Redis with read-through
Map caches. Rate limiters can use Redis stores when `REDIS_URL` is set, and
`/prepare` enforces a per-wallet daily bounty cap in Redis. The remaining
in-memory lock Sets are process-local guards in front of Redis SETNX locks,
not the cross-instance source of truth.

### E4. Full pino migration
**Scope:** remaining ~65 `console.log`/`console.error` calls across services + routes.
**Effort:** ~30 min.

### E5. Cold signer ergonomics after launch
**Scope:** after launch, improve cold-admin ergonomics for repeat
operations (`fund_house`, `set_protocol_paused`, `withdraw_unreserved_house`,
`withdraw_singularity`, `set_hot_authority`, `set_treasury`,
`resolve_dispute`) and document the exact hardware-wallet ceremony.
**Effort:** TBD after first real-device Ledger launch run.

### E6. Seeker Camera SDK / TEE attestation
**When:** Solana Mobile ships the SDK (status unclear as of 2026-04-22).
**Scope:** wire real TEE attestation into `backend/src/services/attestation.service.ts` (placeholder already in place).

### E7. Features from the pitch deck
- [ ] Leaderboard + player stats (on-chain or via indexer)
- [ ] Mission pool expansion 300 → 1000+
- [ ] Community-submitted missions with staking
- [ ] GPS Super Hunts (partner-hosted, city-wide events)

### E8. Vault-protection mechanics (added 2026-04-23 post-B7)
The $1k launch vault makes per-entry variance the dominant risk. These
are not on the critical path but should land within the first month live.
- [x] **Active payout-liability reserve** — contract-level. `accept_bounty`
  reserves the full payout for every active bounty and rejects new entries
  if projected vault balance cannot cover all active bounties as wins. This is
  the primary no-uncovered-liability guard for viral launch traffic.
- [x] **Manual pause + liability-safe withdrawals** — contract-level.
  Cold authority can pause new entries, withdraw only unreserved house surplus,
  and withdraw Singularity funds only while paused with zero active bounties.
  Existing bounty resolution paths remain open while paused.
- [ ] **Tier gating by vault size** — optional stricter contract change. Disable tier 2 acceptance until `house_fund_balance > 200_000 SKR` (~$3.4k); disable tier 3 until > 500_000 SKR (~$8.5k). This matters because hard-tier wins draw down 5,000 SKR net from a small launch vault even after the payout reduction.
- [ ] **Automatic vault floor pause** — contract or backend gate. New `accept_bounty` calls reject when `house_fund_balance < 30_000 SKR` (~$510). Backend can enforce this in `/prepare` for v1; manual contract pause now exists, but auto-pause is still cleaner.
- [ ] **Per-wallet daily entry rate limit** — backend-side. Cap each wallet at e.g. 20 bounties/day to prevent a single attacker from draining via a streak before we notice. Track in Redis with `EXPIRE 86400`.
- [ ] **Per-mission completion-rate dashboard** — track `completions[missionId] / attempts[missionId]` in Redis or Postgres. Auto-flag any mission with > 30% completion rate over 50+ attempts for retirement.
- [ ] **Auto-throttle on completion-rate drift** — if 20-entry rolling completion rate > 25%, automatically tighten AI thresholds by +0.02 until it normalizes. Reset when stable.

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
- House vault balance (warn if < 50,000 SKR; critical if < 30,000 SKR)
- Singularity vault balance (informational)
- Mobile crash-free session rate
- Sentry new-issue rate

---

## Historical references

- [tasks/archive/security-audit-2026-02-27.md](archive/security-audit-2026-02-27.md) — Feb 2026 hackathon-era audit. Most findings now fixed; superseded by [audit-2026-04-22.md](audit-2026-04-22.md).
- [tasks/archive/real-device-demo-2026-02-27.md](archive/real-device-demo-2026-02-27.md) — hackathon device-demo setup. Superseded by production deploy runbook.
