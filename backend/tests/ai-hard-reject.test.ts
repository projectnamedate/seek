import test from 'node:test';
import assert from 'node:assert/strict';
import { canApplySgtConfidenceBonus, performPreChecks } from '../src/services/ai.service';
import { Mission } from '../src/types';

const mission: Mission = {
  id: 'test-mission',
  tier: 1,
  description: 'Find a swing currently in motion',
  keywords: ['swing'],
  difficulty: 'easy',
  location: 'outdoor',
};

test('timestamp pre-check is a hard reject with zero confidence', async () => {
  const { result } = performPreChecks({
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    latitude: 34.109458,
    longitude: -118.196992,
    deviceMake: 'Solana Mobile Inc.',
    deviceModel: 'Seeker',
  });

  assert.equal(result.isValid, false);
  assert.equal(result.confidence, 0);
  assert.equal(result.hardReject, true);
  assert.equal(canApplySgtConfidenceBonus(result), false);
});

test('SGT bonus is allowed only for soft target-confidence misses', () => {
  assert.equal(
    canApplySgtConfidenceBonus({
      isValid: false,
      confidence: 0.86,
      reasoning: 'target likely present but below tier threshold',
      detectedObjects: ['swing'],
      isScreenshot: false,
      matchesTarget: true,
    }),
    true,
  );

  assert.equal(
    canApplySgtConfidenceBonus({
      isValid: false,
      confidence: 0.9,
      reasoning: 'Photo metadata indicates this is likely a screenshot',
      detectedObjects: [],
      isScreenshot: true,
      matchesTarget: false,
      hardReject: true,
    }),
    false,
  );
});
