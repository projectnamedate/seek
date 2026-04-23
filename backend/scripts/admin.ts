/**
 * Seek Protocol Admin CLI
 *
 * Safe on both devnet and mainnet — SKR decimals are looked up from the
 * mint account at startup, so amount math adapts to whichever cluster
 * you're pointing SOLANA_RPC_URL + SKR_MINT at.
 *
 * Usage:
 *   npx ts-node scripts/admin.ts status                           Protocol state
 *   npx ts-node scripts/admin.ts balances                         All vault balances
 *   npx ts-node scripts/admin.ts fund <amount>                    Fund house vault (SKR)
 *   npx ts-node scripts/admin.ts withdraw <amount>                Withdraw from treasury (SKR)
 *   npx ts-node scripts/admin.ts set-hot <pubkey>                 Rotate hot authority
 *   npx ts-node scripts/admin.ts propose-transfer <pubkey>        Propose cold-auth rotation
 *   npx ts-node scripts/admin.ts accept-transfer                  Accept a pending transfer (run AS the new authority)
 *   npx ts-node scripts/admin.ts cancel-transfer                  Cancel a pending transfer
 *   npx ts-node scripts/admin.ts mint <address> <amount>          Devnet ONLY - mint SKR to player
 *   npx ts-node scripts/admin.ts airdrop <address> <sol>          Devnet ONLY - airdrop SOL to player
 */
import 'dotenv/config';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
  getMint,
} from '@solana/spl-token';
import bs58 from 'bs58';
import idl from '../src/idl/seek_protocol.json';

const RPC_URL = process.env.SOLANA_RPC_URL!;
const AUTHORITY_KEY = process.env.AUTHORITY_PRIVATE_KEY!;
const PROGRAM_ID = new PublicKey(process.env.SEEK_PROGRAM_ID!);
const SKR_MINT = new PublicKey(process.env.SKR_MINT!);
const IS_MAINNET = (process.env.SOLANA_NETWORK ?? '').toLowerCase() === 'mainnet-beta';

async function setup() {
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

  // Dynamic decimals lookup — mainnet SKR is 6, devnet test mint is 9.
  const mintInfo = await getMint(connection, SKR_MINT);
  const decimals = mintInfo.decimals;
  const multiplier = 10 ** decimals;

  return {
    connection,
    authority,
    program,
    globalStatePda,
    houseVaultPda,
    singularityVaultPda,
    decimals,
    multiplier,
    mintAuthority: mintInfo.mintAuthority,
  };
}

function formatSkr(lamports: bigint | number | BN, decimals: number): string {
  const val = typeof lamports === 'number' ? lamports : Number(lamports.toString());
  return (val / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' SKR';
}

async function showStatus() {
  const s = await setup();
  console.log('=== Seek Protocol Status ===\n');
  console.log(`Network:       ${IS_MAINNET ? 'mainnet-beta' : 'devnet'}`);
  console.log(`RPC:           ${RPC_URL}`);
  console.log(`Program:       ${PROGRAM_ID.toBase58()}`);
  console.log(`SKR Mint:      ${SKR_MINT.toBase58()} (${s.decimals} decimals)`);
  console.log(`Authority:     ${s.authority.publicKey.toBase58()}`);

  const solBalance = await s.connection.getBalance(s.authority.publicKey);
  console.log(`SOL Balance:   ${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

  try {
    const state = await (s.program.account as any).globalState.fetch(s.globalStatePda);

    console.log('--- Global State ---');
    console.log(`  Authority:          ${state.authority.toBase58()}`);
    console.log(`  Hot authority:      ${state.hotAuthority?.toBase58() ?? '(legacy binary — pre-v2)'}`);
    const pending = state.pendingAuthority?.toBase58?.();
    if (pending && pending !== PublicKey.default.toBase58()) {
      console.log(`  Pending transfer:   ${pending}`);
    }
    console.log(`  House Vault:        ${state.houseVault.toBase58()}`);
    console.log(`  Singularity Vault:  ${state.singularityVault.toBase58()}`);
    console.log(`  Protocol Treasury:  ${state.protocolTreasury.toBase58()}`);
    console.log(`  House Balance:      ${formatSkr(state.houseFundBalance, s.decimals)}`);
    console.log(`  Singularity Pool:   ${formatSkr(state.singularityBalance, s.decimals)}`);
    console.log(`  Total Burned:       ${formatSkr(state.totalBurned, s.decimals)}`);

    console.log('\n--- Bounty Stats ---');
    console.log(`  Total Created:      ${state.totalBountiesCreated.toString()}`);
    console.log(`  Total Won:          ${state.totalBountiesWon.toString()}`);
    console.log(`  Total Lost:         ${state.totalBountiesLost.toString()}`);
    console.log(`  Singularity Wins:   ${state.totalSingularityWins.toString()}`);

    const won = Number(state.totalBountiesWon);
    const lost = Number(state.totalBountiesLost);
    if (won + lost > 0) {
      const winRate = (won / (won + lost)) * 100;
      console.log(`  Win Rate:           ${winRate.toFixed(1)}%`);
    }
  } catch (e: any) {
    console.log('Protocol not initialized yet (or IDL mismatch — re-sync contracts/target/idl).');
    console.log(`  Error: ${e.message}`);
  }
}

async function showBalances() {
  const s = await setup();
  console.log('=== Vault Balances ===\n');

  const solBalance = await s.connection.getBalance(s.authority.publicKey);
  console.log(`Authority SOL:    ${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  try {
    const authorityAta = await getAssociatedTokenAddress(SKR_MINT, s.authority.publicKey);
    const authorityBalance = await s.connection.getTokenAccountBalance(authorityAta);
    console.log(`Authority SKR:    ${formatSkr(BigInt(authorityBalance.value.amount), s.decimals)}`);
  } catch {
    console.log(`Authority SKR:    0 (no token account)`);
  }

  try {
    const houseBalance = await s.connection.getTokenAccountBalance(s.houseVaultPda);
    console.log(`House Vault:      ${formatSkr(BigInt(houseBalance.value.amount), s.decimals)}`);
  } catch {
    console.log(`House Vault:      not initialized`);
  }

  try {
    const singBalance = await s.connection.getTokenAccountBalance(s.singularityVaultPda);
    console.log(`Singularity Pool: ${formatSkr(BigInt(singBalance.value.amount), s.decimals)}`);
  } catch {
    console.log(`Singularity Pool: not initialized`);
  }
}

async function fundHouse(amountSkr: number) {
  const s = await setup();
  const amountLamports = new BN(Math.round(amountSkr * s.multiplier));

  console.log(`Funding house vault with ${amountSkr} SKR (${amountLamports.toString()} base units)...\n`);

  const authorityAta = await getAssociatedTokenAddress(SKR_MINT, s.authority.publicKey);
  const balance = await s.connection.getTokenAccountBalance(authorityAta);
  console.log(`Authority SKR balance: ${formatSkr(BigInt(balance.value.amount), s.decimals)}`);

  if (BigInt(balance.value.amount) < BigInt(amountLamports.toString())) {
    console.error('Insufficient SKR balance!');
    process.exit(1);
  }

  const sig = await (s.program.methods as any)
    .fundHouse(amountLamports)
    .accounts({
      authority: s.authority.publicKey,
      globalState: s.globalStatePda,
      authorityTokenAccount: authorityAta,
      houseVault: s.houseVaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log(`\nFunded! TX: ${sig}`);

  const newBalance = await s.connection.getTokenAccountBalance(s.houseVaultPda);
  console.log(`House vault balance: ${formatSkr(BigInt(newBalance.value.amount), s.decimals)}`);
}

async function withdrawTreasury(amountSkr: number) {
  const s = await setup();
  const amountLamports = new BN(Math.round(amountSkr * s.multiplier));

  console.log(`Withdrawing ${amountSkr} SKR from treasury...\n`);

  const state = await (s.program.account as any).globalState.fetch(s.globalStatePda);
  const protocolTreasury = state.protocolTreasury as PublicKey;
  const authorityAta = await getAssociatedTokenAddress(SKR_MINT, s.authority.publicKey);

  const sig = await (s.program.methods as any)
    .withdrawTreasury(amountLamports)
    .accounts({
      authority: s.authority.publicKey,
      globalState: s.globalStatePda,
      protocolTreasury,
      authorityTokenAccount: authorityAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log(`Withdrawn! TX: ${sig}`);
}

async function setHotAuthority(newHot: string) {
  const s = await setup();
  const newHotPk = new PublicKey(newHot);

  console.log(`Rotating hot authority to ${newHotPk.toBase58()}...`);

  const sig = await (s.program.methods as any)
    .setHotAuthority(newHotPk)
    .accounts({
      authority: s.authority.publicKey,
      globalState: s.globalStatePda,
    })
    .rpc();

  console.log(`Rotated! TX: ${sig}`);
  console.log('Remember to update HOT_AUTHORITY_PRIVATE_KEY in the backend env.');
}

async function proposeAuthorityTransfer(newAuth: string) {
  const s = await setup();
  const newAuthPk = new PublicKey(newAuth);

  console.log(`Proposing authority transfer to ${newAuthPk.toBase58()}...`);
  console.log('(Nothing changes until the new authority calls accept-transfer.)');

  const sig = await (s.program.methods as any)
    .proposeAuthorityTransfer(newAuthPk)
    .accounts({
      authority: s.authority.publicKey,
      globalState: s.globalStatePda,
    })
    .rpc();

  console.log(`Proposed! TX: ${sig}`);
}

async function acceptAuthorityTransfer() {
  const s = await setup();
  console.log(`Accepting authority transfer AS ${s.authority.publicKey.toBase58()}...`);
  console.log('(Run this with AUTHORITY_PRIVATE_KEY set to the NEW authority.)');

  const sig = await (s.program.methods as any)
    .acceptAuthorityTransfer()
    .accounts({
      newAuthority: s.authority.publicKey,
      globalState: s.globalStatePda,
    })
    .rpc();

  console.log(`Accepted! TX: ${sig}`);
}

async function cancelAuthorityTransfer() {
  const s = await setup();
  console.log(`Cancelling pending authority transfer...`);

  const sig = await (s.program.methods as any)
    .cancelAuthorityTransfer()
    .accounts({
      authority: s.authority.publicKey,
      globalState: s.globalStatePda,
    })
    .rpc();

  console.log(`Cancelled! TX: ${sig}`);
}

async function mintToPlayer(playerAddress: string, amountSkr: number) {
  if (IS_MAINNET) {
    console.error('mint is devnet-only — mainnet SKR is the official Solana Mobile token (you do not control the mint).');
    process.exit(1);
  }
  const s = await setup();
  if (!s.mintAuthority || !s.mintAuthority.equals(s.authority.publicKey)) {
    console.error(`Mint authority is ${s.mintAuthority?.toBase58()}, not the current authority — cannot mint.`);
    process.exit(1);
  }

  const playerPubkey = new PublicKey(playerAddress);
  const amountLamports = BigInt(Math.round(amountSkr * s.multiplier));

  console.log(`Minting ${amountSkr} SKR to ${playerAddress}...\n`);

  const playerAta = await getAssociatedTokenAddress(SKR_MINT, playerPubkey);
  const tx = new Transaction();

  try {
    await getAccount(s.connection, playerAta);
    console.log(`Player ATA exists: ${playerAta.toBase58()}`);
  } catch {
    console.log(`Creating player ATA: ${playerAta.toBase58()}`);
    tx.add(
      createAssociatedTokenAccountInstruction(
        s.authority.publicKey,
        playerAta,
        playerPubkey,
        SKR_MINT,
      )
    );
  }

  tx.add(
    createMintToInstruction(
      SKR_MINT,
      playerAta,
      s.authority.publicKey,
      amountLamports,
    )
  );

  const sig = await s.connection.sendTransaction(tx, [s.authority]);
  await s.connection.confirmTransaction(sig, 'confirmed');
  console.log(`\nMinted! TX: ${sig}`);

  const balance = await s.connection.getTokenAccountBalance(playerAta);
  console.log(`Player SKR balance: ${formatSkr(BigInt(balance.value.amount), s.decimals)}`);
}

async function airdropSol(playerAddress: string, amountSol: number) {
  if (IS_MAINNET) {
    console.error('airdrop is devnet-only (mainnet does not allow faucet airdrops).');
    process.exit(1);
  }
  const s = await setup();
  const playerPubkey = new PublicKey(playerAddress);

  console.log(`Airdropping ${amountSol} SOL to ${playerAddress}...\n`);

  const sig = await s.connection.requestAirdrop(
    playerPubkey,
    amountSol * LAMPORTS_PER_SOL,
  );
  await s.connection.confirmTransaction(sig, 'confirmed');
  console.log(`Airdropped! TX: ${sig}`);

  const balance = await s.connection.getBalance(playerPubkey);
  console.log(`Player SOL balance: ${balance / LAMPORTS_PER_SOL} SOL`);
}

// ── CLI router ───────────────────────────────────────────────────────────────

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
  case 'set-hot':
    if (!arg) {
      console.error('Usage: npx ts-node scripts/admin.ts set-hot <new_hot_pubkey>');
      process.exit(1);
    }
    setHotAuthority(arg).catch(console.error);
    break;
  case 'propose-transfer':
    if (!arg) {
      console.error('Usage: npx ts-node scripts/admin.ts propose-transfer <new_authority_pubkey>');
      process.exit(1);
    }
    proposeAuthorityTransfer(arg).catch(console.error);
    break;
  case 'accept-transfer':
    acceptAuthorityTransfer().catch(console.error);
    break;
  case 'cancel-transfer':
    cancelAuthorityTransfer().catch(console.error);
    break;
  case 'mint': {
    const playerAddr = arg;
    const amount = process.argv[4];
    if (!playerAddr || !amount || isNaN(Number(amount))) {
      console.error('Usage: npx ts-node scripts/admin.ts mint <player_address> <amount_in_skr>');
      process.exit(1);
    }
    mintToPlayer(playerAddr, Number(amount)).catch(console.error);
    break;
  }
  case 'airdrop': {
    const addr = arg;
    const sol = process.argv[4];
    if (!addr || !sol || isNaN(Number(sol))) {
      console.error('Usage: npx ts-node scripts/admin.ts airdrop <address> <amount_in_sol>');
      process.exit(1);
    }
    airdropSol(addr, Number(sol)).catch(console.error);
    break;
  }
  default:
    console.log('Seek Protocol Admin CLI');
    console.log('');
    console.log(`Network: ${IS_MAINNET ? 'mainnet-beta' : 'devnet'}`);
    console.log('');
    console.log('Commands:');
    console.log('  status                    Show protocol state and stats');
    console.log('  balances                  Show all vault balances');
    console.log('  fund <amount>             Fund house vault (SKR)');
    console.log('  withdraw <amt>            Withdraw from treasury (SKR)');
    console.log('  set-hot <pubkey>          Rotate hot authority');
    console.log('  propose-transfer <pubkey> Propose cold-auth rotation');
    console.log('  accept-transfer           Accept pending transfer (AS new authority)');
    console.log('  cancel-transfer           Cancel pending transfer');
    console.log('  mint <addr> <amt>         [devnet only] Mint SKR to a wallet');
    console.log('  airdrop <addr> <sol>      [devnet only] Airdrop SOL to a wallet');
    break;
}
