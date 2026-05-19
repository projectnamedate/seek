import test from 'node:test';
import assert from 'node:assert/strict';

import { withSkrSuffix, withoutSkrSuffix } from '../src/services/skr.service';
import { ENTRY_AMOUNTS, LEGACY_ENTRY_AMOUNTS, SKR_MULTIPLIER } from '../src/types';

test('normalizes displayed .skr names without duplicate suffixes', () => {
  assert.equal(withSkrSuffix('hammathyme'), 'hammathyme.skr');
  assert.equal(withSkrSuffix('hammathyme.skr'), 'hammathyme.skr');
  assert.equal(withSkrSuffix('HAMMATHYME.SKR'), 'hammathyme.skr');
  assert.equal(withSkrSuffix('  premiumbans.skr  '), 'premiumbans.skr');
});

test('normalizes .skr lookup input case and suffix', () => {
  assert.equal(withoutSkrSuffix('johnnysolami.skr'), 'johnnysolami');
  assert.equal(withoutSkrSuffix('Johnnysolami.skr'), 'johnnysolami');
  assert.equal(withoutSkrSuffix('  premiumbans  '), 'premiumbans');
});

test('current tier economics use 500 / 1000 / 2000 SKR', () => {
  assert.equal(ENTRY_AMOUNTS[1], 500n * SKR_MULTIPLIER);
  assert.equal(ENTRY_AMOUNTS[2], 1000n * SKR_MULTIPLIER);
  assert.equal(ENTRY_AMOUNTS[3], 2000n * SKR_MULTIPLIER);
});

test('legacy tier economics remain available for installed v1 clients', () => {
  assert.equal(LEGACY_ENTRY_AMOUNTS[1], 1000n * SKR_MULTIPLIER);
  assert.equal(LEGACY_ENTRY_AMOUNTS[2], 3000n * SKR_MULTIPLIER);
  assert.equal(LEGACY_ENTRY_AMOUNTS[3], 5000n * SKR_MULTIPLIER);
});
