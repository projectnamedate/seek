// Bounty tiers
export type Tier = 1 | 2 | 3;

// Entry amounts in lamports (with 9 decimals)
export const ENTRY_AMOUNTS: Record<Tier, bigint> = {
  1: 1_000_000_000_000n, // 1000 SKR
  2: 2_000_000_000_000n, // 2000 SKR
  3: 3_000_000_000_000n, // 3000 SKR
};

// Timer durations in seconds
export const TIER_DURATIONS: Record<Tier, number> = {
  1: 600, // 10 minutes
  2: 300, // 5 minutes
  3: 120, // 2 minutes
};

// Per-tier AI confidence thresholds (higher stakes = higher bar)
export const TIER_CONFIDENCE_THRESHOLDS: Record<Tier, number> = {
  1: 0.80, // 80% for tier 1
  2: 0.85, // 85% for tier 2
  3: 0.90, // 90% for tier 3
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
  attestationType?: 'none' | 'standard' | 'tee'; // Camera attestation type used
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
