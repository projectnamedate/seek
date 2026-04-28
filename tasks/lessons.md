# Lessons Learned

## MWA (Mobile Wallet Adapter) — Critical Rules

### No back-to-back transact sessions
- Each `signMessage` and `signAndSendTransaction` opens a separate deep-link to Phantom
- Calling them sequentially causes the second to **hang silently** — Phantom never opens
- **Rule**: Only ONE MWA call per user action. If you need both auth signing and tx signing, either:
  - Remove auth from the endpoint (on-chain tx already proves ownership)
  - Use a single low-level `transact` session for both operations
- We removed `requireWalletAuth` from `/start` and `/submit` for this reason

### Post-deep-link network delay
- After Phantom returns control via deep-link, React Native's network stack needs ~1-2s to stabilize
- **Rule**: Add `await new Promise(r => setTimeout(r, 1500))` before making HTTP calls after MWA returns

## Auth Middleware Removal Checklist
When removing `requireWalletAuth` from a route, you MUST also update:
1. **Rate limiter `keyGenerator`** — it used `(req as any).verifiedWallet` which is now undefined
2. **Ownership checks** — any `bounty.playerWallet !== (req as any).verifiedWallet` will always fail (403)
3. **Auth window** — if pre-signing auth, increase `SIGNATURE_MAX_AGE_MS` to account for user approval time

## Express Behind Proxy/Tunnel
- Cloudflare tunnel / ngrok adds `X-Forwarded-For` headers
- Must set `app.set('trust proxy', 1)` or rate limiters crash with `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`
- Rate limiter `validate` should be `false` in dev to avoid IPv6 warnings
- **Always verify the tunnel port matches the backend port** (e.g., backend on 3001, not 3000)

## Release Build Testing
- `NGROK_URL` in `mobile/src/config/index.ts` must be updated every time a new tunnel is started
- Build with `npx expo run:android --variant release` for real device testing
- Backend auto-restarts via `ts-node-dev --respawn` — no manual restart needed after backend edits
- Mobile changes require a full rebuild

## Mainnet Readiness — Lessons from 2026-04-22 audit

### Token decimals are not universal
- Mainnet SKR (`SKRbvo6Gf…`) is **6 decimals**; the devnet test mint we used for the hackathon is 9. Anything that hardcodes `1_000_000_000` (10⁹) as the SKR multiplier breaks silently on mainnet — entry amounts become 1000× too large, payouts get rejected for insufficient vault balance.
- **Rule:** Never hardcode decimal multipliers for an external token. Either feature-gate (contract: `SKR_DECIMALS` const under `#[cfg(feature = "mainnet")]`), derive at runtime (backend: `getMint(connection, SKR_MINT).decimals`), or read from a shared config (mobile: `TOKEN.DECIMALS` sourced from the NETWORK toggle).
- **Watch:** `msg!` format divisors in Rust, `BN(amount * 1e9)` in TypeScript admin scripts, `ENTRY_AMOUNTS` in backend types, `TOKEN.DECIMALS` in mobile config, `formatSkr` helpers in backend + scripts. All of these had hardcoded 10⁹ in the hackathon build.

### Feature flags for cluster-specific consts are worth the ceremony
- Added `#[cfg(feature = "mainnet")]` / `#[cfg(feature = "devnet")]` gates on `SKR_MINT`, `SKR_DECIMALS`, `CHALLENGE_PERIOD`. Default = `mainnet`. Devnet build via `anchor build --no-default-features --features devnet`.
- Why it's worth it: a single-source binary that you can safely deploy to either cluster with a single flag. No accidental devnet-const-to-mainnet bleed.
- Adds ~20 LoC. Scales to additional per-cluster constants (e.g. future VRF queue addresses).

### Authority rotation is risk-concentrated — two-step + hot/cold split
- Prior contract had single-step `transfer_authority` — a typo = permanent protocol loss.
- Fix: `propose_authority_transfer` + `accept_authority_transfer` + `cancel_authority_transfer`. Pending state on `GlobalState.pending_authority`.
- Also split auth into two roles: **cold** (`authority` — Ledger, signs admin ops) vs **hot** (`hot_authority` — backend, signs only reveal + propose). Backend compromise can no longer drain treasury.
- Backend config enforces `HOT_AUTHORITY_PRIVATE_KEY` is set on mainnet (throws at load time otherwise).

### On-chain RNG on Solana is hard without VRF
- `(slot + timestamp) % 500` is publicly-predictable — any reader can grind for favorable slots before they're produced.
- `SlotHashes` sysvar only keeps 150 slots (~60s). Challenge-period-delayed finalize misses that window for any realistic mainnet challenge window (300s = 750 slots).
- Commit-reveal with player-committed entropy: only works if the player can't withhold the reveal step, which is always contestable.
- **Pragmatic v1:** strengthen by mixing entropy (`hash(mission_commitment || bounty_pda || slot || timestamp)`). Still grindable by current slot leader, but grinding requires matching a specific bounty's commitment + PDA, raising attack bar above launch jackpot sizes. Document upgrade to Switchboard On-Demand VRF once jackpot pool > $50k.
- **Rule:** Document the threat model + the jackpot-size trigger for the upgrade explicitly in code comments. A future maintainer needs to know WHY this is "fine for now" and what changes the threshold.

### In-memory state is a restart bomb
- All 7 Maps in the hackathon backend (`activeBounties`, `bountyByPlayer`, `missionSecrets`, `preparedBounties`, `walletLocks`, `bountyLocks`, `pendingFinalizations`) were lost on every restart.
- Most painful: `missionSecrets` — without them the backend can't call `reveal_mission` so the bounty can't finalize. Player's funds are stuck until the 1h grace period + `cancel_bounty`.
- **Rule:** Any state whose loss breaks UX must be in Redis (or equivalent). Add an explicit "what happens if this goes away?" thought experiment when adding a new Map.
- **Pattern used:** Redis as persistent truth, in-memory Map as read-through cache. Read falls back to Redis on miss; write goes to both.

### Android dApp Store has specific rejection landmines
- **Debug-signed APKs are auto-rejected.** New release keystore required (NOT your Play Store key — also rejected).
- **Cleartext traffic is flagged.** `android:usesCleartextTraffic="true"` or missing `network_security_config` → rejected. Ship HTTPS-only in release.
- **Over-permissioned manifests are flagged.** Remove `RECORD_AUDIO`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `allowBackup="true"`, etc. if not used.
- **Devnet programs for economic apps are rejected.** Submit must point to a mainnet program address.
- **Keystore loss = permanent lockout.** Multi-location backup mandatory (1Password team vault + offline USB + paper backup).

### Audit before you build
- This session spent ~25% of tokens on audit + research before touching code. That was the right call — turned up the SKR-is-6-decimals bug that would have broken mainnet entirely, and the mainnet-SKR-is-SMS-ecosystem-token realization that changes the economic model (real $$ from launch).
- **Rule:** For any "ready-for-mainnet" sweep, budget serious audit time before refactors. Surprises up front are cheap; surprises mid-deploy are not.

## Mainnet readiness — 2026-04-27 second-pass lessons

### Verify CI was actually green before claiming "CI green"
- Phase A's roadmap claimed "CI green" but the workflow had failed on every single push since it was added (7 consecutive red runs over 4 days). I never actually checked `gh run list`.
- **Rule:** A docs claim of "CI green" is only valid if you ran `gh run list --limit 5` against the workflow within the same commit. Otherwise write "CI runs on push" and don't say green.
- Two specific failures: Rust 1.82's stable lints now include `doc-lazy-continuation` (multi-line `///` after a list item is now an error under `-D warnings`); `npm ci` fails on lock-file/package-json drift even with `npm ci || npm install` fallback in some shell configs (regenerate lock pre-emptively).

### Sub-agent audits find what the previous audit missed
- A second-pass independent audit (parallel sub-agents, no memory of prior fixes) found 15 CRIT/HIGH items that the first audit (B8) missed despite claiming completeness — including a backend SPOF (cancel-on-Submitted) that would have let players reclaim entry whenever Anthropic had a multi-hour outage.
- **Rule:** Before mainnet, run a re-audit with a fresh agent and explicit instructions to "find what the previous audit missed, don't trust the previous audit's claims."
- Worked particularly well to give each sub-agent ONE layer (contract / backend / mobile) and a list of risk classes to look for, rather than a generic "audit this."

### Fail-closed for security state on Redis outage
- The B8 Redis migration treated "Redis client null" as "in-memory fallback" — fine in dev, but on production it meant locks became no-ops and auth nonces could be replayed during a Redis outage.
- **Rule:** If `REDIS_URL` is set, Redis is required. Helpers that gate security-critical state (locks, nonces) must `return false` on `null` client, not `return true`. Callers see a 503 / 401 instead of a silent bypass.
- Dev mode (no `REDIS_URL` set) keeps the in-memory fallback — only production fails closed.

### `process.env.X` at module load is a footgun behind dotenv
- `backend/src/types/index.ts` had `process.env.SOLANA_NETWORK` at line 7 — module-load time. If the file was imported before `dotenv.config()` ran (varies by Node import-graph traversal order), it defaulted to `'devnet'` → 9 decimals → 1000× off entry amounts.
- Railway pre-sets env vars before the process starts so this didn't bite there, but ts-node / local runs were at risk.
- **Rule:** No `process.env.X` reads at module-load. Always go through the validated `config` object — the only place `process.env` is read is `config/index.ts` after `dotenv.config()`.

### Demo code in production binaries is reverse-engineerable + UX-breaking
- Mobile shipped `addWinnings` (which mutated UI balance independent of on-chain), `DEMO_TARGETS` (an array of fake hints — players who reverse-engineered the APK got a hint pool), `DEMO_WALLET` (a keypair string in the binary), and `DEMO_MODE.INITIAL_BALANCE = 50000` (a real wallet with 0 SKR showed 50,000 SKR).
- The `addWinnings` one is the worst — pre-confirmation it credited the player +2000 SKR, then the on-chain balance fetch overwrote, creating a flicker that looked like funds disappearing.
- **Rule:** Demo state and demo-only code paths should never compile into release. Either delete them, or tree-shake-eliminate via a top-level `__DEV__` constant guard that bundlers can statically remove.
- **Rule:** Client-side balance is a CACHE of on-chain truth, never a source of truth. Don't optimistically update it — wait for the next on-chain fetch.

### `cancel_bounty` accepts only `Pending`, never `Submitted`
- The original design accepted both states with a 1h grace, intending to give players an escape hatch if the backend ever broke. But "the backend is broken" is exactly when the loss-rate guarantee disappears: every photo-submitted bounty becomes refundable, every photo becomes a free option.
- **Rule:** `cancel_bounty` (player-driven escape hatch) is only valid for the `Pending` state (no photo committed). After photo submit → `Submitted`, the bounty is on-rails to dispute or finalize. If the backend dies, recovery flows through admin or dispute, not through cancel.

### `initialize` is a one-shot — front-running risk on mainnet
- Permissionless `initialize` between `anchor deploy` and the first init tx is a real MEV target — anyone watching can become `global_state.authority` if their tx lands first.
- **Rule:** Mainnet `initialize` should be gated by a hardcoded pubkey constant (`EXPECTED_INITIAL_AUTHORITY`). Build feature flag toggles it on for mainnet, off for devnet. The constant defaults to `Pubkey::default()` (System Program) and the constraint also rejects that, so a forgotten edit fails fast at init time rather than silently allowing any caller.
- Cost is one source-edit before mainnet `anchor build` — well worth eliminating the front-run window.

### Verify before claim — never propagate "complete" / "green" without running it
This is the meta-lesson from the B8 → B9 cycle. The B8 audit memory said "all 20 items closed" four days before B9 found that 15 CRIT/HIGH items it didn't even check were still wide open AND that several it claimed to close were only partially fixed. Plus the roadmap said "CI green" without anyone actually running `gh run list`.

- **Never write "CI green" from memory.** Run `gh run list --limit 3` against the current commit. If the conclusion isn't `success`, don't claim green.
- **Never claim "X removed" without `grep`.** B8 claimed `addWinnings` and `DEMO_TARGETS` were stripped — neither was. A 5-second grep would have caught it.
- **Never trust prior audit memory blindly.** Memory entries are point-in-time snapshots, not live state. Before citing a memory's claim as fact, verify the cited file:line still exists and still has the claimed content. A 4-day-old "PASS" can be a 4-day-old lie.
- **Run a re-audit before any "ready to ship" milestone.** A second pass with a fresh agent (no memory of prior audits) finds what the first pass missed. Worked particularly well to give each sub-agent ONE layer (contract / backend / mobile) and a list of specific risk classes to check.
- **Make verification cheap.** A `check-seek` skill that runs `gh run list`, `cargo check`, `tsc --noEmit`, and `grep -rn` for known regressions in 30s removes the excuse for not verifying. It also surfaces drift between docs/memory and code at session start, before the drift compounds.

The cost of one missed verification compounds over days: B8's incorrect "complete" claims survived in memory for 4 days. B9's re-audit took ~3 hours but found 15 items that would have been exploited within a week of mainnet launch. The ratio of "verify cost" to "ignore-and-eat-the-tail-risk cost" is enormous when the tail is a $1k vault going to zero.
