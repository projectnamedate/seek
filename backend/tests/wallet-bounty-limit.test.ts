import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getIdentityDailyWinStatus,
  identityForBountyLimits,
  recordIdentityDailyWin,
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

test('daily win streak breaker follows the SGT identity and closes after two wins', async () => {
  const wallet = 'wallet-win-limit-test';
  const sgtMint = 'sgt-win-limit-test';
  const identity = identityForBountyLimits(wallet, sgtMint);
  const now = new Date('2026-07-21T12:00:00.000Z');

  assert.equal(identity, `sgt:${sgtMint}`);
  assert.equal(identityForBountyLimits(wallet), `wallet:${wallet}`);

  const initial = await getIdentityDailyWinStatus(identity, now);
  assert.equal(initial.allowed, true);
  assert.equal(initial.used, 0);
  assert.equal(initial.remaining, 2);

  const first = await recordIdentityDailyWin(identity, now);
  assert.equal(first.allowed, true);
  assert.equal(first.used, 1);
  assert.equal(first.remaining, 1);

  const second = await recordIdentityDailyWin(identity, now);
  assert.equal(second.allowed, true);
  assert.equal(second.used, 2);
  assert.equal(second.remaining, 0);

  const exhausted = await getIdentityDailyWinStatus(identity, now);
  assert.equal(exhausted.allowed, false);
  assert.equal(exhausted.used, 2);
});
