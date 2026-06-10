import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { Bounty, TierNumber, ValidationResult, AttestationPayload } from '../types';
import { API_BASE_URL, CLIENT_PROTOCOL_VERSION } from '../config';
import { encodeBase58 } from '../utils/bs58';
import { normalizeSkrName } from '../utils/format';
import { bountySessionHeaders } from './session.service';

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

export type ProtocolStats = {
  bounties: {
    active: number;
    completed: number;
    won: number;
    lost: number;
    expired: number;
  };
  vaults: {
    house: string;
    singularity: string;
  };
  winRate: string;
};

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
 * New builds include a reusable off-chain bounty session token; /start still
 * authorizes the paid bounty with the signed accept_bounty transaction.
 */
export async function prepareBounty(
  playerWallet: string,
  tier: TierNumber,
  options?: {
    permissionsConfirmed?: boolean;
    authHeaders?: Record<string, string>;
    sessionToken?: string;
  },
): Promise<{
  success: boolean;
  data?: {
    commitment: number[];
    prepareId: string;
    timestamp: number;
    bountyPda: string;
    entryAmount: number;
    entryAmountSkr?: number;
    instructionVersion?: 1 | 2;
    returnAmount?: number;
    returnAmountSkr?: number;
  };
  error?: string;
}> {
  try {
    const headers = {
      'ngrok-skip-browser-warning': '1',
      ...bountySessionHeaders(options?.sessionToken),
      ...(options?.authHeaders || {}),
    };

    const response = await api.post('/bounty/prepare', {
      tier,
      playerWallet,
      permissionsConfirmed: options?.permissionsConfirmed === true,
      clientProtocolVersion: CLIENT_PROTOCOL_VERSION,
    }, { headers });

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
 * Start a new bounty hunt. The optional bounty session token binds this call to
 * the pre-transaction session; the on-chain accept_bounty signature remains the
 * only transaction authorization.
 */
export async function startBounty(
  wallet: string,
  tier: TierNumber,
  options: {
    bountyPda: string;
    transactionSignature: string;
    prepareId?: string;
    sessionToken?: string;
  },
): Promise<{ success: boolean; bounty?: Bounty; data?: any; error?: string }> {
  try {
    const response = await api.post('/bounty/start', {
      tier,
      playerWallet: wallet,
      bountyPda: options.bountyPda,
      transactionSignature: options.transactionSignature,
      prepareId: options.prepareId,
    }, {
      headers: {
        'ngrok-skip-browser-warning': '1',
        ...bountySessionHeaders(options.sessionToken),
      },
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
 * Uses the /start submitToken in current builds. Wallet auth remains as a
 * backwards-compatible fallback for older installed builds.
 */
export async function submitPhoto(
  bountyId: string,
  photoUri: string,
  attestation?: AttestationPayload,
  authOptions?: {
    submitToken?: string;
    sessionToken?: string;
    signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
    walletAddress?: string;
  }
): Promise<{
  success: boolean;
  validation?: ValidationResult;
  bountyPda?: string;
  challengeEndsAt?: number;
  transactionSignature?: string;
  payout?: string;
  singularityWon?: boolean;
  error?: string;
}> {
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
    if (authOptions?.submitToken) {
      formData.append('submitToken', authOptions.submitToken);
    }
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'capture.jpg',
    } as any);

    if (attestation) {
      formData.append('attestation', JSON.stringify(attestation));
    }

    // Wallet auth headers are only used by old builds without submitToken.
    const submitHeaders: Record<string, string> = {
      'ngrok-skip-browser-warning': '1',
      ...bountySessionHeaders(authOptions?.sessionToken),
    };
    if (!authOptions?.submitToken && authOptions?.signMessage && authOptions?.walletAddress) {
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

    const validation = responseData.data?.validation;

    if (responseData.success && validation) {
      return {
        success: true,
        validation: {
          ...validation,
          // Normalize: devnet returns transactionSignature at top level
          transactionSignature: responseData.data?.transactionSignature,
          payout: responseData.data?.payout,
          singularityWon: responseData.data?.singularityWon,
          bountyPda: responseData.data?.bountyPda,
          challengeEndsAt: responseData.data?.challengeEndsAt,
        },
        bountyPda: responseData.data?.bountyPda,
        challengeEndsAt: responseData.data?.challengeEndsAt,
        transactionSignature: responseData.data?.transactionSignature,
        payout: responseData.data?.payout,
        singularityWon: responseData.data?.singularityWon,
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
 * Get public protocol statistics.
 */
export async function getProtocolStats(): Promise<{
  success: boolean;
  stats?: ProtocolStats;
  error?: string;
}> {
  try {
    const response = await api.get('/health/stats');
    if (response.data.success && response.data.data) {
      return { success: true, stats: response.data.data };
    }

    return {
      success: false,
      error: response.data.error || 'Failed to fetch protocol stats',
    };
  } catch (error: any) {
    logError('[API] Protocol stats error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch protocol stats',
    };
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
      const skrName = response.data.data.skrName;
      return {
        success: true,
        skrName: typeof skrName === 'string' ? normalizeSkrName(skrName) : null,
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
  getProtocolStats,
  resolveSkrName,
  getWalletAuthHeaders,
};
