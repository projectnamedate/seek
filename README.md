# Seek

Pokemon GO for crypto. Bet $SKR, find real-world objects, win 2x your bet. Built for the Solana Seeker phone.

## How It Works

1. **Select Tier** - Choose your risk level (100/200/300 $SKR)
2. **Accept Bounty** - Wallet approves bet, you get a random target
3. **Hunt** - Find the object in the real world before time runs out
4. **Capture** - Take a photo with your camera
5. **Validate** - AI verifies your photo is legit
6. **Win/Lose** - Get 2x payout or lose your bet

## The Three Tiers

| Tier | Bet | Time | Difficulty | Example Bounties |
|------|-----|------|------------|------------------|
| 1 | 100 $SKR | 10 min | Easy | Fire hydrant, blue car, dog |
| 2 | 200 $SKR | 5 min | Medium | Starbucks cup, golden retriever |
| 3 | 300 $SKR | 2 min | Hard | Dog jumping, person on bicycle |

## Economics

**Win (40% target rate):**
- Get 2x your bet back
- 1-in-500 chance to win the Singularity jackpot

**Lose:**
- 70% stays in house vault (funds future payouts)
- 15% goes to Singularity jackpot pool
- 10% burned forever (deflationary)
- 5% protocol treasury

## Tech Stack

- **Smart Contract**: Solana/Anchor (Rust)
- **Backend**: Node.js + Express + TypeScript
- **AI Validation**: OpenAI GPT-4V
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
│       │   ├── ai.service.ts       # GPT-4V validation
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

- Variable bet validation (100/200/300 SKR only)
- 2x payout on success
- Automatic 70/15/10/5 distribution on failure
- Singularity jackpot (1-in-500 on every win)
- PDA-based account management
- Event emission for real-time tracking

## Backend API

**Endpoints:**
- `POST /api/bounty/start` - Start a bounty hunt
- `POST /api/bounty/submit` - Submit photo for validation
- `GET /api/bounty/:id` - Get bounty status
- `GET /api/bounty/player/:wallet` - Get player's active bounty
- `GET /api/health` - Health check
- `GET /api/health/stats` - Protocol statistics

**Photo Validation:**
1. EXIF metadata extraction (timestamp, GPS, device)
2. Screenshot detection (no GPS + no device = reject)
3. Timestamp validation (max 5 min old)
4. GPT-4V object detection with confidence scoring
5. Minimum 70% confidence threshold

## Demo Mode

For hackathon demos, the app works without blockchain:

```bash
# 1. Start backend with demo endpoints
cd backend
cp .env.example .env
# Set your OPENAI_API_KEY in .env
npm install
npm run dev

# 2. Start mobile app
cd mobile
npm install
npx expo start

# 3. Run on Android (Seeker phone)
# Press 'a' in Expo CLI or scan QR code
```

Demo endpoints skip blockchain but use **real GPT-4V validation** - judges can see AI analyzing actual photos!

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
SEEK_PROGRAM_ID=Seek111111111111111111111111111111111111111
SKR_MINT=SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3

# OpenAI
OPENAI_API_KEY=sk-your-api-key
```

## License

MIT
