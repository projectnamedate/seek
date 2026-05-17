import test from 'node:test';
import assert from 'node:assert/strict';

import { withSkrSuffix, withoutSkrSuffix } from '../src/services/skr.service';

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
