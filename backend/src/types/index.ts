// Bounty tiers
export type Tier = 1 | 2 | 3;

// SKR base-unit multiplier — MUST match the on-chain SKR_DECIMALS const.
// Mainnet SKR (official Solana Mobile token) uses 6 decimals; devnet test
// mint uses 9. Exported so consumers can format balances consistently.
export const SKR_DECIMALS = (process.env.SOLANA_NETWORK ?? 'devnet').toLowerCase() === 'mainnet-beta' ? 6 : 9;
export const SKR_MULTIPLIER = BigInt(10) ** BigInt(SKR_DECIMALS);

// Entry amounts in base units (whole SKR × SKR_MULTIPLIER).
export const ENTRY_AMOUNTS: Record<Tier, bigint> = {
  1: 1000n * SKR_MULTIPLIER,
  2: 2000n * SKR_MULTIPLIER,
  3: 3000n * SKR_MULTIPLIER,
};

// Timer durations in seconds (must match mobile TIERS config)
export const TIER_DURATIONS: Record<Tier, number> = {
  1: 180, // 3 minutes
  2: 120, // 2 minutes
  3: 60,  // 1 minute
};

// Per-tier AI confidence thresholds (higher stakes = higher bar).
// Tuned 2026-04-23 for $1k launch vault — bias hard toward rejection,
// since false negatives cost a fraction of a bet but false positives
// cost 3-10% of vault per win. Relax once vault > $20k.
export const TIER_CONFIDENCE_THRESHOLDS: Record<Tier, number> = {
  1: 0.88,
  2: 0.92,
  3: 0.95,
};

// Bounty status
export type BountyStatus = 'pending' | 'validating' | 'won' | 'lost' | 'expired';

// Mission definition (what player needs to find)
export interface Mission {
  id: string;
  tier: Tier;
  description: string;
  keywords: string[]; // For AI validation
  difficulty: 'easy' | 'medium' | 'hard';
  location: 'indoor' | 'outdoor';
}

// Active bounty being hunted
export interface ActiveBounty {
  id: string;
  missionId: string;
  playerWallet: string;
  tier: Tier;
  entryAmount: bigint;
  status: BountyStatus;
  createdAt: Date;
  expiresAt: Date;
  bountyPda: string; // On-chain PDA address
  transactionSignature?: string;
  sgtVerified?: boolean; // Seeker Genesis Token verified
  attestationType?: 'none' | 'standard'; // Camera attestation type used
}

// Photo submission for validation
export interface PhotoSubmission {
  bountyId: string;
  imageBuffer: Buffer;
  mimeType: string;
  metadata?: PhotoMetadata;
}

// EXIF metadata extracted from photo
export interface PhotoMetadata {
  timestamp?: Date;
  latitude?: number;
  longitude?: number;
  deviceMake?: string;
  deviceModel?: string;
}

// AI validation result
export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  detectedObjects: string[];
  isScreenshot: boolean;
  matchesTarget: boolean;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StartBountyRequest {
  tier: Tier;
  playerWallet: string;
}

export interface StartBountyResponse {
  bountyId: string;
  mission: {
    id: string;
    description: string;
  };
  expiresAt: string;
  bountyPda: string;
}

export interface SubmitPhotoResponse {
  status: 'won' | 'lost';
  validation: ValidationResult;
  payout?: string;
  singularityWon?: boolean;
  transactionSignature?: string;
}
