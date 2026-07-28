import test from 'node:test';
import assert from 'node:assert/strict';

import type { ActiveBounty } from '../src/types';
import {
  deserializeActiveBounty,
  getActiveBountyTtlSeconds,
  serializeActiveBounty,
} from '../src/services/bounty-persistence.service';

const bounty: ActiveBounty = {
  id: '8a2d24d5-4ecf-47a7-9c1f-c23dfc3dcbcb',
  missionId: 't1-fire-hydrant',
  playerWallet: 'Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr',
  tier: 1,
  entryAmount: 1000_000_000n,
  status: 'pending',
  createdAt: new Date('2026-05-01T12:00:00.000Z'),
  expiresAt: new Date('2026-05-01T12:03:00.000Z'),
  bountyPda: 'DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v',
  transactionSignature: '5BqExampleSig',
  sgtVerified: true,
  sgtMintAddress: 'B1fHfkVLjnqCih7xcN7gDyDfu7eR2PtZxzQvZiupPPDH',
  sessionId: 'e7ec369873d89d35f0f76843b54fb55a',
  sessionClientProtocolVersion: 3,
  attestationType: 'standard',
  resolutionOutcome: false,
};

test('serializes active bounty state without losing Date or bigint fields', () => {
  const serialized = serializeActiveBounty(bounty);
  assert.equal(serialized.entryAmount, '1000000000');
  assert.equal(serialized.createdAt, '2026-05-01T12:00:00.000Z');
  assert.equal(serialized.expiresAt, '2026-05-01T12:03:00.000Z');

  const restored = deserializeActiveBounty(serialized);
  assert.deepEqual(restored, bounty);
  assert.equal(typeof restored.entryAmount, 'bigint');
  assert.ok(restored.createdAt instanceof Date);
  assert.ok(restored.expiresAt instanceof Date);
});

test('active bounty redis TTL always covers the hunt plus review window', () => {
  const ttlSeconds = getActiveBountyTtlSeconds(bounty, new Date('2026-05-01T12:00:00.000Z'));
  assert.equal(ttlSeconds, 24 * 60 * 60 + 180);
});

test('active bounty redis TTL extends if an expiry is unexpectedly far away', () => {
  const farFuture = {
    ...bounty,
    expiresAt: new Date('2026-05-03T12:00:00.000Z'),
  };
  const ttlSeconds = getActiveBountyTtlSeconds(farFuture, new Date('2026-05-01T12:00:00.000Z'));
  assert.equal(ttlSeconds, 72 * 60 * 60);
});
