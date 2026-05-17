# Seek

Real-world scavenger hunts with on-chain SKR rewards. Complete missions by finding physical targets, capturing proof, and settling results on Solana Seeker.

## How It Works

1. **Select Tier** - Choose your challenge level (1000/3000/5000 $SKR)
2. **Accept Bounty** - Wallet approves entry, you get a random target
3. **Hunt** - Find the object in the real world before time runs out
4. **Capture** - Take a photo with your camera
5. **Validate** - AI verifies your photo is legit
6. **Complete/Miss** - Earn a completion reward or miss the mission window

## The Three Tiers

| Tier | Entry | Time | Difficulty | Example Bounties |
|------|-------|------|------------|------------------|
| 1 | 1000 $SKR | 3 min | Easy | Public bench, doorway number, transit stop sign |
| 2 | 3000 $SKR | 2 min | Medium | Route map beside ticket machine, shelf price label |
| 3 | 5000 $SKR | 1 min | Hard | Park map plus bench plus bin, station concourse combo |

## Economics

**Bounty Completed (8–12% target completion rate at launch):**
- Get 2x total return: your entry back plus 1x net profit
- Eligible completions can receive the Singularity bonus pool

**Bounty Failed:**
- 70% stays in house vault (funds future rewards)
- 20% goes to the Singularity bonus pool
- 10% protocol treasury

## Tech Stack

- **Smart Contract**: Solana/Anchor (Rust)
- **Backend**: Node.js + Express + TypeScript
- **AI Validation**: Claude (Anthropic)
- **Mobile**: React Native + Expo + Solana Mobile Stack
- **Token**: $SKR (SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3)

## Project Structure

```
seek/
├── contracts/              # Solana smart contracts
│   ├── programs/
│   │   └── seek-protocol/
│   │       └── src/
│   │           └── lib.rs
│   ├── Anchor.toml
│   └── Cargo.toml
├── backend/                # Node.js API server
│   └── src/
│       ├── config/         # Environment configuration
│       ├── data/           # Mission pool (600 bounties)
│       ├── routes/         # API endpoints
│       ├── services/       # Business logic
│       │   ├── ai.service.ts       # Claude Vision validation
│       │   ├── bounty.service.ts   # Bounty management
│       │   ├── exif.service.ts     # Photo metadata
│       │   └── solana.service.ts   # Blockchain interaction
│       ├── types/          # TypeScript definitions
│       └── index.ts        # Express server
└── mobile/                 # React Native + Expo app
    └── src/
        ├── components/     # Reusable UI components
        ├── context/        # Global state management
        ├── hooks/          # Custom React hooks
        ├── navigation/     # React Navigation setup
        ├── screens/        # App screens
        ├── services/       # API & wallet services
        ├── theme/          # Design system
        ├── types/          # TypeScript definitions
        └── utils/          # Helper functions
```

## Smart Contract Features

- Variable entry validation (1000/3000/5000 SKR only)
- 2x total return on success (entry returned + 1x profit from house vault)
- Automatic 70/20/10 distribution on failure
- Singularity bonus pool for eligible completions
- Commit-reveal mission assignment (SHA-256 + random salt)
- Player cancel after expiry + grace period (reclaim stuck funds)
- Legacy dispute/admin review instructions retained for compatibility; public
  dispute entry is disabled in the app and backend for the current release
- Two-step authority rotation via `propose_authority_transfer` + `accept_authority_transfer`
- Active payout-liability reserve before accepting new hunts
- Cold-Ledger pause/resume plus liability-safe admin withdrawals
- Bounty account closing to reclaim rent
- PDA-based account management
- Event emission for real-time tracking

## Backend API

**On-Chain Flow:**
- `POST /api/bounty/prepare` - Prepare bounty (generates commitment, returns tx data)
- `POST /api/bounty/start` - Start hunt (after MWA signs accept_bounty on-chain)
- `POST /api/bounty/submit` - Submit photo for AI validation + on-chain resolve
- `GET /api/bounty/:id` - Get bounty status
- `GET /api/bounty/player/:wallet` - Get player's active bounty
- `GET /api/health` - Health check
- `GET /api/health/stats` - Protocol statistics

**Photo Validation:**
1. EXIF metadata extraction (timestamp, GPS, device)
2. Screenshot detection (no GPS + no device = reject)
3. Timestamp validation (max 5 min old)
4. Claude Vision object detection with confidence scoring
5. Tier-specific confidence thresholds: 88% / 92% / 95%

## Anti-Cheat

- **Seeker Genesis Token (SGT)** — SIWS verification via Helius DAS API, "VERIFIED SEEKER" badge
- **Camera Attestation** — SHA-256 photo hash + device fingerprint, TEE-ready for Seeker Camera SDK
- **AI Screenshot Detection** — Claude rejects photos without valid EXIF/GPS metadata

## On-Chain Integration

The app runs fully on-chain. Production is mainnet-beta by default; devnet is
available only through the explicit devnet build/config path:

1. Mobile calls `/prepare` → backend generates commitment + returns account addresses
2. Mobile builds `accept_bounty` instruction → Seeker Wallet signs through Mobile Wallet Adapter
3. `/start` verifies the on-chain transaction → hunt begins with timer
4. Player finds target, takes photo → `/submit` with AI validation
5. Backend reveals the mission, proposes the result, then the finalizer cranks
   `finalize_bounty` immediately while public disputes are disabled → tokens transferred

**Mainnet deploy status:** the program is deployed and initialized at
`DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v`; it remains upgradeable under
the cold Ledger. Never deploy with `--final`. See
[`backend/scripts/DEPLOY_MAINNET.md`](backend/scripts/DEPLOY_MAINNET.md).

```bash
# 1. Start backend
cd backend
cp .env.example .env    # Set ANTHROPIC_API_KEY
npm install && npm run dev

# 2. Start Cloudflare tunnel (for real device testing)
cloudflared tunnel --url http://localhost:3001
# Copy the https://...trycloudflare.com URL

# 3. Update mobile config with tunnel URL
# Edit mobile/src/config/index.ts → set NGROK_URL to the tunnel URL

# 4. Build and run on Android
cd mobile
npm install
npx expo run:android    # Phone connected via USB

# 5. For wireless testing: unplug USB, app works over cellular
```

**Admin CLI** for devnet/local player setup:
```bash
cd backend
npx ts-node scripts/admin.ts mint <wallet-address> 50000   # Give SKR tokens
npx ts-node scripts/admin.ts airdrop <wallet-address> 2    # Give SOL for fees
```

## Development

```bash
# Smart Contracts
cd contracts
anchor build

# Backend
cd backend
cp .env.example .env  # Configure environment
npm install
npm run dev           # Start development server

# Mobile
cd mobile
npm install
npx expo start        # Start Expo development server
```

## Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
HOT_AUTHORITY_PRIVATE_KEY=your_hot_backend_keypair
REDIS_URL=rediss://...

# Program
SEEK_PROGRAM_ID=<mainnet_program_id_after_deploy>
SKR_MINT=SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3

# Claude API (get from https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-your-api-key
```

## Security

Full audit trail in [`tasks/audit-2026-04-22.md`](tasks/audit-2026-04-22.md)
(mainnet readiness) and
[`tasks/archive/security-audit-2026-02-27.md`](tasks/archive/security-audit-2026-02-27.md)
(historical hackathon audit).

**Hardening implemented as of 2026-04-22:**
- [x] Commit-reveal mission assignment (prevents front-running)
- [x] Two-step authority transfer (propose → accept, prevents typo-induced loss)
- [x] Hot/cold authority split (backend-held `hot_authority` scoped to reveal + propose only; cold `authority` for admin ops + treasury)
- [x] Public disputes disabled for launch; optimistic results finalize immediately
  once proposed
- [x] Player `cancel_bounty` after expiry + 1h grace period
- [x] Legacy dispute/admin accounting retained for compatibility, not exposed in
  the public app
- [x] Bounty account closing (rent reclaim)
- [x] Actual vault balance checks (not tracked balance)
- [x] Strengthened Singularity bonus RNG (`hash(mission_commitment || bounty_pda || slot || ts) % 500`)
- [x] Feature-gated SKR mint + decimals (mainnet 6 / devnet 9) — no accidental constant bleed
- [x] Per-IP rate limiting on `/prepare`, `/start`, `/submit`
- [x] Magic-byte image validation + Claude Vision prompt-injection resistance
- [x] Wallet ownership validation + on-chain transaction verification in `/start`
- [x] Race condition locks (per-wallet + per-bounty mutex, Redis-backed)
- [x] Redis-persisted mission secrets + prepared bounties + finalizer queue (survive backend restart)
- [x] Sentry error tracking + pino structured logging with request-ID correlation
- [x] HTTPS-only Android release builds, hardened manifest, R8 minification

## Roadmap

Authoritative roadmap at [`tasks/roadmap.md`](tasks/roadmap.md) — tracks:
- Phase A (complete) — hardening pass landed in 12 commits on 2026-04-22
- Phase B (blocked on user) — release keystore, domain, Ledger, SKR holdings, publisher wallet, visual assets
- Phase C — mainnet deploy runbook: [`backend/scripts/DEPLOY_MAINNET.md`](backend/scripts/DEPLOY_MAINNET.md)
- Phase D — dApp Store submission: [`dapp-store-publishing/README.md`](dapp-store-publishing/README.md)
- Phase E (post-launch) — Switchboard VRF, full integration tests, horizontal scale, Seeker Camera SDK, leaderboard, mission pool expansion, GPS super hunts

## License

MIT
