# Seek Mainnet Execution Plan — 2026-04-22

6-phase plan. Phases 1–3 can overlap. Phases 4–5 are sequential and gated by user decisions.

## Time estimates (my-time, not wall-clock)

- Phase 1 (contract hardening): ~2 hours of implementation once decisions are made, plus VRF integration (~3 hours).
- Phase 2 (backend prod): ~2 hours for Redis + Sentry + model upgrade + rate tune. Deployment ~30 min.
- Phase 3 (mobile prod): ~1.5 hours keystore+signing+manifest+R8+Sentry+dead-code.
- Phase 4 (mainnet deploy): ~45 min once all above done. Mostly CLI commands.
- Phase 5 (dApp Store submit): ~1 hour for publisher NFT + release NFT + metadata + submit. Then 2-5 day wait.
- Phase 6 (external audit): 2-4 weeks wall-clock, mostly waiting.

Totals: roughly 10 hours of implementation + 2-4 weeks for external audit + 2-5 days for dApp Store review.

## Gate decisions needed from user before phases start

**Before Phase 1:**
- G1: VRF provider (Switchboard vs Orao) → recommend **Switchboard**
- G2: Challenge window duration → recommend **300s** (5 min), optional 600s

**Before Phase 2:**
- G3: Hosting (Railway vs Fly.io vs AWS) → recommend **Railway**
- G4: Persistence scope (Redis-only vs Redis+Postgres) → recommend **Redis-only at launch**
- G5: Split authority into hot/cold (requires contract change) → recommend **yes**

**Before Phase 3:**
- G6: Domain name (seek.app confirmed? alternative?)
- G7: App scheme for deep links (replace `exp+seek`)

**Before Phase 4:**
- G8: SKR mainnet mint — exists? Need to deploy? Supply?
- G9: Squads multisig signer set (2-of-3 or 2-of-4, which addresses)
- G10: House vault starter liquidity (1M / 10M / 100M SKR?)

**Before Phase 5:**
- G11: Publisher name / wallet for NFT
- G12: Age rating (recommend 18+)
- G13: Privacy policy + ToS URLs on public web

**Before Phase 6:**
- G14: External audit firm + budget ($25k-80k)

---

## PHASE 1 — Contract hardening

### 1.1 Fix C-1, C-3, C-4, M-3 (cheap fixes, no new deps)
Edit `contracts/programs/seek-protocol/src/lib.rs`:
- Line 9: swap to mainnet SKR mint (gated by `#[cfg(feature = "mainnet")]` ideal).
- Line 33: `CHALLENGE_PERIOD = 300`.
- Lines 48–55: replace default arm with `unreachable!()`.
- Add `pending_authority: Pubkey` to `GlobalState`, bump SIZE. Add `accept_authority` + `cancel_authority_transfer` instructions.
- Rebuild, test.

### 1.2 Integrate Switchboard VRF (C-2)
- Add `switchboard-on-demand = "..."` to `Cargo.toml`.
- Split `finalize_bounty` into two-phase: `request_jackpot_roll` queues VRF, `consume_jackpot_roll` is the callback that reads the VRF and executes payout + optional jackpot distribution.
- Backend `finalizer.service.ts` needs to call both.
- Test on devnet with Switchboard devnet queue.

### 1.3 (optional, depends on G5) Split authority
- Add `hot_authority: Pubkey` field on GlobalState. Use for `reveal_mission` + `propose_resolution`.
- Keep `authority` field for `withdraw_treasury`, `transfer_authority`, `resolve_dispute`, `fund_house`.
- Bump Bounty + GlobalState size.
- Add `set_hot_authority` instruction (authority-only).

### 1.4 Build + devnet redeploy
- `anchor build`
- `anchor deploy --provider.cluster devnet` (upgrades existing devnet program)
- Re-init if schema changed (this is destructive; plan migration)

### 1.5 Anchor tests
- Add integration tests for: accept_authority flow, VRF request/consume, split-authority path (if G5=yes), expired cancel.
- Must cover: player disputes a loss, authority resolves player wins, stake refunded + entry refunded.

---

## PHASE 2 — Backend production hardening

### 2.1 Simple cleanups (no new deps)
- `ai.service.ts:148` → `claude-sonnet-4-6-20251001`
- `bounty.routes.ts:446-576` → move demo routes to `routes/demo.routes.ts`, only mount in dev
- `index.ts:41-49` → bump global limit to 300/15min

### 2.2 Redis migration (H-1, H-4)
- Add `ioredis` + `@upstash/redis` dep.
- Create `services/redis.service.ts` with helpers: `setBounty`, `getBounty`, `setMissionSecrets`, `acquireLock` (SETNX+PX), `addToFinalizerQueue` (ZADD), `pollReadyFinalizations` (ZRANGEBYSCORE).
- Migrate `bounty.service.ts` and `finalizer.service.ts` to call Redis instead of in-memory Maps.
- Keep in-memory read-through cache for hot paths (optional, later).
- Upstash free tier: 10k commands/day — plenty.

### 2.3 Sentry
- `npm i @sentry/node`
- `index.ts`: `Sentry.init(...)` + `Sentry.Handlers.requestHandler()` + `errorHandler()`.
- Tag events with request ID middleware.

### 2.4 Split authority env (H-2, depends on G5)
- If contract has hot_authority: add `HOT_AUTHORITY_PRIVATE_KEY` env var.
- `solana.service.ts` reveals+proposes with hot keypair, withdraws+disputes with authority keypair.
- Production: hot keypair loaded from Railway secrets; authority keypair is the cold / Squads address (tx has to be countersigned via Squads).

### 2.5 Railway deploy
- `railway up` after connecting GitHub repo.
- Set env vars: SOLANA_RPC_URL (Helius mainnet), SOLANA_NETWORK, AUTHORITY_PRIVATE_KEY / HOT_AUTHORITY_PRIVATE_KEY, SEEK_PROGRAM_ID (mainnet), SKR_MINT (mainnet), ANTHROPIC_API_KEY, HELIUS_API_KEY, SGT_BONUS_CONFIDENCE_REDUCTION, SENTRY_DSN, REDIS_URL.
- Add custom domain (e.g. api.seek.app or seekapi.xyz), DNS CNAME to Railway, wait for SSL.

### 2.6 Smoke test
- curl `/api/health` from public URL (HTTPS).
- Drive a full bounty flow end-to-end against devnet program.
- Watch Sentry + Railway logs.

---

## PHASE 3 — Mobile production hardening

### 3.1 Dead code + config
- Delete demo wallet functions from `mobile/src/services/wallet.service.ts`.
- Update `mobile/src/config/index.ts`:
  - `TOKEN.MINT` → mainnet
  - `GAME_CONFIG.CHALLENGE_PERIOD = 300`
  - `API_CONFIG.PROD_URL` → real URL
  - `NGROK_URL = null` (prod doesn't use)
  - Optional: compile-time build variant so debug uses tunnel URL, release uses PROD_URL.

### 3.2 AndroidManifest hardening
- Remove `usesCleartextTraffic`, `allowBackup`, `requestLegacyExternalStorage`.
- Remove unused permissions: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `SYSTEM_ALERT_WINDOW`, `WRITE_EXTERNAL_STORAGE`, `READ_EXTERNAL_STORAGE`, `READ_MEDIA_AUDIO`, `READ_MEDIA_VIDEO`.
- Keep: `CAMERA`, `INTERNET`, `VIBRATE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VISUAL_USER_SELECTED`.
- Replace `exp+seek` scheme with production app scheme (e.g. `seek://`).

### 3.3 R8/Proguard + minification
- `android/gradle.properties` → `android.enableMinifyInReleaseBuilds=true`.
- Add `proguard-rules.pro` with keep rules for React Native, Expo modules, `@solana/web3.js`, `@wallet-ui`, `tweetnacl`.
- Build release APK: `cd mobile/android && ./gradlew assembleRelease`.
- Run on Seeker device to catch any minification-caused crashes.

### 3.4 Release keystore
- `keytool -genkeypair -v -keystore seek-release.keystore -alias seek -keyalg RSA -keysize 2048 -validity 10000`
- Store passphrase + keystore in 1Password (or equivalent). Print paper backup.
- Wire Gradle signingConfigs.release to pull from env vars.
- Build release APK with `SEEK_KEYSTORE_PASSWORD=... SEEK_KEY_PASSWORD=... ./gradlew assembleRelease`.

### 3.5 Sentry React Native
- `npm i @sentry/react-native`
- `npx sentry-wizard -i reactNative` (wires both iOS + Android).
- Init in `App.tsx` or `index.ts`.
- Configure sourcemap upload in build.gradle.

### 3.6 App icon + splash + store assets
- High-res app icon (1024×1024 source, all sizes auto-generated via Expo).
- Splash screen (already exists — verify).
- 4-6 screenshots at Seeker native resolution (probably 1080×2400 or similar).
- Feature graphic (1200×630 or per dApp Store spec).

### 3.7 APK build + sideload test
- Clean release APK.
- `adb install` on Seeker.
- Full smoke: connect wallet, check balance, prepare, accept, photo, submit, watch on-chain tx, win/loss ceremony.

---

## PHASE 4 — Mainnet deploy

### 4.1 Token readiness
- Confirm mainnet SKR mint + metadata + supply.
- If deploying fresh: `spl-token create-token --decimals 9` → `spl-token mint` to treasury → attach Metaplex Token Metadata (name "Seek", symbol "SKR", URI pointing to JSON on Arweave/IPFS with image).

### 4.2 Program deploy
- `anchor build` (with mainnet feature flag if using cfg)
- `solana config set --url mainnet-beta`
- `anchor deploy --provider.cluster mainnet` — costs ~3-4 SOL.
- `anchor idl init` — publish IDL.
- `solana-verify build` + `solana-verify upload` — verified build.

### 4.3 Protocol init
- Run `initialize` → `initialize_house_vault` → `initialize_singularity_vault` (already supported as 3-step).
- Transfer SKR from treasury to house_vault PDA (user-decided starter amount).
- Set initial `protocol_treasury` as Squads-owned token account.

### 4.4 Multisig transfers
- Deploy Squads v4 multisig (2-of-3 from founder wallets).
- Transfer program upgrade authority to Squads Vault: `solana program set-upgrade-authority ...` (Safe Authority Transfer through Squads UI).
- Transfer GlobalState.authority to Squads (via `transfer_authority` new instruction — if split-auth enabled, this is cold authority).

### 4.5 Hot authority config
- If split-auth enabled: generate new hot keypair, run `set_hot_authority`, load into Railway env.

### 4.6 End-to-end mainnet test
- Mint 5000 SKR to a test wallet.
- Play one bounty on mainnet. Confirm everything works with real money.

---

## PHASE 5 — Solana dApp Store

### 5.1 Install CLI + publisher setup
- `npm i -g @solana-mobile/dapp-store-cli`
- `npx dapp-store init` → generate `config.yaml` scaffold.
- Fund publisher wallet with ~0.5 SOL.
- `npx dapp-store create publisher` — mints publisher NFT (one-time).

### 5.2 Configure app metadata
- Edit `config.yaml`: app name "Seek", package `app.seek.mobile`, version codes, description (short + long), category, age rating, URLs, screenshots, icon.
- Point to release APK path.

### 5.3 Submit
- `npx dapp-store create app` — mints app NFT.
- `npx dapp-store create release` — uploads APK + assets to Arweave, mints release NFT.
- `npx dapp-store publish submit --requestor-is-authorized --complies-with-solana-dapp-store-policies`

### 5.4 Wait + respond to review
- 2-5 business days. Email to publisher address.
- Iterate on feedback if any.

---

## PHASE 6 — External audit (can overlap with Phase 5 for post-launch coverage)

### 6.1 Scope + engage
- RFP to Neodyme, OtterSec, Accretion, Halborn.
- Scope: contracts/programs/seek-protocol. 1700 lines. ~1-2 week audit.
- Budget: $25k (Accretion low end) to $80k (Halborn high end).

### 6.2 Respond to findings
- Patch findings, get re-verification.
- Publish audit report publicly as trust signal.

---

## ROLLBACK PLANS

- **Program deploy bad:** `anchor upgrade` with buffer → only if upgrade authority is still your keypair (pre-Squads transfer). After Squads transfer, requires multisig vote.
- **Backend deploy bad:** Railway rollback to previous deploy (one click).
- **Mobile release bad:** users keep old APK until updated; next release NFT supersedes.
- **Dispute flow broken:** temporarily extend challenge_period via a new instruction? Not possible without program upgrade. Ensure dispute is stress-tested before mainnet.

## OBSERVABILITY KPIs (set up in Sentry/Railway dashboards)

- `/api/bounty/prepare` p50/p99 latency
- `/api/bounty/start` error rate
- AI validation latency (Claude Vision call)
- Finalizer queue depth (alarm at >50)
- On-chain tx failure rate
- House vault balance (alarm if < 100k SKR)
- Singularity vault balance (informational)
- Crash-free session rate on mobile
