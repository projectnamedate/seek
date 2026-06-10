import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { config } from '../config';
import { getRedis, RK, redisConsumeNonce } from './redis.service';
import {
  SGTVerificationResult,
  verifySGTOwnershipForWallet,
} from './sgt.service';
import {
  BLOCKED_BOUNTY_ERROR,
  isBlockedBountyActor,
} from './bounty-blocklist.service';

const SESSION_MESSAGE_VERSION = 'v1';
const SESSION_DOMAIN = 'seek.mythx.art';
const SESSION_CHALLENGE_TTL_SECONDS = 120;
const SESSION_TOKEN_PREFIX = 'seek_sess_';
const SESSION_TOKEN_PATTERN = /^seek_sess_[0-9a-f]{64}$/;

export class BountySessionError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BountySessionError';
  }
}

export interface CreateBountySessionChallengeInput {
  walletAddress: string;
  clientProtocolVersion?: number;
}

export interface BountySessionChallenge {
  challengeId: string;
  walletAddress: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  clientProtocolVersion: number;
  domain: string;
  message: string;
}

export interface VerifyBountySessionChallengeInput {
  walletAddress: string;
  challengeId: string;
  signature: string;
}

export interface BountySession {
  sessionId: string;
  walletAddress: string;
  sgtMintAddress: string;
  clientProtocolVersion: number;
  issuedAt: string;
  expiresAt: string;
}

export interface IssuedBountySession extends BountySession {
  sessionToken: string;
}

export interface BountySessionDependencies {
  verifySgtOwnership?: (walletAddress: string) => Promise<SGTVerificationResult>;
  isBlockedActor?: typeof isBlockedBountyActor;
}

const memoryChallenges = new Map<string, BountySessionChallenge>();
const memoryChallengeUses = new Set<string>();
const memorySessions = new Map<string, BountySession>();

export function buildBountySessionMessage(challenge: {
  walletAddress: string;
  challengeId: string;
  nonce: string;
  issuedAt: string;
  clientProtocolVersion: number;
  domain?: string;
}): string {
  return [
    `seek-session:${SESSION_MESSAGE_VERSION}`,
    `domain: ${challenge.domain ?? SESSION_DOMAIN}`,
    `wallet: ${challenge.walletAddress}`,
    `challengeId: ${challenge.challengeId}`,
    `nonce: ${challenge.nonce}`,
    `issuedAt: ${challenge.issuedAt}`,
    `clientProtocolVersion: ${challenge.clientProtocolVersion}`,
  ].join('\n');
}

export async function createBountySessionChallenge(
  input: CreateBountySessionChallengeInput,
): Promise<BountySessionChallenge> {
  validateWalletAddress(input.walletAddress);
  const clientProtocolVersion = input.clientProtocolVersion ?? 0;
  assertSupportedClientProtocol(clientProtocolVersion);

  const issuedAtDate = new Date();
  const expiresAtDate = new Date(issuedAtDate.getTime() + SESSION_CHALLENGE_TTL_SECONDS * 1000);
  const challengeId = randomBytes(24).toString('hex');
  const nonce = randomBytes(24).toString('hex');
  const base = {
    challengeId,
    walletAddress: input.walletAddress,
    nonce,
    issuedAt: issuedAtDate.toISOString(),
    expiresAt: expiresAtDate.toISOString(),
    clientProtocolVersion,
    domain: SESSION_DOMAIN,
  };
  const challenge: BountySessionChallenge = {
    ...base,
    message: buildBountySessionMessage(base),
  };

  await storeChallenge(challenge);
  return challenge;
}

export async function verifyBountySessionChallenge(
  input: VerifyBountySessionChallengeInput,
  deps: BountySessionDependencies = {},
): Promise<IssuedBountySession> {
  validateWalletAddress(input.walletAddress);

  if (await isChallengeAlreadyUsed(input.challengeId)) {
    throw new BountySessionError(401, 'Session challenge already used');
  }

  const challenge = await loadChallenge(input.challengeId);
  if (!challenge) {
    throw new BountySessionError(401, 'Session challenge not found or expired');
  }

  if (challenge.walletAddress !== input.walletAddress) {
    throw new BountySessionError(403, 'Session wallet mismatch');
  }
  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    throw new BountySessionError(401, 'Session challenge expired');
  }
  assertSupportedClientProtocol(challenge.clientProtocolVersion);

  if (!verifyWalletSignature(input.walletAddress, challenge.message, input.signature)) {
    throw new BountySessionError(401, 'Invalid session signature');
  }

  const challengeFresh = await reserveChallengeUse(challenge.challengeId);
  if (!challengeFresh) {
    throw new BountySessionError(401, 'Session challenge already used');
  }

  const verifySgtOwnership = deps.verifySgtOwnership ?? verifySGTOwnershipForWallet;
  const sgtResult = await verifySgtOwnership(input.walletAddress);
  if (!sgtResult.verified || !sgtResult.sgtMintAddress) {
    throw new BountySessionError(403, 'Seeker Genesis Token required for bounty session');
  }

  const blocked = deps.isBlockedActor ?? isBlockedBountyActor;
  if (blocked({ walletAddress: input.walletAddress, sgtMintAddress: sgtResult.sgtMintAddress })) {
    throw new BountySessionError(403, BLOCKED_BOUNTY_ERROR);
  }

  const issuedAtDate = new Date();
  const ttlSeconds = Math.max(300, config.sessionProof.ttlSeconds);
  const session: BountySession = {
    sessionId: randomBytes(16).toString('hex'),
    walletAddress: input.walletAddress,
    sgtMintAddress: sgtResult.sgtMintAddress,
    clientProtocolVersion: challenge.clientProtocolVersion,
    issuedAt: issuedAtDate.toISOString(),
    expiresAt: new Date(issuedAtDate.getTime() + ttlSeconds * 1000).toISOString(),
  };
  const sessionToken = `${SESSION_TOKEN_PREFIX}${randomBytes(32).toString('hex')}`;

  await storeSession(sessionToken, session, ttlSeconds);
  await deleteChallenge(challenge.challengeId);
  return { ...session, sessionToken };
}

export async function verifyBountySessionToken(token: string): Promise<BountySession | null> {
  if (!SESSION_TOKEN_PATTERN.test(token)) return null;

  const tokenHash = hashSessionToken(token);
  const session = await loadSession(tokenHash);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    memorySessions.delete(tokenHash);
    return null;
  }
  return session;
}

export function clearBountySessionStateForTests(): void {
  memoryChallenges.clear();
  memoryChallengeUses.clear();
  memorySessions.clear();
}

function validateWalletAddress(walletAddress: string): void {
  try {
    const publicKey = new PublicKey(walletAddress);
    if (!PublicKey.isOnCurve(publicKey.toBytes())) {
      throw new Error('not on curve');
    }
  } catch {
    throw new BountySessionError(400, 'Invalid wallet address');
  }
}

function assertSupportedClientProtocol(clientProtocolVersion: number): void {
  if (
    !Number.isInteger(clientProtocolVersion) ||
    clientProtocolVersion < config.sessionProof.minClientProtocolVersion
  ) {
    throw new BountySessionError(
      426,
      `Client protocol version ${config.sessionProof.minClientProtocolVersion} required`,
    );
  }
}

function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string,
): boolean {
  let publicKey: PublicKey;
  let signatureBytes: Uint8Array;
  try {
    publicKey = new PublicKey(walletAddress);
    signatureBytes = bs58.decode(signature);
  } catch {
    return false;
  }

  const messageBytes = new TextEncoder().encode(message);
  return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
}

async function storeChallenge(challenge: BountySessionChallenge): Promise<void> {
  memoryChallenges.set(challenge.challengeId, challenge);
  setExpiringTimeout(() => memoryChallenges.delete(challenge.challengeId), SESSION_CHALLENGE_TTL_SECONDS);

  const r = await getSessionRedis();
  if (r) {
    await r.set(
      RK.bountySessionChallenge(challenge.challengeId),
      JSON.stringify(challenge),
      { EX: SESSION_CHALLENGE_TTL_SECONDS },
    );
  }
}

async function loadChallenge(challengeId: string): Promise<BountySessionChallenge | null> {
  const cached = memoryChallenges.get(challengeId);
  if (cached) return cached;

  const r = await getSessionRedis();
  if (!r) return null;

  const raw = await r.get(RK.bountySessionChallenge(challengeId));
  if (!raw) return null;

  try {
    const challenge = JSON.parse(raw) as BountySessionChallenge;
    memoryChallenges.set(challenge.challengeId, challenge);
    return challenge;
  } catch {
    await r.del(RK.bountySessionChallenge(challengeId));
    return null;
  }
}

async function reserveChallengeUse(challengeId: string): Promise<boolean> {
  if (!config.redis.url) {
    if (memoryChallengeUses.has(challengeId)) return false;
    memoryChallengeUses.add(challengeId);
    setExpiringTimeout(() => memoryChallengeUses.delete(challengeId), SESSION_CHALLENGE_TTL_SECONDS);
    return true;
  }

  return redisConsumeNonce(
    RK.bountySessionChallengeUse(challengeId),
    SESSION_CHALLENGE_TTL_SECONDS + 30,
  );
}

async function isChallengeAlreadyUsed(challengeId: string): Promise<boolean> {
  if (!config.redis.url) {
    return memoryChallengeUses.has(challengeId);
  }

  const r = await getSessionRedis();
  if (!r) return false;
  return (await r.exists(RK.bountySessionChallengeUse(challengeId))) > 0;
}

async function deleteChallenge(challengeId: string): Promise<void> {
  memoryChallenges.delete(challengeId);

  const r = await getSessionRedis();
  if (r) {
    await r.del(RK.bountySessionChallenge(challengeId));
  }
}

async function storeSession(
  token: string,
  session: BountySession,
  ttlSeconds: number,
): Promise<void> {
  const tokenHash = hashSessionToken(token);
  memorySessions.set(tokenHash, session);
  setExpiringTimeout(() => memorySessions.delete(tokenHash), ttlSeconds);

  const r = await getSessionRedis();
  if (r) {
    await r.set(RK.bountySessionToken(tokenHash), JSON.stringify(session), { EX: ttlSeconds });
  }
}

async function loadSession(tokenHash: string): Promise<BountySession | null> {
  const cached = memorySessions.get(tokenHash);
  if (cached) return cached;

  const r = await getSessionRedis();
  if (!r) return null;

  const raw = await r.get(RK.bountySessionToken(tokenHash));
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as BountySession;
    memorySessions.set(tokenHash, session);
    return session;
  } catch {
    await r.del(RK.bountySessionToken(tokenHash));
    return null;
  }
}

async function getSessionRedis() {
  const r = await getRedis();
  if (!r && config.redis.url) {
    throw new BountySessionError(503, 'Session store unavailable');
  }
  return r;
}

function hashSessionToken(token: string): string {
  const expectedPrefix = Buffer.from(SESSION_TOKEN_PREFIX);
  const actualPrefix = Buffer.from(token.slice(0, SESSION_TOKEN_PREFIX.length));
  if (
    expectedPrefix.length !== actualPrefix.length ||
    !timingSafeEqual(expectedPrefix, actualPrefix)
  ) {
    return '';
  }
  return createHash('sha256').update(token).digest('hex');
}

function setExpiringTimeout(callback: () => void, ttlSeconds: number): void {
  const timeout = setTimeout(callback, ttlSeconds * 1000);
  timeout.unref?.();
}
