import test from 'node:test';
import assert from 'node:assert/strict';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

import {
  buildProposeAndFinalizeInstructions,
  finalizesWithProposal,
} from '../src/services/solana.service';
import idl from '../src/idl/seek_protocol.json';

function discriminator(name: string): number[] {
  const ix = idl.instructions.find((i) => i.name === name);
  assert.ok(ix, `${name} missing from IDL`);
  return ix.discriminator;
}

test('zero challenge period finalizes in the proposal transaction', () => {
  assert.equal(finalizesWithProposal(0), true);
  assert.equal(finalizesWithProposal(60), false);
});

test('propose and finalize are built as one hot-signed pair, propose first', async () => {
  const hot = Keypair.generate();
  const provider = new AnchorProvider(
    new Connection('http://127.0.0.1:8899'),
    new Wallet(hot),
    {},
  );
  const program = new Program(idl as any, provider);
  const key = () => Keypair.generate().publicKey;
  const accounts = {
    hotAuthority: hot.publicKey,
    globalState: key(),
    bounty: key(),
    playerTokenAccount: key(),
    houseVault: key(),
    singularityVault: key(),
    protocolTreasury: key(),
  };

  const [propose, finalize] = await buildProposeAndFinalizeInstructions(program, true, accounts);

  const programId = new PublicKey(idl.address);
  assert.ok(propose.programId.equals(programId));
  assert.ok(finalize.programId.equals(programId));
  assert.deepEqual(Array.from(propose.data.subarray(0, 8)), discriminator('propose_resolution'));
  assert.deepEqual(Array.from(finalize.data.subarray(0, 8)), discriminator('finalize_bounty'));

  // The hot authority signs both, so no player-sent finalize can land between them.
  for (const ix of [propose, finalize]) {
    const signer = ix.keys.find((k) => k.isSigner);
    assert.ok(signer?.pubkey.equals(hot.publicKey));
  }
  assert.ok(finalize.keys.some((k) => k.pubkey.equals(accounts.bounty)));
});
