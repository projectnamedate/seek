import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { Bounty, TierNumber, ValidationResult, AttestationPayload } from '../types';
import { API_BASE_URL, DEMO_MODE } from '../config';

// Dev-only logging - stripped from production builds
const log = (...args: any[]) => __DEV__ && console.log(...args);
const logError = (...args: any[]) => __DEV__ && console.error(...args);

// Max photo upload size (10MB) - matches backend multer limit
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

// Base58 alphabet (same as Solana)
const BS58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encode bytes to base58 string
 */
function encodeBase58(bytes: Uint8Array): string {
  // Count leading zeros
  let zeros = 0;
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    zeros++;
  }

  // Convert to big number
  let num = BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
  let result = '';
  while (num > 0n) {
    result = BS58_CHARS[Number(num % 58n)] + result;
    num = num / 58n;
  }

  // Add leading '1' for each leading zero byte
  return '1'.repeat(zeros) + result;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
  },
});

/**
 * Generate wallet auth headers for authenticated endpoints.
 * Signs message: "seek:{walletAddress}:{timestamp}"
 * Backend verifies Ed25519 signature within 30s window.
 */
export async function getWalletAuthHeaders(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  walletAddress: string
): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  const message = `seek:${walletAddress}:${timestamp}`;
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = await signMessage(messageBytes);
  const signatureBase58 = encodeBase58(signatureBytes);

  return {
    'x-wallet-address': walletAddress,
    'x-wallet-signature': signatureBase58,
    'x-signature-timestamp': timestamp,
  };
}

/**
 * Prepare a bounty (pre-transaction).
 * Returns commitment, timestamp, bountyPda for building on-chain tx.
 * No auth required.
 */
export async function prepareBounty(
  playerWallet: string,
  tier: TierNumber
): Promise<{
  success: boolean;
  data?: {
    commitment: number[];
    timestamp: number;
    bountyPda: string;
    entryAmount: number;
  };
  error?: string;
}> {
  try {
    const response = await api.post('/bounty/prepare', {
      tier,
      playerWallet,
    });

    if (response.data.success && response.data.data) {
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: response.data.error || 'Failed to prepare bounty',
    };
  } catch (error: any) {
    logError('[API] Prepare bounty error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to prepare bounty',
    };
  }
}

/**
 * Start a new bounty hunt.
 * In demo mode: uses /bounty/demo/start (no auth).
 * In devnet mode: uses /bounty/start (with wallet auth headers).
 */
export async function startBounty(
  wallet: string,
  tier: TierNumber,
  options?: {
    bountyPda?: string;
    transactionSignature?: string;
    signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  }
): Promise<{ success: boolean; bounty?: Bounty; data?: any; error?: string }> {
  try {
    if (DEMO_MODE.USE_DEMO_ENDPOINTS) {
      // Demo mode: no auth, simplified request
      const response = await api.post('/bounty/demo/start', {
        tier,
        wallet,
      });

      if (response.data.success && response.data.bounty) {
        return { success: true, bounty: response.data.bounty };
      }
      return { success: false, error: response.data.error || 'Failed to start bounty' };
    }

    // Devnet mode: auth headers + full request
    const headers: Record<string, string> = {};
    if (options?.signMessage) {
      const authHeaders = await getWalletAuthHeaders(options.signMessage, wallet);
      Object.assign(headers, authHeaders);
    }

    const response = await api.post('/bounty/start', {
      tier,
      playerWallet: wallet,
      bountyPda: options?.bountyPda,
      transactionSignature: options?.transactionSignature,
    }, { headers });

    if (response.data.success && response.data.data) {
      return { success: true, data: response.data.data };
    }

    return { success: false, error: response.data.error || 'Failed to start bounty' };
  } catch (error: any) {
    logError('[API] Start bounty error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to start bounty',
    };
  }
}

/**
 * Start a bounty with pre-signed auth headers.
 * Use this when auth was signed before the on-chain tx to avoid double MWA prompts.
 */
export async function startBountyWithHeaders(
  wallet: string,
  tier: TierNumber,
  options: {
    bountyPda?: string;
    transactionSignature?: string;
  },
  headers: Record<string, string>,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await api.post('/bounty/start', {
      tier,
      playerWallet: wallet,
      bountyPda: options.bountyPda,
      transactionSignature: options.transactionSignature,
    }, { headers });

    if (response.data.success && response.data.data) {
      return { success: true, data: response.data.data };
    }

    return { success: false, error: response.data.error || 'Failed to start bounty' };
  } catch (error: any) {
    logError('[API] Start bounty error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to start bounty',
    };
  }
}

/**
 * Submit a photo for AI validation.
 * In demo mode: uses /bounty/demo/submit (no auth).
 * In devnet mode: uses /bounty/submit (with wallet auth headers).
 */
export async function submitPhoto(
  bountyId: string,
  photoUri: string,
  attestation?: AttestationPayload,
  authOptions?: {
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    walletAddress: string;
  }
): Promise<{ success: boolean; validation?: ValidationResult; error?: string }> {
  try {
    const endpoint = DEMO_MODE.USE_DEMO_ENDPOINTS ? '/bounty/demo/submit' : '/bounty/submit';

    // Validate file size before uploading (backend enforces 10MB limit via multer)
    const fileInfo = await FileSystem.getInfoAsync(photoUri);
    if (!fileInfo.exists) {
      return { success: false, error: 'Photo file not found' };
    }
    if (fileInfo.size && fileInfo.size > MAX_PHOTO_SIZE_BYTES) {
      return {
        success: false,
        error: `Photo too large (${(fileInfo.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`,
      };
    }

    // Create form data with photo
    const formData = new FormData();
    formData.append('bountyId', bountyId);
    // playerWallet is required by backend for ownership verification
    if (authOptions?.walletAddress) {
      formData.append('playerWallet', authOptions.walletAddress);
    }
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'capture.jpg',
    } as any);

    if (attestation) {
      formData.append('attestation', JSON.stringify(attestation));
    }

    log(`[API] Submitting photo for bounty: ${bountyId}${attestation ? ` [${attestation.type} attestation]` : ''}`);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
      'ngrok-skip-browser-warning': '1',
    };

    const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
      headers,
      timeout: 60000, // AI validation can take time
    });

    log('[API] Validation response:', response.data);

    // Handle devnet response format (data.validation) vs demo format (validation)
    const validation = response.data.data?.validation || response.data.validation;
    const status = response.data.data?.status || (validation?.isValid ? 'won' : 'lost');

    if (response.data.success && validation) {
      return {
        success: true,
        validation: {
          ...validation,
          // Normalize: devnet returns transactionSignature at top level
          transactionSignature: response.data.data?.transactionSignature,
          payout: response.data.data?.payout,
          singularityWon: response.data.data?.singularityWon,
        },
      };
    }

    return {
      success: false,
      error: response.data.error || 'Validation failed',
    };
  } catch (error: any) {
    logError('[API] Submit photo error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to validate photo',
    };
  }
}

/**
 * Get bounty status
 */
export async function getBountyStatus(
  bountyId: string
): Promise<{ success: boolean; bounty?: Bounty; error?: string }> {
  try {
    const response = await api.get(`/bounty/${bountyId}`);
    return {
      success: true,
      bounty: response.data.data,
    };
  } catch (error: any) {
    logError('[API] Get bounty error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to get bounty',
    };
  }
}

/**
 * Get player's active bounty
 */
export async function getPlayerBounty(
  wallet: string
): Promise<{ success: boolean; bounty?: Bounty | null; error?: string }> {
  try {
    const response = await api.get(`/bounty/player/${wallet}`);
    return {
      success: true,
      bounty: response.data.data || null,
    };
  } catch (error: any) {
    // 404 is expected when player has no active bounty
    if (error.response?.status === 404) {
      return {
        success: true,
        bounty: null,
      };
    }
    logError('[API] Get player bounty error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to get player bounty',
    };
  }
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await api.get('/health');
    return response.data.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Resolve wallet address to .skr domain name
 */
export async function resolveSkrName(
  address: string
): Promise<{ success: boolean; skrName?: string | null; error?: string }> {
  try {
    const response = await api.get(`/skr/lookup/${address}`);

    if (response.data.success) {
      return {
        success: true,
        skrName: response.data.data.skrName || null,
      };
    }

    return {
      success: false,
      error: response.data.error || 'Failed to resolve .skr name',
    };
  } catch (error: any) {
    logError('[API] Resolve .skr error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to resolve .skr name',
    };
  }
}

export default {
  prepareBounty,
  startBounty,
  startBountyWithHeaders,
  submitPhoto,
  getBountyStatus,
  getPlayerBounty,
  healthCheck,
  resolveSkrName,
  getWalletAuthHeaders,
};
