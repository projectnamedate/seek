/**
 * Camera Attestation Service
 *
 * Standard attestation: SHA-256 photo-hash check + device-model heuristic.
 * The Seeker TEE provider is not yet shipped by Solana Mobile — when the
 * SDK lands, re-add a TEE branch here. Until then, an "abstract provider"
 * pattern around a single concrete impl was just dead surface area.
 */
import { createHash } from 'crypto';

export type AttestationType = 'standard';
export type AttestationConfidence = 'none' | 'low' | 'medium' | 'high';

export interface AttestationPayload {
  type: AttestationType;
  photoHash: string;    // SHA-256 hex of photo bytes
  timestamp: number;    // Unix ms when photo was captured
  deviceModel?: string; // Device model string
}

export interface AttestationResult {
  verified: boolean;
  type: AttestationType;
  confidence: AttestationConfidence;
  deviceVerified: boolean;
  photoIntegrity: boolean;
  isSeekerDevice: boolean;
  details?: string;
}

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

function isSeekerModel(model?: string): boolean {
  if (!model) return false;
  const lower = model.toLowerCase();
  return lower.includes('seeker') || lower.includes('solana') || lower.includes('chapter 2');
}

export function computePhotoHash(photoBuffer: Buffer): string {
  return createHash('sha256').update(photoBuffer).digest('hex');
}

class AttestationService {
  async verifyAttestation(
    payload: AttestationPayload | null,
    photoBuffer: Buffer,
  ): Promise<AttestationResult> {
    if (!payload) {
      return {
        verified: false,
        type: 'standard',
        confidence: 'none',
        deviceVerified: false,
        photoIntegrity: false,
        isSeekerDevice: false,
      };
    }

    const computedHash = createHash('sha256').update(photoBuffer).digest('hex');
    const hashMatches = computedHash === payload.photoHash;
    const isSeekerDevice = isSeekerModel(payload.deviceModel);
    const timestampValid = Math.abs(Date.now() - payload.timestamp) < TIMESTAMP_TOLERANCE_MS;

    return {
      verified: hashMatches && timestampValid,
      type: 'standard',
      confidence: hashMatches ? 'low' : 'none',
      deviceVerified: false, // Standard attestation can't cryptographically verify device
      photoIntegrity: hashMatches,
      isSeekerDevice,
      details: !hashMatches
        ? 'Photo hash mismatch — image may have been modified'
        : !timestampValid
          ? 'Timestamp outside acceptable range'
          : undefined,
    };
  }
}

export const attestationService = new AttestationService();
