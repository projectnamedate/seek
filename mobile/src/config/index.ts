// App configuration

// API Configuration
export const API_CONFIG = {
  // For development, update this to your local IP
  DEV_URL: 'http://10.0.2.2:3001/api', // 10.0.2.2 = host machine from Android emulator
  PROD_URL: 'https://api.seek.app/api',
  TIMEOUT: 30000,
  AI_VALIDATION_TIMEOUT: 60000,
};

// Demo Mode
export const DEMO_MODE = {
  ENABLED: true, // Set to false for production
  WALLET_ADDRESS: 'Demo7xR3kN9vU2mQp8sW4yL6hJ1cBfT5gA2dSeeker',
  INITIAL_BALANCE: 10000,
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
    timeLimit: 300, // 5 minutes
    difficulty: 'Easy',
    color: '#cfe6e4', // light teal (Easy)
  },
  2: {
    entry: 2000,
    timeLimit: 180, // 3 minutes
    difficulty: 'Medium',
    color: '#95d2e6', // sky blue (Medium)
  },
  3: {
    entry: 3000,
    timeLimit: 120, // 2 minutes
    difficulty: 'Hard',
    color: '#61afbd', // bright cyan (Hard)
  },
} as const;

// Token Info
export const TOKEN = {
  NAME: 'Seek',
  SYMBOL: 'SKR',
  MINT: 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3',
  DECIMALS: 9,
};

// Program ID
export const PROGRAM_ID = 'Seek111111111111111111111111111111111111111';

// Links
export const LINKS = {
  WEBSITE: 'https://seek.app',
  GITHUB: 'https://github.com/seek-protocol/seek',
  TWITTER: 'https://twitter.com/seekprotocol',
  DISCORD: 'https://discord.gg/seekprotocol',
};
