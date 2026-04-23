// App configuration

// ============================================================
// NGROK_URL: Set this before building for real device testing.
// Example: 'https://abc123.ngrok-free.app'
// Leave empty/null to use emulator URL (10.0.2.2) in dev.
// ============================================================
const NGROK_URL: string | null = null;

// API Configuration
export const API_CONFIG = {
  NGROK_URL,
  EMULATOR_URL: 'http://localhost:3001/api',  // Use with `adb reverse tcp:3001 tcp:3001` for real devices
  PROD_URL: 'https://api.seek.app/api',
  TIMEOUT: 30000,
  AI_VALIDATION_TIMEOUT: 60000,
};

// Resolved API base URL: ngrok > emulator (dev) > prod
// NGROK_URL takes priority in ALL builds (needed for release build testing)
export const API_BASE_URL = NGROK_URL
  ? `${NGROK_URL}/api`
  : (__DEV__ ? API_CONFIG.EMULATOR_URL : API_CONFIG.PROD_URL);

// Hybrid Demo Mode:
//   - Uses demo bounty endpoints (no on-chain tx for start/submit)
//   - But connects real MWA wallet + fetches real SKR balance
//   - Set USE_DEMO_ENDPOINTS=false to use full on-chain flow
export const DEMO_MODE = {
  ENABLED: __DEV__ ?? false,           // Master switch (tied to __DEV__)
  USE_DEMO_ENDPOINTS: false,           // false = real on-chain flow via MWA
  WALLET_ADDRESS: 'Demo7xR3kN9vU2mQp8sW4yL6hJ1cBfT5gA2dSeeker',
  INITIAL_BALANCE: 50000,
};

// Network toggle (mainnet is the default). Switch to 'devnet' for devnet build/testing.
export const NETWORK: 'mainnet-beta' | 'devnet' = 'mainnet-beta';

// Game Settings
export const GAME_CONFIG = {
  MIN_CONFIDENCE: 0.70, // 70% AI confidence required
  SINGULARITY_ODDS: 500, // 1 in 500 chance
  // Must match the on-chain CHALLENGE_PERIOD (contract: 300s mainnet, 10s devnet).
  CHALLENGE_PERIOD: NETWORK === 'mainnet-beta' ? 300 : 10,
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
// Mainnet SKR = official Solana Mobile ecosystem token (6 decimals, 10B supply).
// Devnet test SKR = internal 9-decimal mint used during hackathon demo.
export const TOKEN = NETWORK === 'mainnet-beta'
  ? {
      NAME: 'Seek',
      SYMBOL: 'SKR',
      MINT: 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3',
      DECIMALS: 6,
    }
  : {
      NAME: 'Seek',
      SYMBOL: 'SKR',
      MINT: 'u3BkoKjVYYPt24Dto1VPwAzqeQg9ffaxnCVhTAYbAFF',
      DECIMALS: 9,
    };

// Program ID (same keypair deployed to both clusters; separate on-chain state per cluster)
export const PROGRAM_ID = 'DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v';

// Links
export const LINKS = {
  WEBSITE: 'https://seek.app',
  GITHUB: 'https://github.com/seek-protocol/seek',
  TWITTER: 'https://twitter.com/seekprotocol',
  DISCORD: 'https://discord.gg/seekprotocol',
};
