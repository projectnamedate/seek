import axios from 'axios';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { Bounty, TierNumber, ValidationResult } from '../types';

// API configuration
const API_BASE_URL = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://api.seek.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Convert tier number to bet amount
const tierToBet = (tier: TierNumber): number => {
  const bets: Record<TierNumber, number> = {
    1: 100,
    2: 200,
    3: 300,
  };
  return bets[tier];
};

/**
 * Start a new bounty hunt
 */
export async function startBounty(
  wallet: string,
  tier: TierNumber
): Promise<{ success: boolean; bounty?: Bounty; error?: string }> {
  try {
    const response = await api.post('/bounty/start', {
      wallet,
      tier,
      betAmount: tierToBet(tier),
    });

    return {
      success: true,
      bounty: response.data.bounty,
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
 * Submit a photo for AI validation
 */
export async function submitPhoto(
  bountyId: string,
  photoUri: string
): Promise<{ success: boolean; validation?: ValidationResult; error?: string }> {
  try {
    // Read photo as base64
    const base64 = await readAsStringAsync(photoUri, {
      encoding: EncodingType.Base64,
    });

    // Create form data
    const formData = new FormData();
    formData.append('bountyId', bountyId);
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'capture.jpg',
    } as any);

    const response = await axios.post(`${API_BASE_URL}/bounty/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // AI validation can take time
    });

    return {
      success: true,
      validation: response.data.validation,
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
      bounty: response.data.bounty,
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
      bounty: response.data.bounty || null,
    };
  } catch (error: any) {
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
