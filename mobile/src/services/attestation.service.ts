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
import { AttestationPayload } from '../types';

const log = (...args: any[]) => __DEV__ && console.log(...args);

export interface DeviceInfo {
  isSeeker: boolean;
  model: string;
  hasTEESupport: boolean;
}

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
    hasTEESupport: false, // TODO: Enable when Seeker Camera SDK ships
  };
}

/**
 * Compute SHA-256 hash of a photo file
 */
async function computePhotoHash(photoUri: string): Promise<string> {
  try {
    // Read file as base64
    const base64Data = await FileSystem.readAsStringAsync(photoUri, {
      encoding: 'base64',
    });

    // Hash the base64-decoded bytes
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
export async function createAttestation(photoUri: string): Promise<AttestationPayload> {
  const device = detectDevice();
  const photoHash = await computePhotoHash(photoUri);

  const payload: AttestationPayload = {
    type: 'standard',
    photoHash,
    timestamp: Date.now(),
    deviceModel: device.model,
  };

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
