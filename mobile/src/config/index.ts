// App configuration

// ============================================================
// NGROK_URL: Set this before building for real device testing.
// Example: 'https://abc123.ngrok-free.app'
// Leave empty/null to use emulator URL (10.0.2.2) in dev.
// ============================================================
const NGROK_URL: string | null = 'https://send-gel-computers-tracker.trycloudflare.com';

// API Configuration
export const API_CONFIG = {
  NGROK_URL,
  EMULATOR_URL: 'http://localhost:3001/api',  // Use with `adb reverse tcp:3001 tcp:3001` for real devices
  PROD_URL: 'https://api.seek.app/api',
  TIMEOUT: 30000,
  AI_VALIDATION_TIMEOUT: 60000,
};

// Resolved API base URL: ngrok > emulator (dev) > prod
export const API_BASE_URL = __DEV__
  ? (NGROK_URL ? `${NGROK_URL}/api` : API_CONFIG.EMULATOR_URL)
  : API_CONFIG.PROD_URL;

// Hybrid Demo Mode:
//   - Uses demo bounty endpoints (no on-chain tx for start/submit)
//   - But connects real MWA wallet + fetches real SKR balance
//   - Set USE_DEMO_ENDPOINTS=false to use full on-chain flow
export const DEMO_MODE = {
  ENABLED: __DEV__ ?? false,           // Master switch (tied to __DEV__)
  USE_DEMO_ENDPOINTS: true,            // Use /bounty/demo/* endpoints
  WALLET_ADDRESS: 'Demo7xR3kN9vU2mQp8sW4yL6hJ1cBfT5gA2dSeeker',
  INITIAL_BALANCE: 50000,
};

// Game Settings
export const GAME_CONFIG = {
  MIN_CONFIDENCE: 0.70, // 70% AI confidence required
  SINGULARITY_ODDS: 500, // 1 in 500 chance
  CHALLENGE_PERIOD: 300, // 5 minutes
};

// Tier Configuration - Solana Mobile colors
export const TIERS = {
  1: {
    entry: 1000,
    timeLimit: 180, // 3 minutes
    difficulty: 'Easy',
    color: '#cfe6e4', // light teal (Easy)
  },
  2: {
    entry: 2000,
    timeLimit: 120, // 2 minutes
    difficulty: 'Medium',
    color: '#95d2e6', // sky blue (Medium)
  },
  3: {
    entry: 3000,
    timeLimit: 60, // 1 minute
    difficulty: 'Hard',
    color: '#61afbd', // bright cyan (Hard)
  },
} as const;

// Token Info
export const TOKEN = {
  NAME: 'Seek',
  SYMBOL: 'SKR',
  // Devnet test token (mainnet: SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3)
  MINT: 'u3BkoKjVYYPt24Dto1VPwAzqeQg9ffaxnCVhTAYbAFF',
  DECIMALS: 9,
};

// Program ID
export const PROGRAM_ID = 'DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v';

// Links
export const LINKS = {
  WEBSITE: 'https://seek.app',
  GITHUB: 'https://github.com/seek-protocol/seek',
  TWITTER: 'https://twitter.com/seekprotocol',
  DISCORD: 'https://discord.gg/seekprotocol',
};
