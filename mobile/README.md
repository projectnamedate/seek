# Seek Mobile App

React Native + Expo mobile app for the Seek Protocol.

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Android device or emulator (Seeker phone recommended)

## Setup

```bash
# Install dependencies
npm install

# Start development server
npx expo start
```

## Running on Device

1. Install **Expo Go** on your Android device
2. Run `npx expo start`
3. Scan QR code with Expo Go app

For Seeker phone testing, use the development build with camera permissions.

## Project Structure

```
src/
├── components/     # Reusable UI components (Button, Timer, Card, Loader)
├── config/         # App configuration (API URLs, game settings)
├── context/        # React Context for global state
├── hooks/          # Custom hooks (useWallet, useTimer)
├── navigation/     # React Navigation stack navigator
├── screens/        # Main app screens
│   ├── HomeScreen.tsx        # Tier selection & wallet
│   ├── BountyRevealScreen.tsx # Target reveal animation
│   ├── CameraScreen.tsx       # Photo capture with timer
│   ├── ValidatingScreen.tsx   # AI validation progress
│   └── ResultScreen.tsx       # Win/lose result
├── services/       # API and wallet services
├── theme/          # Design tokens (colors, spacing, typography)
├── types/          # TypeScript type definitions
└── utils/          # Helper functions (formatting, storage)
```

## Demo Mode

The app includes demo mode for hackathon presentations:

- Mock wallet with 1000 SKR balance
- Local bounty generation (fallback when offline)
- Real GPT-4V validation via backend API
- Visual feedback for all validation stages

## Screens

1. **Home** - Connect wallet, view balance, select tier
2. **Bounty Reveal** - Animated card flip revealing target
3. **Camera** - Capture photo with countdown timer
4. **Validating** - Progress through AI validation stages
5. **Result** - Win/lose with confetti and stats

## Theme

| Color | Hex | Usage |
|-------|-----|-------|
| Gold | #FFB800 | Primary, wins, rewards |
| Purple | #8B5CF6 | Secondary, Solana brand |
| Cyan | #06B6D4 | Info, timers |
| Success | #10B981 | Wins, verification |
| Error | #EF4444 | Losses, warnings |
| Dark | #0F172A | Background |

## License

MIT
