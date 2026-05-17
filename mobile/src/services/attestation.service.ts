/**
 * Camera Attestation Service (Mobile)
 *
 * Creates attestation payloads for photos to prove integrity.
 * Currently uses 'standard' mode (hash + device detection).
 * Will support TEE mode when Seeker Camera SDK ships.
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { AttestationPayload, CaptureLocation } from '../types';

const log = (...args: any[]) => __DEV__ && console.log(...args);

export interface DeviceInfo {
  isSeeker: boolean;
  model: string;
  brand?: string;
  manufacturer?: string;
  hasTEESupport: boolean;
}

type CaptureMetadataInput = {
  exif?: Record<string, unknown> | null;
  location?: CaptureLocation | null;
};

/**
 * Detect device type (Seeker vs other)
 */
export function detectDevice(): DeviceInfo {
  if (Platform.OS !== 'android') {
    return { isSeeker: false, model: 'iOS', hasTEESupport: false };
  }

  const model = (Platform.constants as any)?.Model || '';
  const brand = (Platform.constants as any)?.Brand || '';
  const manufacturer = (Platform.constants as any)?.Manufacturer || '';

  const combined = `${model} ${brand} ${manufacturer}`.toLowerCase();
  const isSeeker = combined.includes('seeker') || combined.includes('solana');

  return {
    isSeeker,
    model: model || 'Unknown Android',
    brand: brand || undefined,
    manufacturer: manufacturer || undefined,
    hasTEESupport: false, // TODO: Enable when Seeker Camera SDK ships
  };
}

function getPlatformConstants() {
  const constants = (Platform.constants || {}) as Record<string, unknown>;
  return {
    Model: typeof constants.Model === 'string' ? constants.Model : undefined,
    Brand: typeof constants.Brand === 'string' ? constants.Brand : undefined,
    Manufacturer: typeof constants.Manufacturer === 'string' ? constants.Manufacturer : undefined,
    Release: typeof constants.Release === 'string' ? constants.Release : undefined,
    Fingerprint: typeof constants.Fingerprint === 'string' ? constants.Fingerprint : undefined,
    Version: typeof constants.Version === 'number' ? constants.Version : undefined,
  };
}

function getExifString(exif: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = exif?.[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function getExifNumber(exif: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const value = exif?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Compute SHA-256 hash of a photo file
 */
async function computePhotoHash(photoUri: string): Promise<string> {
  try {
    // Read file as base64 and hash it
    const base64Data = await FileSystem.readAsStringAsync(photoUri, {
      encoding: 'base64',
    });

    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64Data,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    return hash;
  } catch (error) {
    log('[Attestation] Hash computation failed:', error);
    throw error;
  }
}

/**
 * Create an attestation payload for a captured photo
 */
export async function createAttestation(
  photoUri: string,
  metadata: CaptureMetadataInput = {},
): Promise<AttestationPayload> {
  const device = detectDevice();
  const photoHash = await computePhotoHash(photoUri);
  const capturedAt = Date.now();
  const platformConstants = getPlatformConstants();

  const payload: AttestationPayload = {
    type: 'standard',
    photoHash,
    timestamp: capturedAt,
    capturedAt,
    deviceModel: device.model,
    deviceMake: device.manufacturer || device.brand,
    deviceBrand: device.brand,
    deviceManufacturer: device.manufacturer,
    platformConstants,
  };

  if (metadata.location) {
    payload.latitude = metadata.location.latitude;
    payload.longitude = metadata.location.longitude;
    payload.locationAccuracyMeters = metadata.location.accuracy ?? undefined;
  }

  if (metadata.exif) {
    payload.exif = {
      DateTimeOriginal: getExifString(metadata.exif, 'DateTimeOriginal'),
      CreateDate: getExifString(metadata.exif, 'CreateDate'),
      ModifyDate: getExifString(metadata.exif, 'ModifyDate'),
      Make: getExifString(metadata.exif, 'Make'),
      Model: getExifString(metadata.exif, 'Model'),
      GPSLatitude: getExifNumber(metadata.exif, 'GPSLatitude'),
      GPSLongitude: getExifNumber(metadata.exif, 'GPSLongitude'),
    };
  }

  // TODO: When Seeker Camera SDK ships and hasTEESupport is true:
  // 1. Request TEE nonce from backend
  // 2. Call SDK: const { signature, certificate } = await SeekerCamera.attest(photoHash, nonce)
  // 3. Set payload.type = 'tee'
  // 4. Set payload.teeSignature = signature
  // 5. Set payload.teeCertificate = certificate
  // 6. Set payload.teeNonce = nonce

  log(`[Attestation] Created: type=${payload.type} device=${device.model} seeker=${device.isSeeker}`);
  return payload;
}

export default {
  detectDevice,
  createAttestation,
};
