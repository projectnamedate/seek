/**
 * Drain the short-lived Seek upgrade payer back to the Ledger authority.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction
} from '@solana/web3.js';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const PAYER_KEYPAIR_PATH = path.join(
  REPO_ROOT,
  '.secrets/solana/seek-upgrade-payer-20260517.json'
);
const EXPECTED_PAYER = new PublicKey(
  '3EKi2PzKrDi22Ld6NgixdBX7djSKMrZA2TG1utg1tJAS'
);
const DESTINATION = new PublicKey(
  'GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY'
);

function readKeypair(filePath: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(raw) || raw.length !== 64) {
    throw new Error(`Expected 64-byte keypair JSON at ${filePath}`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main(): Promise<void> {
  const connection = new Connection(RPC_URL, 'confirmed');
  const payer = readKeypair(PAYER_KEYPAIR_PATH);

  if (!payer.publicKey.equals(EXPECTED_PAYER)) {
    throw new Error(
      `Payer key mismatch: got ${payer.publicKey.toBase58()}, expected ${EXPECTED_PAYER.toBase58()}`
    );
  }

  const balance = await connection.getBalance(payer.publicKey);
  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  const feeProbe = new Transaction({
    feePayer: payer.publicKey,
    recentBlockhash: latestBlockhash.blockhash
  }).add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: DESTINATION,
      lamports: 1
    })
  );
  const fee = await connection.getFeeForMessage(feeProbe.compileMessage());
  if (fee.value === null) {
    throw new Error('Could not calculate transfer fee');
  }
  const lamports = balance - fee.value;
  if (lamports <= 0) {
    console.log('Nothing to drain.');
    return;
  }

  const tx = new Transaction({
    feePayer: payer.publicKey,
    recentBlockhash: latestBlockhash.blockhash
  }).add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: DESTINATION,
      lamports
    })
  );
  tx.sign(payer);

  console.log(
    `Draining ${(lamports / LAMPORTS_PER_SOL).toFixed(9)} SOL from ${payer.publicKey.toBase58()} to ${DESTINATION.toBase58()}`
  );
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    preflightCommitment: 'confirmed'
  });
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    },
    'confirmed'
  );
  console.log(`Drain transaction confirmed: ${signature}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
