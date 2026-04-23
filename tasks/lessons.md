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
