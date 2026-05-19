import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getMissionById,
  getMissionsByTier,
  getMissionsByTierAndLocation,
  getRandomMission,
  MISSIONS,
  OUTDOOR_RATIO,
} from '../src/data/missions';
import { Tier } from '../src/types';

const TIERS = [1, 2, 3] as const;
const EXPECTED_COUNTS: Record<Tier, { outdoor: number; indoor: number }> = {
  1: { outdoor: 140, indoor: 60 },
  2: { outdoor: 120, indoor: 80 },
  3: { outdoor: 100, indoor: 100 },
};

function sequenceRandom(values: number[]): () => number {
  const queue = [...values];
  return () => {
    const next = queue.shift();
    assert.notEqual(next, undefined, 'test random sequence exhausted');
    return next as number;
  };
}

test('approved mission pool has 600 unique missions with exact tier/location counts', () => {
  assert.equal(MISSIONS.length, 600);
  assert.equal(new Set(MISSIONS.map((mission) => mission.id)).size, 600);
  assert.equal(new Set(MISSIONS.map((mission) => mission.description)).size, 600);

  for (const tier of TIERS) {
    assert.equal(getMissionsByTier(tier).length, 200);
    assert.equal(
      getMissionsByTierAndLocation(tier, 'outdoor').length,
      EXPECTED_COUNTS[tier].outdoor
    );
    assert.equal(
      getMissionsByTierAndLocation(tier, 'indoor').length,
      EXPECTED_COUNTS[tier].indoor
    );

    assert.equal(getMissionById(`t${tier}-001`)?.tier, tier);
    assert.equal(getMissionById(`t${tier}-200`)?.tier, tier);
  }
});

test('mission picker honors tier-specific outdoor-first ratios', () => {
  for (const tier of TIERS) {
    const outdoorMission = getRandomMission(tier, sequenceRandom([OUTDOOR_RATIO[tier] - 0.01, 0]));
    assert.equal(outdoorMission.tier, tier);
    assert.equal(outdoorMission.location, 'outdoor');

    const indoorMission = getRandomMission(tier, sequenceRandom([OUTDOOR_RATIO[tier], 0]));
    assert.equal(indoorMission.tier, tier);
    assert.equal(indoorMission.location, 'indoor');
  }
});

test('missions keep validation keywords for Claude Vision prompt context', () => {
  for (const mission of MISSIONS) {
    assert.ok(mission.description.startsWith('Find '), mission.id);
    assert.ok(mission.keywords.length > 0, mission.id);
    assert.ok(mission.keywords.length <= 8, mission.id);
  }
});

test('missions avoid USA-centric or country-specific targets', () => {
  const bannedTerms = [
    /\busps\b/i,
    /\bunited states\b/i,
    /\bu\.s\./i,
    /\busa\b/i,
    /\bamerica(?:n)?\b/i,
    /\bmail(?:box|boxes| slot|room)?\b/i,
    /\bpostal\b/i,
    /\bzip code\b/i,
    /\bporch\b/i,
    /\bcurb\b/i,
    /\bsidewalk\b/i,
    /\bdriveway\b/i,
    /\bcul-de-sac\b/i,
    /\bparking lot\b/i,
    /\bdmv\b/i,
    /\blicen[cs]e plate\b/i,
    /\bpay phone\b/i,
    /\bfire hydrant\b/i,
    /\bschool bus\b/i,
    /\bbodega\b/i,
    /\bmetrocard\b/i,
    /\bdollar(?:s)?\b/i,
    /\bquarter(?:s)?\b/i,
    /\bpenn(?:y|ies)\b/i,
  ];

  for (const mission of MISSIONS) {
    for (const bannedTerm of bannedTerms) {
      assert.equal(
        bannedTerm.test(mission.description),
        false,
        `${mission.id}: ${mission.description}`
      );
    }
  }
});
