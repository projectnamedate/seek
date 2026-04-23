## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

# Seek — Project Reference

## What this is
Pokemon-GO for crypto on Solana Seeker. Players stake $SKR (1000/2000/3000 per tier), get a random real-world target, photograph it, AI (Claude Vision) validates, 2x profit on win, 70/20/10 loss split, 1-in-500 jackpot on each win. Won Solana Mobile Monolith 2026 hackathon (Feb 2026). Preparing for mainnet + Solana dApp Store.

## Stack map
- `contracts/programs/seek-protocol/src/lib.rs` — Anchor Rust program (~1800 lines, 16 instructions)
- `backend/src/` — Node + Express + TypeScript (~4000 lines). Orchestrates AI validation, commit-reveal, on-chain reveal/propose/finalize
- `mobile/src/` — React Native + Expo (~6400 lines). MWA-first wallet integration
- `tasks/audit-2026-04-22.md` — latest mainnet-readiness audit. Read this first for known issues
- `tasks/mainnet-plan.md` — 6-phase execution plan with gate decisions
- `tasks/dapp-store-checklist.md` — dApp Store submission requirements + CLI flow
- `mobile/android/SIGNING.md` — release keystore generation + Gradle signing wiring

## $SKR token (CRITICAL — don't assume)
- Mainnet mint: `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`
- Decimals: **6** (NOT 9 — early contract assumed 9, fixed 2026-04-22)
- SKR is the **official Solana Mobile ecosystem token** (staking + governance). Not a Seek-owned token. User does not control the mint (mint authority is `FMNn5sor…`, owned by SMS program `SKRiHLt…`)
- Current price ~$0.017, total supply ~10.24B
- Tier 1 entry = 1000 SKR ≈ $17. House vault needs real $$ — 10M SKR starter ≈ $170k

## Build commands

### Contract (Anchor 0.32 CLI / 0.30.1 lib)
```bash
cd contracts
anchor build                                                      # mainnet (default)
anchor build --no-default-features --features devnet              # devnet
anchor deploy --provider.cluster mainnet                          # DESTRUCTIVE
anchor deploy --provider.cluster devnet
```
Feature flags gate SKR_MINT, SKR_DECIMALS, CHALLENGE_PERIOD (mainnet 300s / devnet 10s). Entry amounts derive from `DECIMALS_MULTIPLIER`.

### Backend
```bash
cd backend
npm run dev                    # ts-node-dev, watches + respawns
npm run build && npm start     # production (compile then run dist/)
npx tsc --noEmit               # typecheck only
```

Required env on mainnet (see `backend/.env.example`):
- `SOLANA_NETWORK=mainnet-beta` + `SOLANA_RPC_URL` (Helius/QuickNode)
- `AUTHORITY_PRIVATE_KEY` (COLD — Ledger-backed; used only for admin ops)
- `HOT_AUTHORITY_PRIVATE_KEY` (hot — backend-held; reveal + propose only). Config throws if missing on mainnet.
- `SKR_MINT=SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`
- `REDIS_URL` (Upstash recommended) + `SENTRY_DSN`

### Mobile
```bash
cd mobile
npx expo run:android                                              # dev build
cd android && ./gradlew assembleRelease                           # release APK (uses env-based signing)
```
Switch `NETWORK` in `mobile/src/config/index.ts` to swap mainnet/devnet ($SKR mint + decimals + challenge period all derive from it).

### Deploy targets
- Backend → Railway (Dockerfile at `backend/Dockerfile`, `backend/railway.json`). Add Upstash Redis addon. Custom domain on `seek.app`.
- APK → Solana dApp Store via `npx @solana-mobile/dapp-store-cli` flow. See `tasks/dapp-store-checklist.md`.

## On-chain auth model (hot/cold split)
- **Cold authority** (`GlobalState.authority`) — Ledger hardware wallet. Signs: `withdraw_treasury`, `fund_house`, `set_hot_authority`, `propose_authority_transfer`, `resolve_dispute`, `cancel_authority_transfer`. Two-step transfer (`propose_authority_transfer` + `accept_authority_transfer`) prevents typo loss.
- **Hot authority** (`GlobalState.hot_authority`) — Backend-held keypair in Railway env. Signs ONLY: `reveal_mission`, `propose_resolution`. Compromise is contained (cannot drain treasury or rotate authority). Rotate via `set_hot_authority` (cold-signed).
- User is solo operator — uses Ledger, not Squads multisig. Don't suggest multisig unless explicitly asked.
- **External audit skipped** — internal audit only. Don't re-propose unless contract surface changes materially.

## Key architectural invariants
- **Commit-reveal missions**: Mission ID + 32-byte salt committed at `accept_bounty`, revealed at `reveal_mission` (after photo submit). Prevents mission front-running.
- **Optimistic resolve + dispute window**: `propose_resolution` → 300s challenge period → `finalize_bounty`. Player can `dispute_bounty` during challenge (stake 50% of entry) → `resolve_dispute` (cold-signed).
- **Jackpot RNG** (v1): strengthened entropy = `hash(mission_commitment || bounty_pda || slot || timestamp) % 500`. Still grindable by a slot leader with low ROI at launch jackpot sizes. **Task #3 upgrade to Switchboard On-Demand VRF when jackpot pool > $50k.**
- **finalize_bounty is permissionless** — anyone can crank once challenge period ends. Backend finalizer worker (`backend/src/services/finalizer.service.ts`) does this on a poll loop (`POLL_INTERVAL` = challenge_period/5, min 2s).
- **Redis is the source of truth** for mission secrets, prepared bounties, finalizer queue. In-memory Maps are a cache + fallback for dev. On restart, finalizer hydrates from Redis. `REDIS_URL` unset = in-memory only (dev only).

## Known gotchas
- **MWA back-to-back transact hangs Phantom** — only ONE MWA call per user action. Insert `await new Promise(r => setTimeout(r, 1500))` after Phantom returns via deep-link before making HTTP calls. See `tasks/lessons.md`.
- **SKR decimals = 6, not 9**. Anything computing or displaying SKR amounts must use `DECIMALS_MULTIPLIER` (contract) or `TOKEN.DECIMALS` (mobile). Logs use `value / DECIMALS_MULTIPLIER` to print whole SKR.
- **Challenge period config must match on-chain** — contract const + backend `config.protocol.challengePeriodSeconds` + mobile `GAME_CONFIG.CHALLENGE_PERIOD` must all agree. Currently driven by feature flag / `NETWORK` toggle.
- **Trust proxy** — `app.set('trust proxy', 1)` is required behind Cloudflare tunnel / Railway. Rate limiters crash without it.
- **Release APK signing**: dApp Store rejects debug-signed APKs. Use `mobile/android/SIGNING.md` flow. Lost keystore = permanently locked out of updates.

## Current state (2026-04-22 mainnet-readiness snapshot)

**Authoritative roadmap:** [tasks/roadmap.md](tasks/roadmap.md).

**Done in this hardening pass:**
- Contract: SKR mint + decimals feature-gated, 300s challenge, two-step + hot/cold auth, strengthened jackpot RNG, `get_tier_duration` returns Result, 19 client-side unit tests
- Backend: Claude 4.6 upgrade, Sentry + pino + request correlation, Redis-backed critical state + finalizer hydration, hot/cold keypair split with mainnet guard, /prepare rate limiter, magic-byte image validation, Claude prompt injection hardening, `/api/health/ready` probe, decimals-aware admin CLI with auth commands
- Mobile: release signing env vars, R8 + shrinkResources enabled, AndroidManifest hardened, network_security_config + data_extraction_rules, `seek://` deep-link scheme, @sentry/react-native JS init, NETWORK toggle drives cluster constants, `getFullAddress` bug fixed, dead demo wallet code removed
- Infra: Dockerfile + railway.json, GitHub Actions CI (typecheck backend + mobile, cargo check both features, cargo clippy, contract unit tests)
- Docs: audit, mainnet plan, dApp Store checklist + listing copy, deploy runbook, SIGNING guide, SENTRY guide, dapp-store-publishing scaffold, lessons updated, historical docs archived

**Gated on user:**
- Release keystore generation (mobile/android/SIGNING.md)
- Production domain purchase + DNS → Railway
- Ledger pubkey share + ~5 SOL mainnet funding
- SKR holdings → house vault funding (10M SKR ≈ $170k at $0.017)
- Publisher wallet + 0.5 SOL for dApp Store NFT flow
- Screenshots + feature graphic for dApp Store listing

**Deferred post-launch** (see [tasks/roadmap.md](tasks/roadmap.md) § Phase E):
- Switchboard On-Demand VRF (when jackpot pool > ~$50k USD)
- Full Anchor integration tests (needs SKR_MINT runtime override or local-validator mint clone)
- Remaining Redis migration for `activeBounties`/locks
- Full pino migration across remaining service/route files
- Ledger signing wired into `admin.ts` + `initialize-protocol.ts`
- Seeker Camera SDK / TEE attestation (awaiting Solana Mobile)
- Leaderboard, mission pool expansion, community missions, GPS super hunts
