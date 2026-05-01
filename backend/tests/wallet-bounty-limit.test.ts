import test from 'node:test';
import assert from 'node:assert/strict';

import {
  secondsUntilNextUtcDay,
  utcDayKey,
} from '../src/services/wallet-bounty-limit.service';

test('wallet bounty daily limit keys use UTC calendar days', () => {
  assert.equal(
    utcDayKey(new Date('2026-05-01T23:59:59.000Z')),
    '2026-05-01'
  );
  assert.equal(
    utcDayKey(new Date('2026-05-02T00:00:00.000Z')),
    '2026-05-02'
  );
});

test('wallet bounty daily limit TTL expires at next UTC midnight', () => {
  assert.equal(
    secondsUntilNextUtcDay(new Date('2026-05-01T23:59:30.000Z')),
    30
  );
  assert.equal(
    secondsUntilNextUtcDay(new Date('2026-05-01T12:00:00.000Z')),
    12 * 60 * 60
  );
});
