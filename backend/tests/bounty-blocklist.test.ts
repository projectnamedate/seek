import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BLOCKED_BOUNTY_ERROR,
  isBlockedBountyActor,
  parseAddressList,
} from '../src/services/bounty-blocklist.service';

const BLOCKED_WALLET = 'Dfui8Dph4AKDVgzW5deynTvJN4n3UPvam3Sb4aH7BgU6';
const BLOCKED_SGT = 'B1fHfkVLjnqCih7xcN7gDyDfu7eR2PtZxzQvZiupPPDH';

test('address blocklist parsing trims whitespace and ignores empty entries', () => {
  assert.deepEqual(
    parseAddressList(` ${BLOCKED_WALLET},,\n${BLOCKED_SGT} `),
    new Set([BLOCKED_WALLET, BLOCKED_SGT]),
  );
});

test('bounty blocklist blocks the known wallet and known SGT mint', () => {
  assert.equal(
    isBlockedBountyActor({ walletAddress: BLOCKED_WALLET }),
    true,
  );
  assert.equal(
    isBlockedBountyActor({ walletAddress: '11111111111111111111111111111111', sgtMintAddress: BLOCKED_SGT }),
    true,
  );
});

test('bounty blocklist allows unrelated wallets and SGT mints', () => {
  assert.equal(
    isBlockedBountyActor({
      walletAddress: '11111111111111111111111111111111',
      sgtMintAddress: '22222222222222222222222222222222',
    }),
    false,
  );
});

test('blocked bounty error is a generic anti-abuse denial', () => {
  assert.match(BLOCKED_BOUNTY_ERROR, /not eligible/i);
});
