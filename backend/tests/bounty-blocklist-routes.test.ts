import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import express from 'express';

import bountyRouter from '../src/routes/bounty.routes';
import { BLOCKED_BOUNTY_ERROR } from '../src/services/bounty-blocklist.service';

const BLOCKED_WALLET = 'Dfui8Dph4AKDVgzW5deynTvJN4n3UPvam3Sb4aH7BgU6';

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
