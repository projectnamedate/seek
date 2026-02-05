import axios from 'axios';
import { Bounty, TierNumber, ValidationResult } from '../types';

// API configuration
// For demo, use your local network IP or ngrok tunnel
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:3001/api' // Update with your local IP
  : 'https://api.seek.app/api';

// Demo mode - uses simplified endpoints without blockchain
const DEMO_MODE = true;

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
    console.error('[API] Start bounty error:', error);
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
  photoUri: string
): Promise<{ success: boolean; validation?: ValidationResult; error?: string }> {
  try {
    const endpoint = DEMO_MODE ? '/bounty/demo/submit' : '/bounty/submit';

    // Create form data with photo
    const formData = new FormData();
    formData.append('bountyId', bountyId);
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'capture.jpg',
    } as any);

    console.log(`[API] Submitting photo for bounty: ${bountyId}`);

    const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // AI validation can take time
    });

    console.log('[API] Validation response:', response.data);

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
    console.error('[API] Submit photo error:', error);
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
    console.error('[API] Get bounty error:', error);
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
    console.error('[API] Get player bounty error:', error);
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

export default {
  startBounty,
  submitPhoto,
  getBountyStatus,
  getPlayerBounty,
  healthCheck,
};
