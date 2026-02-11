/**
 * Seek Protocol Admin CLI
 *
 * Usage:
 *   npx ts-node scripts/admin.ts status        - Show protocol state
 *   npx ts-node scripts/admin.ts fund <amount>  - Fund house vault (in SKR units)
 *   npx ts-node scripts/admin.ts balances       - Show all vault balances
 *   npx ts-node scripts/admin.ts withdraw <amt> - Withdraw from treasury
 */
import 'dotenv/config';
import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import idl from '../src/idl/seek_protocol.json';

const RPC_URL = process.env.SOLANA_RPC_URL!;
const AUTHORITY_KEY = process.env.AUTHORITY_PRIVATE_KEY!;
const PROGRAM_ID = new PublicKey(process.env.SEEK_PROGRAM_ID!);
const SKR_MINT = new PublicKey(process.env.SKR_MINT!);

function setup() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const authority = Keypair.fromSecretKey(bs58.decode(AUTHORITY_KEY));
  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
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

  return { connection, authority, program, globalStatePda, houseVaultPda, singularityVaultPda };
}

function formatSkr(lamports: bigint | number | BN): string {
  const val = typeof lamports === 'number' ? lamports : Number(lamports.toString());
  return (val / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' SKR';
}

async function showStatus() {
  const { connection, authority, program, globalStatePda, houseVaultPda, singularityVaultPda } = setup();

  console.log('=== Seek Protocol Status ===\n');
  console.log(`Authority: ${authority.publicKey.toBase58()}`);

  const solBalance = await connection.getBalance(authority.publicKey);
  console.log(`SOL Balance: ${solBalance / 1e9} SOL\n`);

  try {
    const state = await (program.account as any).globalState.fetch(globalStatePda);

    console.log('--- Global State ---');
    console.log(`  Authority:         ${state.authority.toBase58()}`);
    console.log(`  House Vault:       ${state.houseVault.toBase58()}`);
    console.log(`  Singularity Vault: ${state.singularityVault.toBase58()}`);
    console.log(`  Protocol Treasury: ${state.protocolTreasury.toBase58()}`);
    console.log(`  House Balance:     ${formatSkr(state.houseFundBalance)}`);
    console.log(`  Singularity Pool:  ${formatSkr(state.singularityBalance)}`);
    console.log(`  Total Burned:      ${formatSkr(state.totalBurned)}`);

    console.log('\n--- Bounty Stats ---');
    console.log(`  Total Created:     ${state.totalBountiesCreated.toString()}`);
    console.log(`  Total Won:         ${state.totalBountiesWon.toString()}`);
    console.log(`  Total Lost:        ${state.totalBountiesLost.toString()}`);
    console.log(`  Singularity Wins:  ${state.totalSingularityWins.toString()}`);

    if (Number(state.totalBountiesWon) + Number(state.totalBountiesLost) > 0) {
      const winRate = Number(state.totalBountiesWon) /
        (Number(state.totalBountiesWon) + Number(state.totalBountiesLost)) * 100;
      console.log(`  Win Rate:          ${winRate.toFixed(1)}%`);
    }
  } catch (e: any) {
    console.log('Protocol not initialized yet.');
  }
}

async function showBalances() {
  const { connection, authority, houseVaultPda, singularityVaultPda } = setup();

  console.log('=== Vault Balances ===\n');

  // Authority SOL
  const solBalance = await connection.getBalance(authority.publicKey);
  console.log(`Authority SOL:    ${solBalance / 1e9} SOL`);

  // Authority SKR
  try {
    const authorityAta = await getAssociatedTokenAddress(SKR_MINT, authority.publicKey);
    const authorityBalance = await connection.getTokenAccountBalance(authorityAta);
    console.log(`Authority SKR:    ${formatSkr(BigInt(authorityBalance.value.amount))}`);
  } catch {
    console.log(`Authority SKR:    0 (no token account)`);
  }

  // House vault
  try {
    const houseBalance = await connection.getTokenAccountBalance(houseVaultPda);
    console.log(`House Vault:      ${formatSkr(BigInt(houseBalance.value.amount))}`);
  } catch {
    console.log(`House Vault:      not initialized`);
  }

  // Singularity vault
  try {
    const singBalance = await connection.getTokenAccountBalance(singularityVaultPda);
    console.log(`Singularity Pool: ${formatSkr(BigInt(singBalance.value.amount))}`);
  } catch {
    console.log(`Singularity Pool: not initialized`);
  }
}

async function fundHouse(amountSkr: number) {
  const { connection, authority, program, globalStatePda, houseVaultPda } = setup();

  const amountLamports = new BN(amountSkr * 1e9);
  console.log(`Funding house vault with ${amountSkr} SKR (${amountLamports.toString()} lamports)...\n`);

  const authorityAta = await getAssociatedTokenAddress(SKR_MINT, authority.publicKey);

  // Check balance first
  const balance = await connection.getTokenAccountBalance(authorityAta);
  console.log(`Authority SKR balance: ${formatSkr(BigInt(balance.value.amount))}`);

  if (BigInt(balance.value.amount) < BigInt(amountLamports.toString())) {
    console.error('Insufficient SKR balance!');
    process.exit(1);
  }

  const sig = await program.methods
    .fundHouse(amountLamports)
    .accounts({
      authority: authority.publicKey,
      globalState: globalStatePda,
      authorityTokenAccount: authorityAta,
      houseVault: houseVaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log(`\nFunded! TX: ${sig}`);

  // Show new balance
  const newBalance = await connection.getTokenAccountBalance(houseVaultPda);
  console.log(`House vault balance: ${formatSkr(BigInt(newBalance.value.amount))}`);
}

async function withdrawTreasury(amountSkr: number) {
  const { connection, authority, program, globalStatePda } = setup();

  const amountLamports = new BN(amountSkr * 1e9);
  console.log(`Withdrawing ${amountSkr} SKR from treasury...\n`);

  const state = await (program.account as any).globalState.fetch(globalStatePda);
  const protocolTreasury = state.protocolTreasury as PublicKey;
  const authorityAta = await getAssociatedTokenAddress(SKR_MINT, authority.publicKey);

  const sig = await program.methods
    .withdrawTreasury(amountLamports)
    .accounts({
      authority: authority.publicKey,
      globalState: globalStatePda,
      protocolTreasury,
      authorityTokenAccount: authorityAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log(`Withdrawn! TX: ${sig}`);
}

// CLI router
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'status':
    showStatus().catch(console.error);
    break;
  case 'balances':
    showBalances().catch(console.error);
    break;
  case 'fund':
    if (!arg || isNaN(Number(arg))) {
      console.error('Usage: npx ts-node scripts/admin.ts fund <amount_in_skr>');
      process.exit(1);
    }
    fundHouse(Number(arg)).catch(console.error);
    break;
  case 'withdraw':
    if (!arg || isNaN(Number(arg))) {
      console.error('Usage: npx ts-node scripts/admin.ts withdraw <amount_in_skr>');
      process.exit(1);
    }
    withdrawTreasury(Number(arg)).catch(console.error);
    break;
  default:
    console.log('Seek Protocol Admin CLI');
    console.log('');
    console.log('Commands:');
    console.log('  status           Show protocol state and stats');
    console.log('  balances         Show all vault balances');
    console.log('  fund <amount>    Fund house vault (amount in SKR)');
    console.log('  withdraw <amt>   Withdraw from treasury (amount in SKR)');
    break;
}
