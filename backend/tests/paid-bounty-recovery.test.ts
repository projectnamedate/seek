import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import express from 'express';

import bountyRouter from '../src/routes/bounty.routes';
import {
  createBounty,
  getBounty,
  getPreparedBountyTtlSeconds,
  isBountyEligibleForExpiry,
  markBountyValidating,
  recoverBountyAfterValidationError,
  storePreparedBounty,
} from '../src/services/bounty.service';
import {
  acceptedBountyMatchesPrepared,
  bountyStatusName,
  isPaymentRetrySafeFromChainEvidence,
  isTerminalBountyStatus,
  pollForConfirmedTransaction,
} from '../src/services/solana.service';
import {
  pendingStartForWallet,
  toStartBountyOptions,
  type PendingBountyStart,
} from '../../mobile/src/services/pending-bounty-start';

const PLAYER_WALLET = 'EPkWANoeTSKGTiQYpdG6LpgHbt2CB5QRTQ935dWnSbXL';
const BOUNTY_PDA = 'DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v';
const PREPARE_ID = 'a'.repeat(64);

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
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('retries transaction lookup while a just-sent signature is not yet visible', async () => {
  let attempts = 0;
  const transaction = { meta: { err: null } };

  const result = await pollForConfirmedTransaction(
    async () => {
      attempts++;
      return attempts === 3 ? transaction : null;
    },
    { attempts: 4, delayMs: 0, wait: async () => undefined },
  );

  assert.equal(result, transaction);
  assert.equal(attempts, 3);
});

test('prepared mission secrets outlive a short app or RPC outage', () => {
  assert.equal(getPreparedBountyTtlSeconds(), 24 * 60 * 60);
});

test('an expired paid bounty is not resolved as a loss before the server returns its mission', () => {
  const bounty = {
    id: 'unacked',
    missionId: 't1-001',
    playerWallet: PLAYER_WALLET,
    tier: 1 as const,
    entryAmount: 500_000_000n,
    status: 'pending' as const,
    createdAt: new Date(Date.now() - 10 * 60_000),
    expiresAt: new Date(Date.now() - 5 * 60_000),
    bountyPda: BOUNTY_PDA,
    requiresMissionAck: true,
  };

  assert.equal(isBountyEligibleForExpiry(bounty), false);
  assert.equal(
    isBountyEligibleForExpiry({ ...bounty, missionDeliveredAt: new Date() }),
    true,
  );
});

test('resolution recovery recognizes every on-chain lifecycle stage', () => {
  assert.equal(bountyStatusName({ status: { Pending: {} } }), 'pending');
  assert.equal(bountyStatusName({ status: { Submitted: {} } }), 'submitted');
  assert.equal(bountyStatusName({ status: { ChallengeLost: {} } }), 'challengelost');
  assert.equal(isTerminalBountyStatus('Won'), true);
  assert.equal(isTerminalBountyStatus('lost'), true);
  assert.equal(isTerminalBountyStatus('Cancelled'), true);
  assert.equal(isTerminalBountyStatus('Submitted'), false);
});

test('signature-less recovery accepts only the exact prepared on-chain bounty', () => {
  const expected = {
    playerWallet: PLAYER_WALLET,
    tier: 1 as const,
    entryAmount: 500_000_000n,
    timestamp: 1_785_000_000,
    commitment: Buffer.alloc(32, 7),
  };
  const account = {
    player: { toBase58: () => PLAYER_WALLET },
    tier: 1,
    entry_amount: { toString: () => '500000000' },
    created_at: { toString: () => '1785000000' },
    mission_commitment: Array.from(Buffer.alloc(32, 7)),
  };

  assert.equal(acceptedBountyMatchesPrepared(account, expected), true);
  assert.equal(
    acceptedBountyMatchesPrepared(
      { ...account, mission_commitment: Array.from(Buffer.alloc(32, 8)) },
      expected,
    ),
    false,
  );
});

test('a new payment is allowed only after atomic failure or an absent expired blockhash', () => {
  assert.equal(
    isPaymentRetrySafeFromChainEvidence({
      signatureStatus: { err: { InstructionError: [0, 'Custom'] } },
      blockhashStillValid: true,
      currentBlockHeight: 100,
      lastValidBlockHeight: 120,
    }),
    true,
  );
  assert.equal(
    isPaymentRetrySafeFromChainEvidence({
      signatureStatus: { err: null },
      blockhashStillValid: false,
      currentBlockHeight: 130,
      lastValidBlockHeight: 120,
    }),
    false,
  );
  assert.equal(
    isPaymentRetrySafeFromChainEvidence({
      signatureStatus: null,
      blockhashStillValid: false,
      currentBlockHeight: 130,
      lastValidBlockHeight: 120,
    }),
    true,
  );
  assert.equal(
    isPaymentRetrySafeFromChainEvidence({
      signatureStatus: null,
      blockhashStillValid: true,
      currentBlockHeight: 110,
      lastValidBlockHeight: 120,
    }),
    false,
  );
});

test('validation failures reopen a live bounty but persist a loss after expiry', async () => {
  const live = await createBounty(
    '3j3QkYkC8dQXyE5qQ3n7mH7zWkA1mX9bP4rT6sV8uN2L',
    1,
    '7cgTzZ9QpX6sL4nW2rK8mV5yH1fD3bA9uE6jC4qP8xR',
    'live-validation-signature',
    false,
  );
  await markBountyValidating(live.bounty.id);
  await recoverBountyAfterValidationError(live.bounty.id);
  assert.equal((await getBounty(live.bounty.id))?.status, 'pending');

  const expired = await createBounty(
    '4k4RmZnD9eRYzF6rR4o8nJ8aXlB2nY1cQ5sU7tW9vP3M',
    1,
    '8dhUaA1RqY7tM5oX3sL9nW6zJ2gE4cB1vF7kD5rQ9yS',
    'expired-validation-signature',
    false,
    null,
    undefined,
    undefined,
    undefined,
    Math.floor(Date.now() / 1000) - 10 * 60,
  );
  await markBountyValidating(expired.bounty.id);
  await recoverBountyAfterValidationError(expired.bounty.id);
  const recovered = await getBounty(expired.bounty.id);
  assert.equal(recovered?.status, 'validating');
  assert.equal(recovered?.resolutionOutcome, false);
});

test('a paid mobile receipt is resumed even when the user re-enters through another tier', () => {
  const receipt: PendingBountyStart = {
    playerWallet: PLAYER_WALLET,
    tier: 1,
    bountyPda: BOUNTY_PDA,
    transactionSignature: 'paid-signature',
    recentBlockhash: 'recent-blockhash-value-that-is-long-enough',
    lastValidBlockHeight: 123,
    prepareId: PREPARE_ID,
    sessionToken: 'session-token',
    entryAmountSkr: 500,
    returnAmountSkr: 1000,
    createdAt: Date.now(),
  };

  const selected = pendingStartForWallet(receipt, PLAYER_WALLET);
  assert.equal(selected, receipt);
  assert.deepEqual(toStartBountyOptions(selected!), {
    bountyPda: BOUNTY_PDA,
    transactionSignature: 'paid-signature',
    recentBlockhash: 'recent-blockhash-value-that-is-long-enough',
    lastValidBlockHeight: 123,
    prepareId: PREPARE_ID,
    sessionToken: 'session-token',
  });
});

test('start is idempotent after the paid bounty was already created', async () => {
  const missionIdBytes = Buffer.alloc(32, 1);
  const salt = Buffer.alloc(32, 2);
  const commitment = Buffer.alloc(32, 3);

  await storePreparedBounty(BOUNTY_PDA, {
    prepareId: PREPARE_ID,
    tier: 1,
    instructionVersion: 2,
    entryAmount: '500000000',
    playerWallet: PLAYER_WALLET,
    timestamp: 1_785_000_000,
    missionId: 't1-001',
    missionDescription: 'Find a doorway with a visible number',
    missionIdBytes,
    salt,
    commitment,
    createdAt: Date.now(),
  });
  const { bounty } = await createBounty(
    PLAYER_WALLET,
    1,
    BOUNTY_PDA,
    'paid-signature',
    false,
    null,
    't1-001',
    500_000_000n,
    {
      sessionId: 'session-v4',
      sessionClientProtocolVersion: 4,
    },
  );

  const response = await postJson('/api/bounty/start', {
    tier: 1,
    playerWallet: PLAYER_WALLET,
    bountyPda: BOUNTY_PDA,
    transactionSignature: 'paid-signature',
    prepareId: PREPARE_ID,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.bountyId, bounty.id);
  assert.equal(response.body.data.bountyPda, BOUNTY_PDA);
  assert.equal(response.body.data.mission.id, 't1-001');
  assert.match(response.body.data.submitToken, /^[0-9a-f]{64}$/);
  assert.ok((await getBounty(bounty.id))?.missionDeliveredAt);

  // The client ACK is deliberately idempotent. Server-side delivery marking
  // prevents a player from withholding ACK to obtain a risk-free cancel.
  const ack = await postJson('/api/bounty/ack', {
    bountyId: bounty.id,
    submitToken: response.body.data.submitToken,
  });
  assert.equal(ack.status, 200);
  assert.equal(ack.body.data.acknowledged, true);
  assert.ok((await getBounty(bounty.id))?.missionDeliveredAt);
});
