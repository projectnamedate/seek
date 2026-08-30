/**
 * Read-only Seek vault state probe (mainnet).
 *
 * Fetches GlobalState + house/singularity vault token balances + the cold
 * authority and fees-wallet SKR ATAs. No signer, no Ledger, no writes.
 *
 * Usage (from backend/):
 *   npx ts-node scripts/read-vault-state.ts
 */
import 'dotenv/config';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import idl from '../src/idl/seek_protocol.json';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

const RPC_URL = requiredEnv('SOLANA_RPC_URL');
const PROGRAM_ID = new PublicKey(requiredEnv('SEEK_PROGRAM_ID'));
const SKR_MINT = new PublicKey(requiredEnv('SKR_MINT'));
const COLD_AUTHORITY = new PublicKey('GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY');
const FEES_WALLET = new PublicKey('Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr');

async function tokenBalanceUi(
  connection: Connection,
  ata: PublicKey
): Promise<string> {
  try {
    const acc = await getAccount(connection, ata);
    return (Number(acc.amount) / 1e6).toLocaleString(undefined, {
      maximumFractionDigits: 6
    });
  } catch {
    return '(ATA does not exist)';
  }
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  // Read-only provider — dummy wallet is never used to sign.
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: COLD_AUTHORITY,
      signAllTransactions: async (t: any) => t,
      signTransaction: async (t: any) => t
    } as any,
    { commitment: 'confirmed' }
  );
  const program = new Program(idl as any, provider);

  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    PROGRAM_ID
  );
  const [houseVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('house_vault')],
    PROGRAM_ID
  );
  const [singularityVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('singularity_vault')],
    PROGRAM_ID
  );

  const gs: any = await (program.account as any).globalState.fetch(
    globalStatePda
  );
  const houseActual = await getAccount(connection, houseVaultPda);
  const singularityActual = await getAccount(connection, singularityVaultPda);

  const coldAta = await getAssociatedTokenAddress(SKR_MINT, COLD_AUTHORITY);
  const feesAta = await getAssociatedTokenAddress(SKR_MINT, FEES_WALLET);

  const tracked = new BN(gs.houseFundBalance);
  const actual = new BN(houseActual.amount.toString());
  const liability = new BN(gs.activePayoutLiability);
  const available = tracked.lt(actual) ? tracked : actual;
  const unreserved = available.sub(liability);

  console.log('=== Seek mainnet vault state (read-only) ===');
  console.log(`paused:                  ${gs.paused}`);
  console.log(`authority (cold):        ${gs.authority.toBase58()}`);
  console.log(`protocol_treasury:       ${gs.protocolTreasury.toBase58()}`);
  console.log(`house_fund_balance:      ${tracked.div(new BN(1e6)).toString()} SKR (tracked)`);
  console.log(`house vault actual:      ${actual.div(new BN(1e6)).toString()} SKR`);
  console.log(`active_payout_liability: ${liability.div(new BN(1e6)).toString()} SKR`);
  console.log(`active_bounty_count:     ${gs.activeBountyCount.toString()}`);
  console.log(`unreserved (withdrawable): ${unreserved.div(new BN(1e6)).toString()} SKR`);
  console.log(`singularity vault:       ${new BN(singularityActual.amount.toString()).div(new BN(1e6)).toString()} SKR`);
  console.log(`cold ATA ${coldAta.toBase58()}:`);
  console.log(`  balance: ${await tokenBalanceUi(connection, coldAta)} SKR`);
  console.log(`fees ATA ${feesAta.toBase58()}:`);
  console.log(`  balance: ${await tokenBalanceUi(connection, feesAta)} SKR`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
