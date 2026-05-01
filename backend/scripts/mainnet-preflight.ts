/**
 * Mainnet launch preflight.
 *
 * Read-only checks for the values that must line up before deployment and
 * initialization. Use `--offline` before the program exists, or let it query
 * mainnet to verify an already-deployed program is still upgradeable.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
  parseProgramDataAddress,
  parseProgramDataUpgradeAuthority
} from '../src/utils/program-upgrade';

const MAINNET_SKR_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';
const PLACEHOLDER_AUTHORITY = '11111111111111111111111111111111';
const REPO_ROOT = path.resolve(__dirname, '..', '..');

type Check = {
  label: string;
  ok: boolean;
  detail: string;
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function readRelative(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function findExpectedInitialAuthority(source: string): string {
  const match = source.match(
    /EXPECTED_INITIAL_AUTHORITY[\s\S]*?pubkey!\("([^"]+)"\)/
  );
  if (!match) {
    throw new Error(
      'Could not find EXPECTED_INITIAL_AUTHORITY in contract source'
    );
  }
  return match[1];
}

function findDeclareId(source: string): string {
  const match = source.match(/declare_id!\("([^"]+)"\)/);
  if (!match) {
    throw new Error('Could not find declare_id! in contract source');
  }
  return match[1];
}

function findAnchorMainnetProgramId(anchorToml: string): string {
  const match = anchorToml.match(
    /\[programs\.mainnet\][\s\S]*?seek_protocol\s*=\s*"([^"]+)"/
  );
  if (!match) {
    throw new Error(
      'Could not find [programs.mainnet] seek_protocol in Anchor.toml'
    );
  }
  return match[1];
}

function pushCheck(
  checks: Check[],
  label: string,
  ok: boolean,
  detail: string
): void {
  checks.push({ label, ok, detail });
}

async function checkUpgradeableProgram(
  checks: Check[],
  connection: Connection,
  programId: PublicKey,
  expectedUpgradeAuthority: PublicKey
): Promise<void> {
  const account = await connection.getAccountInfo(programId);
  if (!account) {
    pushCheck(
      checks,
      'program not deployed yet',
      true,
      'OK before first deploy. Use anchor deploy without --final so the Ledger remains upgrade authority.'
    );
    return;
  }

  const ownerOk = account.owner.equals(BPF_LOADER_UPGRADEABLE_PROGRAM_ID);
  pushCheck(
    checks,
    'program loader',
    ownerOk,
    ownerOk
      ? 'program account is owned by the upgradeable loader'
      : `owner is ${account.owner.toBase58()}, not upgradeable loader`
  );
  if (!ownerOk) {
    return;
  }

  const programDataAddress = parseProgramDataAddress(account.data);
  const programDataAccount =
    await connection.getAccountInfo(programDataAddress);
  if (!programDataAccount) {
    pushCheck(
      checks,
      'programdata account',
      false,
      `missing ${programDataAddress.toBase58()}`
    );
    return;
  }

  const upgradeAuthority = parseProgramDataUpgradeAuthority(
    programDataAccount.data
  );
  if (!upgradeAuthority) {
    pushCheck(
      checks,
      'program upgrade authority',
      false,
      'program is immutable. Do not proceed if tweaks are still expected.'
    );
    return;
  }

  pushCheck(
    checks,
    'program upgrade authority',
    upgradeAuthority.equals(expectedUpgradeAuthority),
    `current=${upgradeAuthority.toBase58()} expected=${expectedUpgradeAuthority.toBase58()}`
  );
}

async function main() {
  const offline = process.argv.includes('--offline');
  const checks: Check[] = [];

  const solanaNetwork = env('SOLANA_NETWORK');
  const rpcUrl = env('SOLANA_RPC_URL');
  const programId = new PublicKey(env('SEEK_PROGRAM_ID'));
  const skrMint = env('SKR_MINT');
  const feesWallet = new PublicKey(env('FEES_WALLET'));
  const signerMode = env('AUTHORITY_SIGNER');
  const ledgerPubkey = new PublicKey(env('AUTHORITY_LEDGER_PUBKEY'));

  const contractSource = readRelative(
    'contracts/programs/seek-protocol/src/lib.rs'
  );
  const anchorToml = readRelative('contracts/Anchor.toml');
  const expectedInitialAuthority = findExpectedInitialAuthority(contractSource);
  const declareId = findDeclareId(contractSource);
  const anchorMainnetProgramId = findAnchorMainnetProgramId(anchorToml);

  pushCheck(
    checks,
    'network',
    solanaNetwork === 'mainnet-beta',
    `SOLANA_NETWORK=${solanaNetwork}`
  );
  pushCheck(
    checks,
    'authority signer',
    signerMode === 'ledger',
    `AUTHORITY_SIGNER=${signerMode}`
  );
  pushCheck(
    checks,
    'SKR mint',
    skrMint === MAINNET_SKR_MINT,
    `SKR_MINT=${skrMint}`
  );
  pushCheck(
    checks,
    'fees wallet',
    !feesWallet.equals(PublicKey.default),
    feesWallet.toBase58()
  );
  pushCheck(
    checks,
    'declare_id',
    declareId === programId.toBase58(),
    `declare_id=${declareId}`
  );
  pushCheck(
    checks,
    'Anchor.toml mainnet program',
    anchorMainnetProgramId === programId.toBase58(),
    `Anchor.toml=${anchorMainnetProgramId}`
  );
  pushCheck(
    checks,
    'EXPECTED_INITIAL_AUTHORITY not placeholder',
    expectedInitialAuthority !== PLACEHOLDER_AUTHORITY,
    expectedInitialAuthority
  );
  pushCheck(
    checks,
    'EXPECTED_INITIAL_AUTHORITY matches Ledger',
    expectedInitialAuthority === ledgerPubkey.toBase58(),
    `contract=${expectedInitialAuthority} ledger=${ledgerPubkey.toBase58()}`
  );

  if (!offline) {
    await checkUpgradeableProgram(
      checks,
      new Connection(rpcUrl, 'confirmed'),
      programId,
      ledgerPubkey
    );
  }

  console.log('\n=== Seek Mainnet Preflight ===\n');
  for (const check of checks) {
    console.log(
      `${check.ok ? 'PASS' : 'FAIL'} ${check.label}: ${check.detail}`
    );
  }
  console.log(
    '\nDeploy command must NOT include --final. Keep the Ledger as upgrade authority until post-launch changes settle.'
  );

  if (checks.some((check) => !check.ok)) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\nPreflight failed: ${err.message || err}`);
  process.exit(1);
});
