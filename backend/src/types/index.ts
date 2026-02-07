// Bounty tiers
export type Tier = 1 | 2 | 3;

// Bet amounts in lamports (with 9 decimals)
export const BET_AMOUNTS: Record<Tier, bigint> = {
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
  betAmount: bigint;
  status: BountyStatus;
  createdAt: Date;
  expiresAt: Date;
  bountyPda: string; // On-chain PDA address
  transactionSignature?: string;
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
