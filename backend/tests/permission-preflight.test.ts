import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PERMISSION_PREFLIGHT_ERROR,
  permissionPreflightSchema,
} from '../src/services/permission-preflight.service';

test('permission preflight accepts only confirmed camera and location grants', () => {
  assert.equal(permissionPreflightSchema.safeParse(true).success, true);
  assert.equal(permissionPreflightSchema.safeParse(false).success, false);
  assert.equal(permissionPreflightSchema.safeParse(undefined).success, false);
});

test('permission preflight failure explains that paid bounties are blocked', () => {
  const result = permissionPreflightSchema.safeParse(undefined);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, PERMISSION_PREFLIGHT_ERROR);
  }
});
