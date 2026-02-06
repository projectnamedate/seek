// App configuration

// API Configuration
export const API_CONFIG = {
  // For development, update this to your local IP
  DEV_URL: 'http://192.168.1.23:3001/api',
  PROD_URL: 'https://api.seek.app/api',
  TIMEOUT: 30000,
  AI_VALIDATION_TIMEOUT: 60000,
};

// Demo Mode
export const DEMO_MODE = {
  ENABLED: true, // Set to false for production
  WALLET_ADDRESS: 'Demo7xR3kN9vU2mQp8sW4yL6hJ1cBfT5gA2dSeeker',
  INITIAL_BALANCE: 1000,
};

// Game Settings
export const GAME_CONFIG = {
  MIN_CONFIDENCE: 0.70, // 70% AI confidence required
  SINGULARITY_ODDS: 500, // 1 in 500 chance
  CHALLENGE_PERIOD: 300, // 5 minutes
};

// Tier Configuration
export const TIERS = {
  1: {
    bet: 100,
    timeLimit: 600, // 10 minutes
    difficulty: 'Easy',
    color: '#10B981', // success green
  },
  2: {
    bet: 200,
    timeLimit: 300, // 5 minutes
    difficulty: 'Medium',
    color: '#F59E0B', // warning yellow
  },
  3: {
    bet: 300,
    timeLimit: 120, // 2 minutes
    difficulty: 'Hard',
    color: '#EF4444', // error red
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
