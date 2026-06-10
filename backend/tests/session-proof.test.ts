import test from 'node:test';
import assert from 'node:assert/strict';

import bs58 from 'bs58';
import nacl from 'tweetnacl';

const SGT_MINT = 'So11111111111111111111111111111111111111112';

function makeWallet() {
  const keypair = nacl.sign.keyPair();
  return {
    keypair,
    walletAddress: bs58.encode(keypair.publicKey),
  };
}

function signMessage(message: string, secretKey: Uint8Array): string {
  const messageBytes = new TextEncoder().encode(message);
  return bs58.encode(nacl.sign.detached(messageBytes, secretKey));
}

test('session proof verifies wallet signature, binds SGT mint, and issues a reusable token', async () => {
  process.env.REDIS_URL = '';
  const {
    clearBountySessionStateForTests,
    createBountySessionChallenge,
    verifyBountySessionChallenge,
    verifyBountySessionToken,
  } = await import('../src/services/bounty-session.service');

  clearBountySessionStateForTests();
  const { keypair, walletAddress } = makeWallet();
  const challenge = await createBountySessionChallenge({
    walletAddress,
    clientProtocolVersion: 3,
  });

  const signature = signMessage(challenge.message, keypair.secretKey);
  const session = await verifyBountySessionChallenge(
    { walletAddress, challengeId: challenge.challengeId, signature },
    {
      verifySgtOwnership: async (wallet) => ({
        verified: true,
        sgtMintAddress: SGT_MINT,
        walletAddress: wallet,
        verifiedAt: new Date('2026-05-25T12:00:00.000Z'),
      }),
    },
  );

  assert.equal(session.walletAddress, walletAddress);
  assert.equal(session.sgtMintAddress, SGT_MINT);
  assert.equal(session.clientProtocolVersion, 3);
  assert.match(session.sessionToken, /^seek_sess_[0-9a-f]{64}$/);

  const tokenSession = await verifyBountySessionToken(session.sessionToken);
  assert.equal(tokenSession?.sessionId, session.sessionId);
  assert.equal(tokenSession?.walletAddress, walletAddress);
  assert.equal(tokenSession?.sgtMintAddress, SGT_MINT);
});

test('session proof rejects replaying the same challenge', async () => {
  process.env.REDIS_URL = '';
  const {
    clearBountySessionStateForTests,
    createBountySessionChallenge,
    verifyBountySessionChallenge,
  } = await import('../src/services/bounty-session.service');

  clearBountySessionStateForTests();
  const { keypair, walletAddress } = makeWallet();
  const challenge = await createBountySessionChallenge({
    walletAddress,
    clientProtocolVersion: 3,
  });
  const signature = signMessage(challenge.message, keypair.secretKey);
  const deps = {
    verifySgtOwnership: async (wallet: string) => ({
      verified: true,
      sgtMintAddress: SGT_MINT,
      walletAddress: wallet,
      verifiedAt: new Date('2026-05-25T12:00:00.000Z'),
    }),
  };

  await verifyBountySessionChallenge({ walletAddress, challengeId: challenge.challengeId, signature }, deps);

  await assert.rejects(
    verifyBountySessionChallenge({ walletAddress, challengeId: challenge.challengeId, signature }, deps),
    /already used/i,
  );
});

test('session proof rejects wallet mismatch before issuing a token', async () => {
  process.env.REDIS_URL = '';
  const {
    clearBountySessionStateForTests,
    createBountySessionChallenge,
    verifyBountySessionChallenge,
    verifyBountySessionToken,
  } = await import('../src/services/bounty-session.service');

  clearBountySessionStateForTests();
  const owner = makeWallet();
  const attacker = makeWallet();
  const challenge = await createBountySessionChallenge({
    walletAddress: owner.walletAddress,
    clientProtocolVersion: 3,
  });
  const attackerSignature = signMessage(challenge.message, attacker.keypair.secretKey);

  await assert.rejects(
    verifyBountySessionChallenge({
      walletAddress: attacker.walletAddress,
      challengeId: challenge.challengeId,
      signature: attackerSignature,
    }),
    /wallet mismatch/i,
  );

  assert.equal(await verifyBountySessionToken('seek_sess_' + '0'.repeat(64)), null);
});

test('session proof rejects wallets without a verified SGT mint', async () => {
  process.env.REDIS_URL = '';
  const {
    clearBountySessionStateForTests,
    createBountySessionChallenge,
    verifyBountySessionChallenge,
  } = await import('../src/services/bounty-session.service');

  clearBountySessionStateForTests();
  const { keypair, walletAddress } = makeWallet();
  const challenge = await createBountySessionChallenge({
    walletAddress,
    clientProtocolVersion: 3,
  });
  const signature = signMessage(challenge.message, keypair.secretKey);

  await assert.rejects(
    verifyBountySessionChallenge(
      { walletAddress, challengeId: challenge.challengeId, signature },
      {
        verifySgtOwnership: async (wallet) => ({
          verified: false,
          sgtMintAddress: null,
          walletAddress: wallet,
          verifiedAt: null,
          error: 'No Seeker Genesis Token found',
        }),
      },
    ),
    /seeker genesis token required/i,
  );
});
