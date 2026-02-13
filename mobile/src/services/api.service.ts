import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { Bounty, TierNumber, ValidationResult, AttestationPayload } from '../types';

// Dev-only logging - stripped from production builds
const log = (...args: any[]) => __DEV__ && console.log(...args);
const logError = (...args: any[]) => __DEV__ && console.error(...args);

// API configuration
// For demo, use your local network IP or ngrok tunnel
const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3001/api' // 10.0.2.2 = host machine from Android emulator
  : 'https://api.seek.app/api';

// Demo mode - uses simplified endpoints without blockchain
const DEMO_MODE = true;

// Max photo upload size (10MB) - matches backend multer limit
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Start a new bounty hunt (demo mode)
 * Uses real backend but simplified flow
 */
export async function startBounty(
  wallet: string,
  tier: TierNumber
): Promise<{ success: boolean; bounty?: Bounty; error?: string }> {
  try {
    const endpoint = DEMO_MODE ? '/bounty/demo/start' : '/bounty/start';

    const response = await api.post(endpoint, {
      tier,
      wallet,
    });

    if (response.data.success && response.data.bounty) {
      return {
        success: true,
        bounty: response.data.bounty,
      };
    }

    return {
      success: false,
      error: response.data.error || 'Failed to start bounty',
    };
  } catch (error: any) {
    logError('[API] Start bounty error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to start bounty',
    };
  }
}

/**
 * Submit a photo for AI validation (demo mode)
 * Uses REAL GPT-4V validation!
 */
export async function submitPhoto(
  bountyId: string,
  photoUri: string,
  attestation?: AttestationPayload
): Promise<{ success: boolean; validation?: ValidationResult; error?: string }> {
  try {
    const endpoint = DEMO_MODE ? '/bounty/demo/submit' : '/bounty/submit';

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
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'capture.jpg',
    } as any);

    if (attestation) {
      formData.append('attestation', JSON.stringify(attestation));
    }

    log(`[API] Submitting photo for bounty: ${bountyId}${attestation ? ` [${attestation.type} attestation]` : ''}`);

    const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // AI validation can take time
    });

    log('[API] Validation response:', response.data);

    if (response.data.success && response.data.validation) {
      return {
        success: true,
        validation: response.data.validation,
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
  startBounty,
  submitPhoto,
  getBountyStatus,
  getPlayerBounty,
  healthCheck,
  resolveSkrName,
};
