import test from 'node:test';
import assert from 'node:assert/strict';
import { buildValidationPrompt, canApplySgtConfidenceBonus, performPreChecks } from '../src/services/ai.service';
import { Mission, TIER_CONFIDENCE_THRESHOLDS } from '../src/types';

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

test('tier 1 verified-Seeker threshold catches the dumbbell-rack false negative', () => {
  assert.equal(TIER_CONFIDENCE_THRESHOLDS[1], 0.88);
  assert.ok(
    0.85 >= TIER_CONFIDENCE_THRESHOLDS[1] - 0.05,
    'verified Seeker Tier 1 matches at 85% should clear the SGT-adjusted threshold',
  );
});

test('tier 1 validation prompt is launch-hardened without inventing venue constraints', () => {
  const prompt = buildValidationPrompt({
    ...mission,
    id: 'dumbbell-rack',
    description: 'Find a dumbbell rack',
    keywords: ['dumbbell', 'rack'],
  }, 1);

  assert.match(prompt, /TIER 1 LAUNCH-HARDENING RULES/);
  assert.match(prompt, /central subject/);
  assert.match(prompt, /Do not invent unstated location, brand, size, style, or venue constraints/);
  assert.match(prompt, /any real-world version counts when clearly visible/);
  assert.match(prompt, /Reject partial, distant, blurry, generic, or cropped matches/);
});
