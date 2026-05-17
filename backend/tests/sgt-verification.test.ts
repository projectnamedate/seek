import test from 'node:test';
import assert from 'node:assert/strict';

import { isSeekerGenesisMintCandidate } from '../src/services/sgt.service';

const SAMPLE_SGT_MINT = '2gpzjWybR6Y11jC1BCwTCxrcyDdtcB6rk521z6Pj2P1C';
const SGT_MINT_AUTHORITY = 'GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4';
const SGT_GROUP_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

function sampleCandidate(overrides = {}) {
  return {
    mintAddress: SAMPLE_SGT_MINT,
    supply: 1n,
    decimals: 0,
    mintAuthority: SGT_MINT_AUTHORITY,
    metadataPointerAuthority: SGT_MINT_AUTHORITY,
    metadataPointerAddress: SGT_GROUP_ADDRESS,
    groupMemberPointerAuthority: SGT_MINT_AUTHORITY,
    groupMemberPointerAddress: SAMPLE_SGT_MINT,
    tokenGroupMemberMint: SAMPLE_SGT_MINT,
    tokenGroupMemberGroup: SGT_GROUP_ADDRESS,
    ...overrides,
  };
}

test('accepts a Token-2022 Seeker Genesis Token group member', () => {
  assert.equal(isSeekerGenesisMintCandidate(sampleCandidate()), true);
});

test('rejects Token-2022 NFTs that do not prove Seeker group membership', () => {
  assert.equal(
    isSeekerGenesisMintCandidate(sampleCandidate({ tokenGroupMemberGroup: '11111111111111111111111111111111' })),
    false,
  );
  assert.equal(
    isSeekerGenesisMintCandidate(sampleCandidate({ groupMemberPointerAddress: '11111111111111111111111111111111' })),
    false,
  );
  assert.equal(
    isSeekerGenesisMintCandidate(sampleCandidate({ supply: 2n })),
    false,
  );
});
