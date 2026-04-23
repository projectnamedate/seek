# Seek

Pokemon GO for crypto. Enter bounties with $SKR, find real-world objects, earn 2x your entry. Built for the Solana Seeker phone.

## How It Works

1. **Select Tier** - Choose your challenge level (1000/2000/3000 $SKR)
2. **Accept Bounty** - Wallet approves entry, you get a random target
3. **Hunt** - Find the object in the real world before time runs out
4. **Capture** - Take a photo with your camera
5. **Validate** - AI verifies your photo is legit
6. **Complete/Fail** - Earn 2x your entry or entry forfeited

## The Three Tiers

| Tier | Entry | Time | Difficulty | Example Bounties |
|------|-------|------|------------|------------------|
| 1 | 1000 $SKR | 3 min | Easy | Fire hydrant, blue car, dog |
| 2 | 2000 $SKR | 2 min | Medium | Starbucks cup, golden retriever |
| 3 | 3000 $SKR | 1 min | Hard | Dog jumping, person on bicycle |

## Economics

**Bounty Completed (~40% success rate):**
- Get 3x your entry back (entry + 2x profit)
- 1-in-500 chance to win the Singularity jackpot

**Bounty Failed:**
- 70% stays in house vault (funds future rewards)
- 20% goes to Singularity jackpot pool
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
│       ├── data/           # Mission pool (300 bounties)
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

- Variable entry validation (1000/2000/3000 SKR only)
- 3x reward on success (entry returned + 2x profit from house vault)
- Automatic 70/20/10 distribution on failure
- Singularity jackpot (1-in-500 on every completion)
- Commit-reveal mission assignment (SHA-256 + random salt)
- Player cancel after expiry + grace period (reclaim stuck funds)
- Dispute resolution with on-chain arbitration
- Authority key rotation via `transfer_authority`
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
5. Minimum 70% confidence threshold

## Anti-Cheat

- **Seeker Genesis Token (SGT)** — SIWS verification via Helius DAS API, "VERIFIED SEEKER" badge
- **Camera Attestation** — SHA-256 photo hash + device fingerprint, TEE-ready for Seeker Camera SDK
- **AI Screenshot Detection** — Claude rejects photos without valid EXIF/GPS metadata

## On-Chain Integration

The app runs fully on-chain on Solana devnet:

1. Mobile calls `/prepare` → backend generates commitment + returns account addresses
2. Mobile builds `accept_bounty` instruction → MWA (Phantom) signs via Solana Mobile Stack
3. `/start` verifies the on-chain transaction → hunt begins with timer
4. Player finds target, takes photo → `/submit` with AI validation
5. Backend calls `resolve_bounty` + `finalize_bounty` on-chain → tokens transferred

**Devnet Program:** `DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v`

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

**Admin CLI** for player setup:
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
SOLANA_RPC_URL=https://api.devnet.solana.com
AUTHORITY_PRIVATE_KEY=your_base58_private_key

# Program
SEEK_PROGRAM_ID=DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v
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
- [x] 300-second challenge window with optimistic resolve + dispute stake
- [x] Player `cancel_bounty` after expiry + 1h grace period
- [x] Dispute accounting with proper loss distribution
- [x] Bounty account closing (rent reclaim)
- [x] Actual vault balance checks (not tracked balance)
- [x] Strengthened jackpot RNG (`hash(mission_commitment || bounty_pda || slot || ts) % 500`)
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
