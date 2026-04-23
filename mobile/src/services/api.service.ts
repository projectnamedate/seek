import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { Bounty, TierNumber, ValidationResult, AttestationPayload } from '../types';
import { API_BASE_URL } from '../config';
import { encodeBase58 } from '../utils/bs58';

// Dev-only logging - stripped from production builds
const log = (...args: any[]) => __DEV__ && console.log(...args);
const logError = (...args: any[]) => __DEV__ && console.error(...args);

// Max photo upload size (10MB) - matches backend multer limit
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
  },
});

/**
 * Auth operations the backend's `requireWalletAuth` middleware accepts.
 */
export type AuthOperation = 'prepare' | 'submit';

/**
 * Generate wallet auth headers for an authenticated endpoint.
 * Signs message: "seek:{operation}:{walletAddress}:{timestamp}"
 * Backend verifies Ed25519 signature within 120s window AND consumes a Redis
 * nonce so the same (op, wallet, ts, sig) tuple can't be replayed.
 *
 * Operation binding prevents reuse across endpoints — a /prepare auth header
 * cannot be replayed against /submit.
 */
export async function getWalletAuthHeaders(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  walletAddress: string,
  operation: AuthOperation,
): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  const message = `seek:${operation}:${walletAddress}:${timestamp}`;
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
 * Wallet auth required (defeats targeted PDA-poisoning DoS).
 *
 * Pass `authHeaders` from `getWalletAuthHeaders(signMessage, wallet, 'prepare')`.
 */
export async function prepareBounty(
  playerWallet: string,
  tier: TierNumber,
  authHeaders: Record<string, string>,
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
    }, { headers: authHeaders });

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
 * Start a new bounty hunt. No auth header required — backend's
 * verifyTransaction parses the on-chain accept_bounty tx and asserts
 * (player, bountyPda, programId) match. The on-chain signature IS the
 * authorization for /start.
 */
export async function startBounty(
  wallet: string,
  tier: TierNumber,
  options: {
    bountyPda: string;
    transactionSignature: string;
  },
): Promise<{ success: boolean; bounty?: Bounty; data?: any; error?: string }> {
  try {
    const response = await api.post('/bounty/start', {
      tier,
      playerWallet: wallet,
      bountyPda: options.bountyPda,
      transactionSignature: options.transactionSignature,
    });

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
    const endpoint = '/bounty/submit';

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

    // Wallet auth headers — backend's requireWalletAuth('submit') runs after
    // multer parses FormData and verifies the per-operation signed message.
    const submitHeaders: Record<string, string> = { 'ngrok-skip-browser-warning': '1' };
    if (authOptions?.signMessage && authOptions?.walletAddress) {
      const wAuth = await getWalletAuthHeaders(authOptions.signMessage, authOptions.walletAddress, 'submit');
      Object.assign(submitHeaders, wAuth);
    }

    log(`[API] Submitting photo for bounty: ${bountyId} | uri: ${photoUri} | size: ${fileInfo.size} | wallet: ${authOptions?.walletAddress || 'none'}${attestation ? ` | ${attestation.type} attestation` : ''}`);
    log(`[API] Endpoint: ${API_BASE_URL}${endpoint}`);

    // Use fetch instead of axios — better multipart/FormData support on Android
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const fetchResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: submitHeaders,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseText = await fetchResponse.text();
    log(`[API] Raw response (${fetchResponse.status}): ${responseText.substring(0, 500)}`);
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      return { success: false, error: `Non-JSON response (${fetchResponse.status}): ${responseText.substring(0, 100)}` };
    }

    if (!fetchResponse.ok) {
      return {
        success: false,
        error: responseData.error || `Server error: ${fetchResponse.status}`,
      };
    }

    // Handle devnet response format (data.validation) vs demo format (validation)
    const validation = responseData.data?.validation || responseData.validation;

    if (responseData.success && validation) {
      return {
        success: true,
        validation: {
          ...validation,
          // Normalize: devnet returns transactionSignature at top level
          transactionSignature: responseData.data?.transactionSignature,
          payout: responseData.data?.payout,
          singularityWon: responseData.data?.singularityWon,
        },
      };
    }

    return {
      success: false,
      error: responseData.error || 'Validation failed',
    };
  } catch (error: any) {
    const detail = error.message || 'Unknown error';
    logError(`[API] Submit photo error: ${detail}`);
    return {
      success: false,
      error: detail,
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
  submitPhoto,
  getBountyStatus,
  getPlayerBounty,
  healthCheck,
  resolveSkrName,
  getWalletAuthHeaders,
};
