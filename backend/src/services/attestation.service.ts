/**
 * Camera Attestation Service
 *
 * Abstract interface for photo attestation with pluggable providers:
 * - StandardProvider: Hash verification + device model detection (current)
 * - TEEProvider: Seeker Trusted Execution Environment (future, when SDK ships)
 *
 * The TEE provider is a placeholder that will be implemented when Solana Mobile
 * releases the Seeker Camera attestation SDK.
 */
import { createHash } from 'crypto';

// Types
export type AttestationType = 'standard' | 'tee';
export type AttestationConfidence = 'none' | 'low' | 'medium' | 'high';

export interface AttestationPayload {
  type: AttestationType;
  photoHash: string;         // SHA-256 hex of photo bytes
  timestamp: number;         // Unix ms when photo was captured
  deviceModel?: string;      // Device model string
  // TEE-specific fields (future)
  teeSignature?: string;     // Base64 TEE signature over (photoHash + timestamp + nonce)
  teeCertificate?: string;   // Base64 device certificate chain
  teeNonce?: string;         // Challenge nonce from backend
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

// Provider interface
interface AttestationProvider {
  readonly type: AttestationType;
  verify(payload: AttestationPayload, photoBuffer: Buffer): Promise<AttestationResult>;
}

/**
 * Standard attestation: hash check + device model detection
 * Available now — provides basic integrity verification
 */
class StandardAttestationProvider implements AttestationProvider {
  readonly type: AttestationType = 'standard';

  async verify(payload: AttestationPayload, photoBuffer: Buffer): Promise<AttestationResult> {
    // Verify photo hash integrity
    const computedHash = createHash('sha256').update(photoBuffer).digest('hex');
    const hashMatches = computedHash === payload.photoHash;

    // Check if device claims to be Seeker
    const isSeekerDevice = isSeekerModel(payload.deviceModel);

    // Check timestamp is reasonable (within 5 minutes)
    const timeDiff = Math.abs(Date.now() - payload.timestamp);
    const timestampValid = timeDiff < 5 * 60 * 1000;

    return {
      verified: hashMatches && timestampValid,
      type: 'standard',
      confidence: hashMatches ? 'low' : 'none',
      deviceVerified: false, // Can't cryptographically verify device in standard mode
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

/**
 * TEE attestation: cryptographic proof from Seeker hardware
 * PLACEHOLDER — will be implemented when Solana Mobile ships the Camera SDK
 *
 * Expected flow when SDK is available:
 * 1. Backend generates a challenge nonce
 * 2. Mobile requests TEE to sign: hash(photoHash || timestamp || nonce)
 * 3. TEE returns signature + device certificate chain
 * 4. Backend verifies signature against Solana Mobile root CA
 * 5. If valid → confidence: 'high', deviceVerified: true
 */
class TEEAttestationProvider implements AttestationProvider {
  readonly type: AttestationType = 'tee';

  async verify(payload: AttestationPayload, photoBuffer: Buffer): Promise<AttestationResult> {
    // TODO: When Seeker Camera SDK ships, implement:
    //
    // 1. Verify TEE signature:
    //    const message = concat(payload.photoHash, payload.timestamp, payload.teeNonce)
    //    const valid = verifyTEESignature(message, payload.teeSignature, payload.teeCertificate)
    //
    // 2. Validate certificate chain:
    //    const chainValid = verifyCertificateChain(payload.teeCertificate, SOLANA_MOBILE_ROOT_CA)
    //
    // 3. Check nonce was issued by our backend (replay protection):
    //    const nonceValid = consumeAttestationNonce(payload.teeNonce)
    //
    // 4. Verify photo hash integrity:
    //    const computedHash = sha256(photoBuffer)
    //    const hashValid = computedHash === payload.photoHash
    //
    // 5. Return high-confidence result:
    //    return { verified: true, confidence: 'high', deviceVerified: true, ... }

    return {
      verified: false,
      type: 'tee',
      confidence: 'none',
      deviceVerified: false,
      photoIntegrity: false,
      isSeekerDevice: false,
      details: 'TEE attestation not yet supported — awaiting Seeker Camera SDK',
    };
  }
}

/**
 * Attestation service facade — delegates to appropriate provider
 */
class AttestationService {
  private providers: Map<AttestationType, AttestationProvider>;

  constructor() {
    this.providers = new Map();
    this.providers.set('standard', new StandardAttestationProvider());
    this.providers.set('tee', new TEEAttestationProvider());
  }

  /**
   * Verify an attestation payload against the actual photo
   */
  async verifyAttestation(
    payload: AttestationPayload | null,
    photoBuffer: Buffer
  ): Promise<AttestationResult> {
    // No attestation provided
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

    const provider = this.providers.get(payload.type);
    if (!provider) {
      return {
        verified: false,
        type: payload.type,
        confidence: 'none',
        deviceVerified: false,
        photoIntegrity: false,
        isSeekerDevice: false,
        details: `Unknown attestation type: ${payload.type}`,
      };
    }

    return provider.verify(payload, photoBuffer);
  }

  /**
   * Generate a TEE challenge nonce (for future use)
   */
  generateTEENonce(): string {
    return createHash('sha256')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex');
  }
}

/**
 * Check if a device model string matches Seeker patterns
 */
function isSeekerModel(model?: string): boolean {
  if (!model) return false;
  const lower = model.toLowerCase();
  return lower.includes('seeker') || lower.includes('solana') || lower.includes('chapter 2');
}

/**
 * Compute SHA-256 hash of a photo buffer
 */
export function computePhotoHash(photoBuffer: Buffer): string {
  return createHash('sha256').update(photoBuffer).digest('hex');
}

// Singleton instance
export const attestationService = new AttestationService();
