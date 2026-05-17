/**
 * Extend the mainnet Seek program data account using the durable repo-local
 * payer keypair for rent/fees.
 *
 * The loader-v3 ExtendProgram instruction does not require the upgrade
 * authority on-chain; it only needs a payer when additional rent is required.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
  parseProgramDataAddress,
  parseProgramDataUpgradeAuthority
} from '../src/utils/program-upgrade';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const PROGRAM_ID = new PublicKey(
  'DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v'
);
const EXPECTED_PROGRAMDATA = new PublicKey(
  '9BmaJM37xd1sZpkJMsjDJyTyaMXhSyFSWjFU4hS5Ur4e'
);
const EXPECTED_AUTHORITY = new PublicKey(
  'GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY'
);
const PAYER_KEYPAIR_PATH = path.join(
  REPO_ROOT,
  '.secrets/solana/seek-upgrade-payer-20260517.json'
);
const EXPECTED_PAYER = new PublicKey(
  '3EKi2PzKrDi22Ld6NgixdBX7djSKMrZA2TG1utg1tJAS'
);
const ADDITIONAL_BYTES = 10_240;

function readKeypair(filePath: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(raw) || raw.length !== 64) {
    throw new Error(`Expected 64-byte keypair JSON at ${filePath}`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function encodeExtendProgram(additionalBytes: number): Buffer {
  // bincode enum variant 6 = ExtendProgram, followed by u32 bytes.
  const data = Buffer.alloc(8);
  data.writeUInt32LE(6, 0);
  data.writeUInt32LE(additionalBytes, 4);
  return data;
}

function buildExtendProgramInstruction(payer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
    keys: [
      { pubkey: EXPECTED_PROGRAMDATA, isSigner: false, isWritable: true },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true }
    ],
    data: encodeExtendProgram(ADDITIONAL_BYTES)
  });
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const simulateOnly = process.argv.includes('--simulate');
  const connection = new Connection(RPC_URL, 'confirmed');
  const payer = readKeypair(PAYER_KEYPAIR_PATH);

  if (!payer.publicKey.equals(EXPECTED_PAYER)) {
    throw new Error(
      `Payer key mismatch: got ${payer.publicKey.toBase58()}, expected ${EXPECTED_PAYER.toBase58()}`
    );
  }

  const programAccount = await connection.getAccountInfo(PROGRAM_ID);
  if (!programAccount) {
    throw new Error(`Program account not found: ${PROGRAM_ID.toBase58()}`);
  }
  if (!programAccount.owner.equals(BPF_LOADER_UPGRADEABLE_PROGRAM_ID)) {
    throw new Error(`Program owner is not upgradeable loader`);
  }

  const parsedProgramData = parseProgramDataAddress(programAccount.data);
  if (!parsedProgramData.equals(EXPECTED_PROGRAMDATA)) {
    throw new Error(
      `ProgramData mismatch: got ${parsedProgramData.toBase58()}, expected ${EXPECTED_PROGRAMDATA.toBase58()}`
    );
  }

  const programDataAccount = await connection.getAccountInfo(
    EXPECTED_PROGRAMDATA
  );
  if (!programDataAccount) {
    throw new Error(
      `ProgramData account not found: ${EXPECTED_PROGRAMDATA.toBase58()}`
    );
  }

  const authority = parseProgramDataUpgradeAuthority(programDataAccount.data);
  if (!authority?.equals(EXPECTED_AUTHORITY)) {
    throw new Error(
      `Upgrade authority mismatch: got ${authority?.toBase58() ?? 'none'}, expected ${EXPECTED_AUTHORITY.toBase58()}`
    );
  }

  const payerBalance = await connection.getBalance(payer.publicKey);
  const currentRent = await connection.getMinimumBalanceForRentExemption(
    programDataAccount.data.length
  );
  const extendedRent = await connection.getMinimumBalanceForRentExemption(
    programDataAccount.data.length + ADDITIONAL_BYTES
  );

  console.log('Seek program extend preflight');
  console.log(`  RPC:          ${RPC_URL}`);
  console.log(`  Program:      ${PROGRAM_ID.toBase58()}`);
  console.log(`  ProgramData:  ${EXPECTED_PROGRAMDATA.toBase58()}`);
  console.log(`  Authority:    ${EXPECTED_AUTHORITY.toBase58()}`);
  console.log(`  Payer:        ${payer.publicKey.toBase58()}`);
  console.log(`  Add bytes:    ${ADDITIONAL_BYTES}`);
  console.log(
    `  Payer SOL:    ${(payerBalance / LAMPORTS_PER_SOL).toFixed(9)}`
  );
  console.log(
    `  Rent delta:   ${((extendedRent - currentRent) / LAMPORTS_PER_SOL).toFixed(9)} SOL`
  );

  if (dryRun) {
    console.log('Dry run only; no transaction sent.');
    return;
  }

  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({
    feePayer: payer.publicKey,
    recentBlockhash: latestBlockhash.blockhash
  }).add(buildExtendProgramInstruction(payer.publicKey));

  if (simulateOnly) {
    const simulation = await connection.simulateTransaction(tx, [payer]);
    console.log(JSON.stringify(simulation.value, null, 2));
    if (simulation.value.err) {
      process.exit(1);
    }
    return;
  }

  tx.sign(payer);
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

  console.log(`Extend transaction confirmed: ${signature}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
