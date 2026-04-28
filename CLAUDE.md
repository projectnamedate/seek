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
- `tasks/roadmap.md` — single source of truth for phases, blockers, deferred items (supersedes the archived mainnet-plan)
- `tasks/dapp-store-checklist.md` — dApp Store submission requirements + CLI flow
- `mobile/android/SIGNING.md` — release keystore generation + Gradle signing wiring

## $SKR token (CRITICAL — don't assume)
- Mainnet mint: `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`
- Decimals: **6** (NOT 9 — early contract assumed 9, fixed 2026-04-22)
- SKR is the **official Solana Mobile ecosystem token** (staking + governance). Not a Seek-owned token. User does not control the mint (mint authority is `FMNn5sor…`, owned by SMS program `SKRiHLt…`)
- Current price ~$0.017, total supply ~10.24B
- Tier 1 entry = 1000 SKR ≈ $17. **Launch house vault is intentionally small (~58k SKR ≈ $1000)** — economic model + missions tuned for ruin avoidance, not just positive EV.
- **Fees wallet** (protocol_treasury recipient, owns the SKR ATA that receives the 10% rake): `Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr` — **a separate Ledger from the cold authority**. Set at `initialize_singularity_vault` and rotatable post-init via `admin.ts set-treasury <new_pubkey>` (cold-authority signed).

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
- `FEES_WALLET=Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr` (only consumed by `initialize-protocol.ts` at init)
- `REDIS_URL` (Upstash recommended) + `SENTRY_DSN`

### Mobile
```bash
cd mobile
npx expo run:android                                              # dev build
cd android && ./gradlew assembleRelease                           # release APK (uses env-based signing)
```
Switch `NETWORK` in `mobile/src/config/index.ts` to swap mainnet/devnet ($SKR mint + decimals + challenge period all derive from it).

### Deploy targets
- Backend → Railway (Dockerfile at `backend/Dockerfile`, `backend/railway.json`). Add Upstash Redis addon. Custom domain on `api.seek.mythx.art` (user-owned). App is **Seeker-exclusive** via Solana Mobile dApp Store — no iOS, no general Play Store, no web build. See [memory/project_distribution.md](~/.claude/projects/-Users-hammer-Desktop-Claude-seek/memory/project_distribution.md).
- APK → Solana dApp Store via `npx @solana-mobile/dapp-store-cli` flow. See `tasks/dapp-store-checklist.md`.

## On-chain auth model (3 roles, 2 Ledgers + 1 hot keypair minimum)
- **Cold authority** (`GlobalState.authority`) — Ledger hardware wallet (Ledger #1). Signs: `fund_house`, `set_hot_authority`, `set_treasury`, `propose_authority_transfer`, `accept_authority_transfer`, `cancel_authority_transfer`, `resolve_dispute`. Two-step transfer prevents typo loss.
- **Fees wallet / protocol_treasury OWNER** (`GlobalState.protocol_treasury` = its SKR ATA) — separate Ledger #2 (`Fmv8H…Y9Hr`). Signs **nothing on-chain in the Seek protocol**, just receives 10% rake from each loss. **The rake is income**: user periodically swaps SKR → USDC on a DEX (Ledger-signed) and off-ramps to fiat. Operating expenses are NOT paid from this wallet. Rotatable via `admin.ts set-treasury` (cold-signed). The contract has no `withdraw_treasury` instruction — it was removed 2026-04-23 because under the FEES_WALLET-owned-ATA design the cold authority cannot authorize SPL transfers from FEES_WALLET's account; the Ledger spends directly via DEX.
- **Hot authority** (`GlobalState.hot_authority`) — Backend keypair in Railway env (NOT a Ledger). Signs ONLY: `reveal_mission`, `propose_resolution`. Compromise is contained (cannot drain treasury, cannot rotate any authority). Rotate via `set_hot_authority` (cold-signed).
- **Program upgrade authority** — Ledger (same as cold authority by default, or split into a third Ledger). Set via `solana program set-upgrade-authority`. Can be made `--final` to lock the program immutable forever.
- **House vault** (`GlobalState.house_vault`) — PDA token account, NOT an EOA. Win payouts are PDA-signed CPIs from the program; **no human signs payouts**. Cold authority can `fund_house` to add SKR but cannot withdraw — only the protocol's win-payout logic moves funds out. This is the "hot, auto-paying" behavior without exposing a hot key.
- User is solo operator — uses Ledger, not Squads multisig. Don't suggest multisig unless explicitly asked.
- **External audit skipped** — internal audit only. Don't re-propose unless contract surface changes materially.

## Economic model — NORTH STAR

**Player win rate target: 8-12% at launch. House edge: 35-45% per bet. Hard ceiling: 15%.** Launch vault is ~$1,000 — every economic decision serves ruin avoidance, not just positive EV. Once vault > $20k, target can relax to 15-18%.

Per-bounty P&L (1000 SKR tier 1 entry):
- Win: house pool pays 2000 SKR profit (player gets entry + 2x)
- Loss: 700 → house, 200 → jackpot, 100 → treasury (all kept by protocol)

At $1k vault (~58,824 SKR), a single tier-1 win = 3.4% of vault, tier-2 win = 6.8%, tier-3 win = 10.2%. Break-even is ~26% win rate; we run at <12% with margin.

| Win rate | House edge | Status at launch vault |
|---------:|-----------:|:-----------------------|
| 8% | +48% | safe target |
| 10% | +43% | safe target |
| 12% | +38% | acceptable |
| 15% | +29% | hard ceiling — alert |
| 18% | +18% | DANGER, throttle |
| 25% | +3% | break-even |

**Levers (tune any or all to hit target):**
1. Mission difficulty — ~20% of the 300-mission pool should be intentionally near-impossible within the tier timer. **Rewritten 2026-04-23 for $1k vault — every tier-1 mission now requires color/condition/context specificity.**
2. AI confidence thresholds (`backend/src/types/index.ts` `TIER_CONFIDENCE_THRESHOLDS`, **bumped 2026-04-23 from 0.80/0.85/0.90 → 0.88/0.92/0.95**).
3. Tier timers (180s/120s/60s — keep, already aggressive).
4. Screenshot + metadata strictness (already blocking outside dev).
5. Tier gating by vault size (POST-LAUNCH) — see roadmap § E8.

**Do NOT cite the pitch deck's "40% success rate" line** — that was marketing, not operational. Operationally we target 8-12% at launch.

See [memory/project_economic_model.md](~/.claude/projects/-Users-hammer-Desktop-Claude-seek/memory/project_economic_model.md) for full math + monitoring plan, and [tasks/roadmap.md § B7](tasks/roadmap.md) for the launch-blocker audit task.

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

## Current state (2026-04-23 — B8 audit complete)

**Authoritative roadmap:** [tasks/roadmap.md](tasks/roadmap.md).

**Done in Phase A (2026-04-22 hardening pass):**
- Contract: SKR mint + decimals feature-gated, 300s challenge, two-step + hot/cold auth, strengthened jackpot RNG, `get_tier_duration` returns Result, 19 client-side unit tests
- Backend: Claude 4.6 upgrade, Sentry + pino + request correlation, Redis-backed critical state + finalizer hydration, hot/cold keypair split with mainnet guard, /prepare rate limiter, magic-byte image validation, Claude prompt injection hardening, `/api/health/ready` probe, decimals-aware admin CLI with auth commands
- Mobile: release signing env vars, R8 + shrinkResources enabled, AndroidManifest hardened, network_security_config + data_extraction_rules, `seek://` deep-link scheme, @sentry/react-native JS init, NETWORK toggle drives cluster constants, `getFullAddress` bug fixed, dead demo wallet code removed
- Infra: Dockerfile + railway.json, GitHub Actions CI (typecheck backend + mobile, cargo check both features, cargo clippy, contract unit tests)
- Docs: audit, mainnet plan, dApp Store checklist + listing copy, deploy runbook, SIGNING guide, SENTRY guide, dapp-store-publishing scaffold, lessons updated, historical docs archived

**Done in Phase B7 (2026-04-23 mission/economic remediation):** 300 missions rewritten for $1k vault (every tier-1 requires color/condition/context specificity). AI thresholds bumped 0.80/0.85/0.90 → 0.88/0.92/0.95. Win-rate target lowered 15-18% → 8-12%.

**Done in Phase B8 (2026-04-23 comprehensive audit + remediation):** All 5 CRIT + 9 HIGH + 6 MED items closed. See [memory/project_b8_audit.md](~/.claude/projects/-Users-hammer-Desktop-Claude-seek/memory/project_b8_audit.md) and [tasks/roadmap.md § B8](tasks/roadmap.md). Highlights:
- **Auth:** `requireWalletAuth(operation)` wired to /prepare + /submit. `verifyTransaction` rewritten to parse on-chain tx + assert player/PDA/programId. Operation-bound message `seek:{op}:{wallet}:{ts}` + Redis SETNX nonce.
- **Contract:** `player_token_account` pinned to canonical ATA in 5 instructions. 24h `close_bounty` cooldown. `set_treasury` rotation added. Dead error variants removed.
- **Resilience:** All outbound calls (Anthropic/Helius/RPC) wrapped in `withTimeout`. In-memory locks → Redis. setIntervals refactored to `start*`/`stop*` workers wired into shutdown. Hot wallet SOL balance alert at <0.1 SOL.
- **Mobile:** NETWORK build-time assertion. bs58/formatTime/PDA dedupe. `TIERS` single source of truth.
- **Loss-rate fix:** New `expireAndResolveOldBounties()` worker calls `propose_resolution(false)` on stale Pending bounties — closes the cancel_bounty 1h-grace exploit.

**Done in Phase B9 (2026-04-27 pre-mainnet re-audit + remediation):** 15 new CRIT/HIGH items B8 missed. See [tasks/roadmap.md § B9](tasks/roadmap.md). Highlights:
- **Contract:** `cancel_bounty` Submitted-state exploit closed (was a backend SPOF — 1h outage = 100% win rate). `initialize` locked to `EXPECTED_INITIAL_AUTHORITY` (mainnet feature) — closes deploy-init front-run vector. **User must paste Ledger pubkey into lib.rs before mainnet build.**
- **Backend:** Redis fail-closed on locks AND nonces in production (was fail-open → silent auth replay during outages). `types/index.ts` reads from `config` (was module-load `process.env` → devnet default risk). `withTimeout` on `revealMissionOnChain` + `proposeResolutionOnChain`. SGT cleanup setInterval → start/stop pattern wired into shutdown. SGT + SKR routes rate-limited. Sentry PII scrub now covers wallet headers + URL paths + IP. Finalizer drops `captureException` with severity:critical when bounty stuck after 10 attempts.
- **Mobile:** Demo code stripped from release bundle — `addWinnings`, `DEMO_TARGETS`, `DEMO_WALLET`, `DEMO_MODE.INITIAL_BALANCE = 50000` fallback (a 0-SKR wallet showed 50k SKR), `isDemoMode` UI badge, `useFallbackDemoBounty`, `useWallet` dead hook. AppContext + wallet.service rewritten MWA-only.
- **Mission pool:** 5 outliers fixed (4 trivial-T1 tightenings + 1 dup replaced).
- **CI:** Green for the first time. Fixed Rust 1.82 doc-lint errors + regenerated mobile lock file (was stale Mar 3 vs package.json Apr 22).
- **dApp Store:** Publisher pubkey requirement documented in config.yaml. Testing instructions rewritten for mainnet (no devnet wording).

**Gated on user:**
- Release keystore generation (mobile/android/SIGNING.md)
- Production domain purchase + DNS → Railway
- Ledger pubkey share + ~5 SOL mainnet funding
- SKR holdings → house vault funding (~58k SKR ≈ $1000 at $0.017 — intentionally small, see economic-model section)
- Fees wallet (`Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr`) confirmed before init — rotatable post-init via `set_treasury` (cold-signed)
- Publisher wallet + 0.5 SOL for dApp Store NFT flow
- Screenshots + feature graphic for dApp Store listing

**Deferred post-launch** (see [tasks/roadmap.md](tasks/roadmap.md) § Phase E):
- Switchboard On-Demand VRF (when jackpot pool > ~$50k USD)
- Full Anchor integration tests (needs SKR_MINT runtime override or local-validator mint clone)
- Ledger signing wired into `admin.ts` + `initialize-protocol.ts`
- Seeker Camera SDK / TEE attestation (awaiting Solana Mobile)
- Leaderboard, mission pool expansion, community missions, GPS super hunts
