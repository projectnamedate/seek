/**
 * Seeker Genesis Token (SGT) verification service for mobile
 *
 * Handles the SIWS verification flow with the backend to prove
 * Seeker device ownership via the SGT NFT.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const log = (...args: any[]) => __DEV__ && console.log(...args);

// API base URL (matches api.service.ts)
const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3001/api'
  : 'https://api.seek.app/api';

const SGT_CACHE_KEY = '@seek_sgt_verified';

export interface SGTVerificationState {
  verified: boolean;
  sgtMintAddress: string | null;
  verifiedAt: string | null;
  walletAddress: string | null;
}

const DEFAULT_STATE: SGTVerificationState = {
  verified: false,
  sgtMintAddress: null,
  verifiedAt: null,
  walletAddress: null,
};

/**
 * Get cached SGT verification state from AsyncStorage
 */
export async function getCachedVerification(): Promise<SGTVerificationState> {
  try {
    const cached = await AsyncStorage.getItem(SGT_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    log('[SGT] Cache read error:', error);
  }
  return DEFAULT_STATE;
}

/**
 * Run the full SGT verification flow:
 * 1. Request SIWS nonce from backend
 * 2. Sign message with wallet (via MWA signMessage)
 * 3. Send signature to backend for verification
 * 4. Cache result
 */
export async function verifySGT(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<SGTVerificationState> {
  try {
    log('[SGT] Starting verification for:', walletAddress);

    // Step 1: Get nonce from backend
    const nonceRes = await axios.post(`${API_BASE_URL}/sgt/nonce`, { walletAddress });

    if (nonceRes.data.data?.alreadyVerified) {
      log('[SGT] Already verified');
      const state: SGTVerificationState = {
        verified: true,
        sgtMintAddress: null,
        verifiedAt: nonceRes.data.data.verifiedAt,
        walletAddress,
      };
      await AsyncStorage.setItem(SGT_CACHE_KEY, JSON.stringify(state));
      return state;
    }

    const { message } = nonceRes.data.data;

    // Step 2: Serialize SIWS message and sign it
    const messageString = [
      `${message.domain} wants you to sign in with your Solana account:`,
      message.address,
      '',
      message.statement,
      '',
      `URI: ${message.uri}`,
      `Version: ${message.version}`,
      `Chain ID: ${message.chainId}`,
      `Nonce: ${message.nonce}`,
      `Issued At: ${message.issuedAt}`,
    ].join('\n');

    const messageBytes = new TextEncoder().encode(messageString);
    const signatureBytes = await signMessage(messageBytes);

    // Convert signature to base58
    const bs58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let signatureBase58 = '';
    let num = BigInt('0x' + Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
    while (num > 0n) {
      signatureBase58 = bs58Chars[Number(num % 58n)] + signatureBase58;
      num = num / 58n;
    }

    // Step 3: Submit to backend
    const verifyRes = await axios.post(`${API_BASE_URL}/sgt/verify`, {
      walletAddress,
      signature: signatureBase58,
      message,
    });

    const result: SGTVerificationState = {
      verified: verifyRes.data.data?.verified || false,
      sgtMintAddress: verifyRes.data.data?.sgtMintAddress || null,
      verifiedAt: verifyRes.data.data?.verifiedAt || null,
      walletAddress,
    };

    // Step 4: Cache
    await AsyncStorage.setItem(SGT_CACHE_KEY, JSON.stringify(result));
    log('[SGT] Verification result:', result.verified);

    return result;
  } catch (error: any) {
    log('[SGT] Verification error:', error?.message || error);
    return DEFAULT_STATE;
  }
}

/**
 * Check SGT status from backend (no signing required)
 */
export async function checkSGTStatus(walletAddress: string): Promise<SGTVerificationState> {
  try {
    const res = await axios.get(`${API_BASE_URL}/sgt/status/${walletAddress}`);
    const data = res.data.data;

    const state: SGTVerificationState = {
      verified: data?.verified || false,
      sgtMintAddress: data?.sgtMintAddress || null,
      verifiedAt: data?.verifiedAt || null,
      walletAddress,
    };

    if (state.verified) {
      await AsyncStorage.setItem(SGT_CACHE_KEY, JSON.stringify(state));
    }

    return state;
  } catch {
    return DEFAULT_STATE;
  }
}

/**
 * Get demo SGT verification (always verified)
 */
export function getDemoVerification(walletAddress: string): SGTVerificationState {
  return {
    verified: true,
    sgtMintAddress: 'DemoSGTMint' + walletAddress.slice(0, 8),
    verifiedAt: new Date().toISOString(),
    walletAddress,
  };
}

/**
 * Clear cached verification (on disconnect)
 */
export async function clearVerification(): Promise<void> {
  await AsyncStorage.removeItem(SGT_CACHE_KEY);
}

export default {
  getCachedVerification,
  verifySGT,
  checkSGTStatus,
  getDemoVerification,
  clearVerification,
};
