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
│   ├── AgeGateScreen.tsx     # 18+ verification (first screen)
│   ├── HomeScreen.tsx        # Tier selection & wallet
│   ├── TermsOfServiceScreen.tsx  # Legal terms
│   ├── PrivacyPolicyScreen.tsx   # Privacy policy
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

1. **Age Gate** - 18+ verification (first screen, persisted in AsyncStorage)
2. **Home** - Connect wallet, view balance, select tier, settings menu
3. **Terms of Service** - Legal terms for skill-based competition
4. **Privacy Policy** - Data collection and usage policies
5. **Bounty Reveal** - Animated card flip revealing target
6. **Camera** - Capture photo with countdown timer
7. **Validating** - Progress through AI validation stages
8. **Result** - Win/lose with confetti and stats

## Compliance Features

The app includes dApp Store compliance features:

- **Age Gate**: Users must confirm 18+ before accessing the app
- **Terms of Service**: Skill-based competition terms, accessible from settings
- **Privacy Policy**: Data collection details (GPS, photos, wallet), accessible from settings
- **Disclaimers**:
  - HomeScreen: "18+ only. Skill-based competition."
  - BountyRevealScreen: "Success depends on your ability to find and photograph objects"
  - ResultScreen (win): "Reward based on successful completion of skill challenge"
- **Settings Menu**: Top-right corner of HomeScreen with links to legal pages

## Theme (Solana Mobile)

| Color | Hex | Usage |
|-------|-----|-------|
| Cyan | #61afbd | Primary accent |
| Cyan Light | #95d2e6 | Secondary accent |
| Gold/Teal | #cfe6e4 | Rewards, highlights |
| Teal | #10282c | Deep accent |
| Success | #61afbd | Wins, verification |
| Error | #EF4444 | Losses, warnings |
| Dark | #010101 | Primary background |
| Dark Alt | #101618 | Cards, surfaces |

## License

MIT
