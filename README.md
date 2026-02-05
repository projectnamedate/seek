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
├── contracts/           # Solana smart contracts
│   ├── programs/
│   │   └── seek-protocol/
│   │       └── src/
│   │           └── lib.rs
│   ├── Anchor.toml
│   └── Cargo.toml
├── backend/            # Node.js API server (coming soon)
└── mobile/             # React Native app (coming soon)
```

## Smart Contract Features

- Variable bet validation (100/200/300 SKR only)
- 2x payout on success
- Automatic 70/15/10/5 distribution on failure
- Singularity jackpot (1-in-500 on every win)
- PDA-based account management
- Event emission for real-time tracking

## Development

```bash
# Build contracts
cd contracts
anchor build

# Run tests
anchor test
```

## License

MIT
