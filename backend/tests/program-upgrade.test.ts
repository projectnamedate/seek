import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';

import {
  parseProgramDataAddress,
  parseProgramDataUpgradeAuthority
} from '../src/utils/program-upgrade';

test('parses upgradeable loader Program account programdata address', () => {
  const programData = new PublicKey(
    'DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v'
  );
  const data = Buffer.alloc(36);
  data.writeUInt32LE(2, 0);
  programData.toBuffer().copy(data, 4);

  assert.equal(
    parseProgramDataAddress(data).toBase58(),
    programData.toBase58()
  );
});

test('parses ProgramData account with active upgrade authority', () => {
  const authority = new PublicKey(
    'Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr'
  );
  const data = Buffer.alloc(45);
  data.writeUInt32LE(3, 0);
  data.writeBigUInt64LE(42n, 4);
  data.writeUInt8(1, 12);
  authority.toBuffer().copy(data, 13);

  assert.equal(
    parseProgramDataUpgradeAuthority(data)?.toBase58(),
    authority.toBase58()
  );
});

test('parses legacy ProgramData account with u32 option tag', () => {
  const authority = new PublicKey(
    'Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr'
  );
  const data = Buffer.alloc(48);
  data.writeUInt32LE(3, 0);
  data.writeBigUInt64LE(42n, 4);
  data.writeUInt32LE(1, 12);
  authority.toBuffer().copy(data, 16);

  assert.equal(
    parseProgramDataUpgradeAuthority(data)?.toBase58(),
    authority.toBase58()
  );
});

test('returns null for immutable ProgramData account', () => {
  const data = Buffer.alloc(13);
  data.writeUInt32LE(3, 0);
  data.writeBigUInt64LE(42n, 4);
  data.writeUInt8(0, 12);

  assert.equal(parseProgramDataUpgradeAuthority(data), null);
});
