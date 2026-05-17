/**
 * Camera Attestation Service
 *
 * Standard attestation: SHA-256 photo-hash check + device-model heuristic.
 * The Seeker TEE provider is not yet shipped by Solana Mobile — when the
 * SDK lands, re-add a TEE branch here. Until then, an "abstract provider"
 * pattern around a single concrete impl was just dead surface area.
 */
import { createHash } from 'crypto';
import { PhotoMetadata } from '../types';

export type AttestationType = 'standard';
export type AttestationConfidence = 'none' | 'low' | 'medium' | 'high';

export interface AttestationPayload {
  type: AttestationType;
  photoHash: string;    // SHA-256 hex of photo bytes
  timestamp: number;    // Unix ms when photo was captured
  capturedAt?: number;  // Unix ms at shutter time, preferred over timestamp
  deviceModel?: string; // Device model string
  deviceMake?: string;
  deviceBrand?: string;
  deviceManufacturer?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracyMeters?: number;
  exif?: {
    DateTimeOriginal?: string | number;
    CreateDate?: string | number;
    ModifyDate?: string | number;
    Make?: string;
    Model?: string;
    GPSLatitude?: number;
    GPSLongitude?: number;
  };
  platformConstants?: {
    Model?: string;
    Brand?: string;
    Manufacturer?: string;
    Release?: string;
    Fingerprint?: string;
    Version?: number;
  };
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
const EXIF_ATTESTATION_DRIFT_MS = 2 * 60 * 1000;

function isSeekerModel(model?: string): boolean {
  if (!model) return false;
  const lower = model.toLowerCase();
  return lower.includes('seeker') || lower.includes('solana') || lower.includes('chapter 2');
}

export function computePhotoHash(photoBuffer: Buffer): string {
  return createHash('sha256').update(photoBuffer).digest('hex');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validLatitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

function validLongitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim().slice(0, 120);
    }
  }
  return undefined;
}

function attestedCaptureDate(payload: AttestationPayload): Date | undefined {
  const capturedAt = payload.capturedAt ?? payload.timestamp;
  if (!isFiniteNumber(capturedAt)) {
    return undefined;
  }
  return new Date(capturedAt);
}

export function mergeAttestationMetadata(
  exifMetadata: PhotoMetadata,
  payload: AttestationPayload | null,
  result: AttestationResult,
): PhotoMetadata {
  if (!payload || !result.verified) {
    return exifMetadata;
  }

  const merged: PhotoMetadata = { ...exifMetadata };
  let changed = false;

  const attestedTimestamp = attestedCaptureDate(payload);
  if (
    attestedTimestamp &&
    (!merged.timestamp ||
      Math.abs(merged.timestamp.getTime() - attestedTimestamp.getTime()) > EXIF_ATTESTATION_DRIFT_MS)
  ) {
    merged.timestamp = attestedTimestamp;
    changed = true;
  }

  if (!merged.deviceMake) {
    const deviceMake = firstString(
      payload.deviceMake,
      payload.deviceManufacturer,
      payload.deviceBrand,
      payload.exif?.Make,
      payload.platformConstants?.Manufacturer,
      payload.platformConstants?.Brand,
    );
    if (deviceMake) {
      merged.deviceMake = deviceMake;
      changed = true;
    }
  }

  if (!merged.deviceModel) {
    const deviceModel = firstString(
      payload.deviceModel,
      payload.exif?.Model,
      payload.platformConstants?.Model,
    );
    if (deviceModel) {
      merged.deviceModel = deviceModel;
      changed = true;
    }
  }

  if (merged.latitude === undefined || merged.longitude === undefined) {
    const latitude = validLatitude(payload.latitude)
      ? payload.latitude
      : validLatitude(payload.exif?.GPSLatitude)
        ? payload.exif?.GPSLatitude
        : undefined;
    const longitude = validLongitude(payload.longitude)
      ? payload.longitude
      : validLongitude(payload.exif?.GPSLongitude)
        ? payload.exif?.GPSLongitude
        : undefined;
    if (latitude !== undefined && longitude !== undefined) {
      merged.latitude = latitude;
      merged.longitude = longitude;
      changed = true;
    }
  }

  if (
    merged.locationAccuracyMeters === undefined &&
    isFiniteNumber(payload.locationAccuracyMeters) &&
    payload.locationAccuracyMeters >= 0 &&
    payload.locationAccuracyMeters <= 100_000
  ) {
    merged.locationAccuracyMeters = payload.locationAccuracyMeters;
    changed = true;
  }

  if (changed) {
    merged.source = exifMetadata.source === 'exif' ? 'merged' : 'attestation';
  }

  return merged;
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

    const computedRawHash = createHash('sha256').update(photoBuffer).digest('hex');
    // v1.0.1 mobile hashed the base64 string because Expo Crypto does not hash
    // file bytes directly. Accept both encodings so existing live installs can
    // still provide a useful fresh-capture signal.
    const computedBase64Hash = createHash('sha256').update(photoBuffer.toString('base64')).digest('hex');
    const hashMatches =
      computedRawHash === payload.photoHash || computedBase64Hash === payload.photoHash;
    const isSeekerDevice = isSeekerModel(payload.deviceModel);
    const timestamp = payload.capturedAt ?? payload.timestamp;
    const timestampValid =
      typeof timestamp === 'number' &&
      Number.isFinite(timestamp) &&
      Math.abs(Date.now() - timestamp) < TIMESTAMP_TOLERANCE_MS;

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
