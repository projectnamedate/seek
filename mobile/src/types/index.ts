// Bounty tier definitions
export type TierNumber = 1 | 2 | 3;

export interface Tier {
  number: TierNumber;
  bet: number;        // SKR amount
  timeLimit: number;  // seconds
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const TIERS: Record<TierNumber, Tier> = {
  1: { number: 1, bet: 1000, timeLimit: 300, difficulty: 'Easy' },
  2: { number: 2, bet: 2000, timeLimit: 180, difficulty: 'Medium' },
  3: { number: 3, bet: 3000, timeLimit: 120, difficulty: 'Hard' },
};

// Bounty status
export type BountyStatus =
  | 'idle'           // No active bounty
  | 'revealing'      // Showing the target
  | 'hunting'        // Player is searching
  | 'submitting'     // Photo being uploaded
  | 'validating'     // AI analyzing
  | 'won'            // Success!
  | 'lost'           // Failed
  | 'expired';       // Ran out of time

// Bounty data from backend
export interface Bounty {
  id: string;
  tier: TierNumber;
  target: string;
  targetHint: string;
  startTime: number;
  endTime: number;
  status: BountyStatus;
  betAmount: number;
  potentialWin: number;
}

// Validation result from AI
export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  timestamp: number;
}

// API response types
export interface StartBountyResponse {
  success: boolean;
  bounty?: Bounty;
  error?: string;
}

export interface SubmitPhotoResponse {
  success: boolean;
  validation?: ValidationResult;
  bounty?: Bounty;
  error?: string;
}

// Player wallet state (demo mode)
export interface WalletState {
  connected: boolean;
  address: string | null;
  skrName: string | null;  // .skr domain name (e.g., "player.skr")
  balance: number;         // SKR balance
  isDemo: boolean;
}

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  BountyReveal: { tier: TierNumber };
  Camera: { bounty: Bounty };
  Validating: { bounty: Bounty; photoUri: string };
  Result: { bounty: Bounty; validation: ValidationResult };
};

// App state
export interface AppState {
  wallet: WalletState;
  activeBounty: Bounty | null;
  stats: {
    totalPlayed: number;
    totalWon: number;
    winStreak: number;
    bestStreak: number;
  };
}
