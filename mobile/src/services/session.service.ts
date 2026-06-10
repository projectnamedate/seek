import axios from 'axios';
import { API_BASE_URL, CLIENT_PROTOCOL_VERSION } from '../config';
import { encodeBase58 } from '../utils/bs58';

const SESSION_REFRESH_SKEW_MS = 60_000;

export interface BountySessionProof {
  sessionId: string;
  sessionToken: string;
  walletAddress: string;
  sgtMintAddress: string;
  clientProtocolVersion: number;
  issuedAt: string;
  expiresAt: string;
}

interface ChallengeResponse {
  challengeId: string;
  message: string;
  expiresAt: string;
}

const sessionCache = new Map<string, BountySessionProof>();

export async function getOrCreateBountySession(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<BountySessionProof> {
  const cached = sessionCache.get(walletAddress);
  if (cached && Date.parse(cached.expiresAt) - Date.now() > SESSION_REFRESH_SKEW_MS) {
    return cached;
  }

  try {
    const challengeRes = await axios.post(`${API_BASE_URL}/session/challenge`, {
      walletAddress,
      clientProtocolVersion: CLIENT_PROTOCOL_VERSION,
    }, {
      headers: { 'ngrok-skip-browser-warning': '1' },
    });

    if (!challengeRes.data?.success || !challengeRes.data?.data) {
      throw new Error(challengeRes.data?.error || 'Failed to create bounty session');
    }

    const challenge = challengeRes.data.data as ChallengeResponse;
    if (Date.parse(challenge.expiresAt) <= Date.now()) {
      throw new Error('Bounty session challenge expired');
    }

    const messageBytes = new TextEncoder().encode(challenge.message);
    const signatureBytes = await signMessage(messageBytes);
    const signature = encodeBase58(signatureBytes);

    const verifyRes = await axios.post(`${API_BASE_URL}/session/verify`, {
      walletAddress,
      challengeId: challenge.challengeId,
      signature,
    }, {
      headers: { 'ngrok-skip-browser-warning': '1' },
    });

    if (!verifyRes.data?.success || !verifyRes.data?.data) {
      throw new Error(verifyRes.data?.error || 'Failed to verify bounty session');
    }

    const session = verifyRes.data.data as BountySessionProof;
    sessionCache.set(walletAddress, session);
    return session;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to create bounty session');
  }
}

export function clearBountySessionCache(walletAddress?: string): void {
  if (walletAddress) {
    sessionCache.delete(walletAddress);
    return;
  }
  sessionCache.clear();
}

export function bountySessionHeaders(sessionToken?: string): Record<string, string> {
  return sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};
}
