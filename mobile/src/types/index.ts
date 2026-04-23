// Bounty tier definitions
export type TierNumber = 1 | 2 | 3;

// Re-export the single source of truth (TIERS in config). Keeps existing
// `import { TIERS } from '../types'` call sites working without divergence.
// eslint-disable-next-line @typescript-eslint/no-var-requires
export { TIERS } from '../config';

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
  entryAmount: number;
  potentialReward: number;
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

// Player wallet state
export interface WalletState {
  connected: boolean;
  address: string | null;       // Display address (truncated, e.g. "AbC1...xYz9")
  fullAddress: string | null;   // Full base58 address for API calls
  skrName: string | null;       // .skr domain name (e.g., "player.skr")
  balance: number;              // SKR balance
  isDemo: boolean;
  sgtVerified?: boolean;        // Seeker Genesis Token verified
}

// Camera attestation payload (sent with photo submission).
// 'tee' has been removed pending the Seeker Camera SDK ship — re-add when ready.
export interface AttestationPayload {
  type: 'standard';
  photoHash: string;
  timestamp: number;
  deviceModel?: string;
}

// Navigation types
export type RootStackParamList = {
  AgeGate: undefined;
  Home: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  BountyReveal: { tier: TierNumber };
  Camera: { bounty: Bounty };
  Validating: { bounty: Bounty; photoUri: string; attestation?: AttestationPayload };
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
