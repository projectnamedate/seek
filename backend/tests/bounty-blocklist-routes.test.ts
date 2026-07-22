import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import express from 'express';

import bountyRouter from '../src/routes/bounty.routes';
import { BLOCKED_BOUNTY_ERROR } from '../src/services/bounty-blocklist.service';
import {
  identityForBountyLimits,
  recordIdentityDailyWin,
} from '../src/services/wallet-bounty-limit.service';
import * as sgtService from '../src/services/sgt.service';

const BLOCKED_WALLET = 'Dfui8Dph4AKDVgzW5deynTvJN4n3UPvam3Sb4aH7BgU6';
const BLOCKED_WALLET_2 = '3vw6SovWwMAWJeKEqeFuDG2JndEnNp3o7TqDWL4W2Cvv';

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api/bounty', bountyRouter);
  return app;
}

async function postJson(path: string, body: unknown): Promise<{ status: number; body: any }> {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('blocked wallet cannot prepare a bounty', async () => {
  const response = await postJson('/api/bounty/prepare', {
    tier: 1,
    playerWallet: BLOCKED_WALLET,
    permissionsConfirmed: true,
    clientProtocolVersion: 2,
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, BLOCKED_BOUNTY_ERROR);
});

test('blocked wallet cannot start a previously prepared bounty', async () => {
  const response = await postJson('/api/bounty/start', {
    tier: 1,
    playerWallet: BLOCKED_WALLET,
    bountyPda: '11111111111111111111111111111111',
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, BLOCKED_BOUNTY_ERROR);
});

test('newly blocked wallet cannot prepare a bounty', async () => {
  const response = await postJson('/api/bounty/prepare', {
    tier: 1,
    playerWallet: BLOCKED_WALLET_2,
    permissionsConfirmed: true,
    clientProtocolVersion: 3,
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, BLOCKED_BOUNTY_ERROR);
});

test('wallet cannot prepare after its SGT identity reaches the daily win cap', async () => {
  const playerWallet = '11111111111111111111111111111111';
  const sgtMintAddress = '22222222222222222222222222222222';
  const identity = identityForBountyLimits(playerWallet, sgtMintAddress);
  const originalCachedLookup = sgtService.isWalletSGTVerified;
  const originalOwnershipLookup = sgtService.verifySGTOwnershipForWallet;

  (sgtService as any).isWalletSGTVerified = async () => undefined;
  (sgtService as any).verifySGTOwnershipForWallet = async () => ({
    verified: true,
    sgtMintAddress,
    walletAddress: playerWallet,
    verifiedAt: new Date(),
  });

  try {
    await recordIdentityDailyWin(identity);
    await recordIdentityDailyWin(identity);

    const response = await postJson('/api/bounty/prepare', {
      tier: 1,
      playerWallet,
      permissionsConfirmed: true,
      clientProtocolVersion: 3,
    });

    assert.equal(response.status, 429);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error, 'Daily win limit reached');
  } finally {
    (sgtService as any).isWalletSGTVerified = originalCachedLookup;
    (sgtService as any).verifySGTOwnershipForWallet = originalOwnershipLookup;
  }
});
