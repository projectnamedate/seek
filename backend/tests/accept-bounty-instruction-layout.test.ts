import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCEPT_BOUNTY_DISCRIMINATOR,
  ACCEPT_BOUNTY_V2_DISCRIMINATOR,
  parseAcceptBountyInstructionData,
} from '../src/services/solana.service';
import idl from '../src/idl/seek_protocol.json';

function getIdlInstruction(name: string) {
  const instruction = idl.instructions.find((ix) => ix.name === name);
  assert.ok(instruction, `${name} instruction missing from IDL`);
  return instruction;
}

test('hardcoded accept_bounty discriminators match regenerated IDL', () => {
  assert.deepEqual(
    Array.from(ACCEPT_BOUNTY_DISCRIMINATOR),
    getIdlInstruction('accept_bounty').discriminator,
  );
  assert.deepEqual(
    Array.from(ACCEPT_BOUNTY_V2_DISCRIMINATOR),
    getIdlInstruction('accept_bounty_v2').discriminator,
  );
});

test('accept_bounty_v2 IDL preserves tier-first args and account order', () => {
  const acceptV2 = getIdlInstruction('accept_bounty_v2');

  assert.deepEqual(
    acceptV2.args.map((arg) => arg.name),
    ['tier', 'entry_amount', 'timestamp', 'mission_commitment'],
  );
  assert.deepEqual(
    acceptV2.accounts.map((account) => account.name),
    [
      'player',
      'global_state',
      'bounty',
      'player_token_account',
      'house_vault',
      'skr_mint',
      'system_program',
      'token_program',
    ],
  );
});

test('accept_bounty_v2 wire layout is tier, entry amount, timestamp, commitment', () => {
  const commitment = Buffer.alloc(32, 0xab);
  const data = Buffer.alloc(8 + 1 + 8 + 8 + 32);
  ACCEPT_BOUNTY_V2_DISCRIMINATOR.copy(data, 0);
  data.writeUInt8(2, 8);
  data.writeBigUInt64LE(1_000_000_000n, 9);
  data.writeBigInt64LE(1_779_215_000n, 17);
  commitment.copy(data, 25);

  const parsed = parseAcceptBountyInstructionData(data, 2);
  assert.ok(parsed);
  assert.equal(parsed.tier, 2);
  assert.equal(parsed.entryAmount, 1_000_000_000n);
  assert.equal(parsed.timestamp, 1_779_215_000n);
  assert.equal(parsed.commitment.toString('hex'), commitment.toString('hex'));
});

test('legacy accept_bounty wire layout remains amount inferred', () => {
  const commitment = Buffer.alloc(32, 0xcd);
  const data = Buffer.alloc(8 + 8 + 8 + 32);
  ACCEPT_BOUNTY_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(1_000_000_000n, 8);
  data.writeBigInt64LE(1_779_215_000n, 16);
  commitment.copy(data, 24);

  const parsed = parseAcceptBountyInstructionData(data, 1);
  assert.ok(parsed);
  assert.equal(parsed.tier, undefined);
  assert.equal(parsed.entryAmount, 1_000_000_000n);
  assert.equal(parsed.timestamp, 1_779_215_000n);
  assert.equal(parsed.commitment.toString('hex'), commitment.toString('hex'));
});

test('accept_bounty parser rejects wrong discriminator for requested version', () => {
  const v1Data = Buffer.alloc(8 + 8 + 8 + 32);
  ACCEPT_BOUNTY_DISCRIMINATOR.copy(v1Data, 0);

  const v2Data = Buffer.alloc(8 + 1 + 8 + 8 + 32);
  ACCEPT_BOUNTY_V2_DISCRIMINATOR.copy(v2Data, 0);

  assert.equal(parseAcceptBountyInstructionData(v1Data, 2), null);
  assert.equal(parseAcceptBountyInstructionData(v2Data, 1), null);
});
