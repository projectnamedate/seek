import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  attestationService,
  mergeAttestationMetadata,
  type AttestationPayload,
} from '../src/services/attestation.service';

const photoBuffer = Buffer.from(
  'ffd8ffe000104a46494600010101004800480000ffdb',
  'hex',
);

function basePayload(): AttestationPayload {
  return {
    type: 'standard',
    photoHash: createHash('sha256')
      .update(photoBuffer.toString('base64'))
      .digest('hex'),
    timestamp: Date.now(),
    capturedAt: Date.now(),
    deviceModel: 'Solana Seeker',
    deviceManufacturer: 'Solana Mobile',
    latitude: 37.7749,
    longitude: -122.4194,
    locationAccuracyMeters: 18,
  };
}

test('v1.0.1 base64 photo hash format verifies standard attestation', async () => {
  const result = await attestationService.verifyAttestation(
    basePayload(),
    photoBuffer,
  );

  assert.equal(result.verified, true);
  assert.equal(result.photoIntegrity, true);
  assert.equal(result.confidence, 'low');
});

test('fresh verified attestation fills missing EXIF metadata', async () => {
  const payload = basePayload();
  const result = await attestationService.verifyAttestation(
    payload,
    photoBuffer,
  );

  const merged = mergeAttestationMetadata({}, payload, result);

  assert.equal(merged.deviceModel, 'Solana Seeker');
  assert.equal(merged.deviceMake, 'Solana Mobile');
  assert.equal(merged.latitude, 37.7749);
  assert.equal(merged.longitude, -122.4194);
  assert.equal(merged.locationAccuracyMeters, 18);
  assert.equal(merged.source, 'attestation');
  assert.ok(merged.timestamp instanceof Date);
});

test('fresh verified attestation overrides timezone-shifted EXIF timestamp', async () => {
  const payload = basePayload();
  payload.capturedAt = Date.now();
  payload.timestamp = payload.capturedAt;

  const result = await attestationService.verifyAttestation(
    payload,
    photoBuffer,
  );

  const merged = mergeAttestationMetadata(
    {
      timestamp: new Date(payload.capturedAt - 7 * 60 * 60 * 1000),
      deviceMake: 'Solana Mobile Inc.',
      deviceModel: 'Seeker',
      source: 'exif',
    },
    payload,
    result,
  );

  assert.equal(merged.timestamp?.toISOString(), new Date(payload.capturedAt).toISOString());
  assert.equal(merged.source, 'merged');
});

test('unverified attestation does not fill missing metadata', async () => {
  const payload = { ...basePayload(), photoHash: 'bad-hash' };
  const result = await attestationService.verifyAttestation(
    payload,
    photoBuffer,
  );

  const merged = mergeAttestationMetadata({}, payload, result);

  assert.deepEqual(merged, {});
});
