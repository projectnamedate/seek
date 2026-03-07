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

Full security audit completed (contract + backend). See `tasks/security-audit.md` for details.

**Implemented:**
- [x] Commit-reveal mission assignment (prevents front-running)
- [x] Rate limiting (IP-based)
- [x] Transaction verification on bounty start
- [x] Wallet ownership validation on photo submit
- [x] Race condition locks (per-wallet + per-bounty mutex)
- [x] Player cancel after expiry (reclaim stuck funds)
- [x] Dispute accounting with proper loss distribution
- [x] Authority key rotation
- [x] Bounty account closing (rent reclaim)
- [x] Actual vault balance checks (not tracked balance)
- [x] Duplicate account guards
- [x] Treasury mint + balance constraints

**Mainnet Roadmap:**
- [ ] **VRF Randomness** — Switchboard or Orao VRF for provably fair jackpot
- [ ] **Persistence Layer** — Redis/database to survive backend restarts
- [ ] **Authority Multisig** — Timelock/multisig for treasury operations

## Roadmap to Mainnet

### Phase 1: Smart Contract Hardening
- [ ] Integrate VRF (Switchboard/Orao) for provably fair jackpot rolls — replaces current `slot + timestamp % 500`
- [ ] Deploy authority multisig (Squads Protocol) for treasury and admin operations
- [ ] Increase challenge period from 10s (devnet) to 300s (mainnet)
- [ ] External smart contract audit by a specialized firm
- [ ] Redeploy program to mainnet with verified build

### Phase 2: Backend Production Infrastructure
- [ ] Replace in-memory storage (JavaScript Maps) with Redis or PostgreSQL for persistence across restarts
- [ ] Set up production hosting (Railway, Fly.io, or AWS) — replace Cloudflare tunnel
- [ ] Configure production domain and SSL (`api.seek.app`)
- [ ] Add error tracking (Sentry) and monitoring (Datadog/Prometheus)
- [ ] Enable Proguard/R8 minification for release builds
- [ ] Rate limiting tuning for production traffic

### Phase 3: Token & Economics
- [ ] Fund house vault with initial liquidity
- [ ] Set up protocol treasury wallet

### Phase 4: Release Signing & APK
- [ ] Generate production release keystore (store securely, back up passphrase)
- [ ] Configure Gradle release signing with environment-based credentials
- [ ] Build production-signed APK
- [ ] Increment versionCode for each release

### Phase 5: Solana dApp Store Submission
- [ ] Register as a Solana dApp Store publisher
- [ ] Create dApp Store listing (description, screenshots, logo)
- [ ] Submit APK for review
- [ ] Implement any feedback from dApp Store review team

### Phase 6: Post-Launch
- [ ] Integrate Seeker Camera SDK (TEE attestation) when available from Solana Mobile
- [ ] Add leaderboard and player stats
- [ ] Expand mission pool beyond 300 bounties
- [ ] Community-created missions

## License

MIT
