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
 *   npx ts-node scripts/admin.ts pause                            Pause new bounty acceptance
 *   npx ts-node scripts/admin.ts resume                           Resume new bounty acceptance
 *   npx ts-node scripts/admin.ts withdraw-house <amount>          Withdraw unreserved house SKR
 *   npx ts-node scripts/admin.ts withdraw-singularity <amount>    Withdraw Singularity SKR while paused with no active bounties
 *   npx ts-node scripts/admin.ts set-hot <pubkey>                 Rotate hot authority
 *   npx ts-node scripts/admin.ts set-treasury <wallet_pubkey>     Rotate fees wallet (cold-signed)
 *   npx ts-node scripts/admin.ts resolve-dispute <bounty_pda> <win|loss>
 *                                                               Resolve disputed bounty (cold-signed)
 *   npx ts-node scripts/admin.ts propose-transfer <pubkey>        Propose cold-auth rotation
 *   npx ts-node scripts/admin.ts accept-transfer                  Accept a pending transfer (run AS the new authority)
 *   npx ts-node scripts/admin.ts cancel-transfer                  Cancel a pending transfer
 *   npx ts-node scripts/admin.ts mint <address> <amount>          Devnet ONLY - mint SKR to player
 *   npx ts-node scripts/admin.ts airdrop <address> <sol>          Devnet ONLY - airdrop SOL to player
 */
import 'dotenv/config';
import {
  Connection,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
  getMint
} from '@solana/spl-token';
import idl from '../src/idl/seek_protocol.json';
import {
  loadAuthoritySigner,
  sendAuthorityTransaction
} from '../src/utils/authority-signer';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required admin env: ${name}`);
  }
  return value;
}

const RPC_URL = requiredEnv('SOLANA_RPC_URL');
const PROGRAM_ID = new PublicKey(requiredEnv('SEEK_PROGRAM_ID'));
const SKR_MINT = new PublicKey(requiredEnv('SKR_MINT'));
const IS_MAINNET =
  (process.env.SOLANA_NETWORK ?? '').toLowerCase() === 'mainnet-beta';

async function setup() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const authority = await loadAuthoritySigner();
  const provider = new AnchorProvider(connection, authority, {
    commitment: 'confirmed'
  });
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
    mintAuthority: mintInfo.mintAuthority
  };
}

async function withSetup<T>(
  fn: (s: Awaited<ReturnType<typeof setup>>) => Promise<T>
): Promise<T> {
  const s = await setup();
  try {
    return await fn(s);
  } finally {
    await s.authority.close?.();
  }
}

function formatSkr(lamports: bigint | number | BN, decimals: number): string {
  const val =
    typeof lamports === 'number' ? lamports : Number(lamports.toString());
  return (
    (val / 10 ** decimals).toLocaleString(undefined, {
      maximumFractionDigits: 4
    }) + ' SKR'
  );
}

async function getOrCreateAuthorityAta(
  s: Awaited<ReturnType<typeof setup>>
): Promise<PublicKey> {
  const authorityAta = await getAssociatedTokenAddress(
    SKR_MINT,
    s.authority.publicKey
  );

  try {
    await getAccount(s.connection, authorityAta);
    return authorityAta;
  } catch {
    console.log(
      `Authority SKR ATA missing. Creating ${authorityAta.toBase58()}...`
    );
    const createIx = createAssociatedTokenAccountInstruction(
      s.authority.publicKey,
      authorityAta,
      s.authority.publicKey,
      SKR_MINT
    );
    const tx = new Transaction().add(createIx);
    const sig = await sendAuthorityTransaction(s.connection, s.authority, tx, {
      preflightCommitment: 'confirmed'
    });
    console.log(`  Authority ATA created. TX: ${sig}`);
    return authorityAta;
  }
}

async function showStatus() {
  return withSetup(async (s) => {
    console.log('=== Seek Protocol Status ===\n');
    console.log(`Network:       ${IS_MAINNET ? 'mainnet-beta' : 'devnet'}`);
    console.log(`RPC:           ${RPC_URL}`);
    console.log(`Program:       ${PROGRAM_ID.toBase58()}`);
    console.log(
      `SKR Mint:      ${SKR_MINT.toBase58()} (${s.decimals} decimals)`
    );
    console.log(`Authority:     ${s.authority.publicKey.toBase58()}`);
    console.log(`Signer:        ${s.authority.label}`);

    const solBalance = await s.connection.getBalance(s.authority.publicKey);
    console.log(
      `SOL Balance:   ${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`
    );

    try {
      const state = await (s.program.account as any).globalState.fetch(
        s.globalStatePda
      );

      console.log('--- Global State ---');
      console.log(`  Authority:          ${state.authority.toBase58()}`);
      console.log(
        `  Hot authority:      ${state.hotAuthority?.toBase58() ?? '(legacy binary — pre-v2)'}`
      );
      const pending = state.pendingAuthority?.toBase58?.();
      if (pending && pending !== PublicKey.default.toBase58()) {
        console.log(`  Pending transfer:   ${pending}`);
      }
      console.log(`  House Vault:        ${state.houseVault.toBase58()}`);
      console.log(`  Singularity Vault:  ${state.singularityVault.toBase58()}`);
      console.log(`  Protocol Treasury:  ${state.protocolTreasury.toBase58()}`);
      console.log(
        `  Paused:             ${state.paused === undefined ? '(legacy binary)' : state.paused ? 'yes' : 'no'}`
      );
      console.log(
        `  House Balance:      ${formatSkr(state.houseFundBalance, s.decimals)}`
      );
      const activeLiability = state.activePayoutLiability
        ? BigInt(state.activePayoutLiability.toString())
        : 0n;
      const activeCount = state.activeBountyCount
        ? state.activeBountyCount.toString()
        : '0';
      const trackedHouse = BigInt(state.houseFundBalance.toString());
      const unreserved =
        trackedHouse > activeLiability ? trackedHouse - activeLiability : 0n;
      console.log(
        `  Active Liability:   ${formatSkr(activeLiability, s.decimals)}`
      );
      console.log(`  Active Bounties:    ${activeCount}`);
      console.log(
        `  Unreserved House:   ${formatSkr(unreserved, s.decimals)}`
      );
      console.log(
        `  Singularity Pool:   ${formatSkr(state.singularityBalance, s.decimals)}`
      );
      console.log(
        `  Total Burned:       ${formatSkr(state.totalBurned, s.decimals)}`
      );

      console.log('\n--- Bounty Stats ---');
      console.log(
        `  Total Created:      ${state.totalBountiesCreated.toString()}`
      );
      console.log(`  Total Won:          ${state.totalBountiesWon.toString()}`);
      console.log(
        `  Total Lost:         ${state.totalBountiesLost.toString()}`
      );
      console.log(
        `  Singularity Wins:   ${state.totalSingularityWins.toString()}`
      );

      const won = Number(state.totalBountiesWon);
      const lost = Number(state.totalBountiesLost);
      if (won + lost > 0) {
        const winRate = (won / (won + lost)) * 100;
        console.log(`  Completion Rate:    ${winRate.toFixed(1)}%`);
      }
    } catch (e: any) {
      console.log(
        'Protocol not initialized yet (or IDL mismatch — re-sync contracts/target/idl).'
      );
      console.log(`  Error: ${e.message}`);
    }
  });
}

async function showBalances() {
  return withSetup(async (s) => {
    console.log('=== Vault Balances ===\n');

    const solBalance = await s.connection.getBalance(s.authority.publicKey);
    console.log(
      `Authority SOL:    ${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`
    );

    try {
      const authorityAta = await getAssociatedTokenAddress(
        SKR_MINT,
        s.authority.publicKey
      );
      const authorityBalance =
        await s.connection.getTokenAccountBalance(authorityAta);
      console.log(
        `Authority SKR:    ${formatSkr(BigInt(authorityBalance.value.amount), s.decimals)}`
      );
    } catch {
      console.log(`Authority SKR:    0 (no token account)`);
    }

    try {
      const houseBalance = await s.connection.getTokenAccountBalance(
        s.houseVaultPda
      );
      console.log(
        `House Vault:      ${formatSkr(BigInt(houseBalance.value.amount), s.decimals)}`
      );
    } catch {
      console.log(`House Vault:      not initialized`);
    }

    try {
      const singBalance = await s.connection.getTokenAccountBalance(
        s.singularityVaultPda
      );
      console.log(
        `Singularity Pool: ${formatSkr(BigInt(singBalance.value.amount), s.decimals)}`
      );
    } catch {
      console.log(`Singularity Pool: not initialized`);
    }

    try {
      const state = await (s.program.account as any).globalState.fetch(
        s.globalStatePda
      );
      const activeLiability = state.activePayoutLiability
        ? BigInt(state.activePayoutLiability.toString())
        : 0n;
      const activeCount = state.activeBountyCount
        ? state.activeBountyCount.toString()
        : '0';
      const trackedHouse = BigInt(state.houseFundBalance.toString());
      const unreserved =
        trackedHouse > activeLiability ? trackedHouse - activeLiability : 0n;
      console.log(
        `Active Liability: ${formatSkr(activeLiability, s.decimals)} (${activeCount} active bounties)`
      );
      console.log(
        `Unreserved House: ${formatSkr(unreserved, s.decimals)} (tracked)`
      );
    } catch {
      // Protocol not initialized yet.
    }
  });
}

async function fundHouse(amountSkr: number) {
  return withSetup(async (s) => {
    const amountLamports = new BN(Math.round(amountSkr * s.multiplier));

    console.log(
      `Funding house vault with ${amountSkr} SKR (${amountLamports.toString()} base units)...\n`
    );

    const authorityAta = await getAssociatedTokenAddress(
      SKR_MINT,
      s.authority.publicKey
    );
    const balance = await s.connection.getTokenAccountBalance(authorityAta);
    console.log(
      `Authority SKR balance: ${formatSkr(BigInt(balance.value.amount), s.decimals)}`
    );

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
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    console.log(`\nFunded! TX: ${sig}`);

    const newBalance = await s.connection.getTokenAccountBalance(
      s.houseVaultPda
    );
    console.log(
      `House vault balance: ${formatSkr(BigInt(newBalance.value.amount), s.decimals)}`
    );
  });
}

async function setProtocolPaused(paused: boolean) {
  return withSetup(async (s) => {
    console.log(`${paused ? 'Pausing' : 'Resuming'} new bounty acceptance...`);

    const sig = await (s.program.methods as any)
      .setProtocolPaused(paused)
      .accounts({
        authority: s.authority.publicKey,
        globalState: s.globalStatePda
      })
      .rpc();

    console.log(`${paused ? 'Paused' : 'Resumed'}! TX: ${sig}`);
  });
}

async function withdrawUnreservedHouse(amountSkr: number) {
  return withSetup(async (s) => {
    const amountLamports = new BN(Math.round(amountSkr * s.multiplier));
    const authorityAta = await getOrCreateAuthorityAta(s);

    console.log(
      `Withdrawing ${amountSkr} SKR (${amountLamports.toString()} base units) from unreserved house funds...`
    );
    console.log(`Destination ATA: ${authorityAta.toBase58()}`);

    const sig = await (s.program.methods as any)
      .withdrawUnreservedHouse(amountLamports)
      .accounts({
        authority: s.authority.publicKey,
        globalState: s.globalStatePda,
        authorityTokenAccount: authorityAta,
        houseVault: s.houseVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    console.log(`Withdrawn! TX: ${sig}`);
  });
}

async function withdrawSingularity(amountSkr: number) {
  return withSetup(async (s) => {
    const amountLamports = new BN(Math.round(amountSkr * s.multiplier));
    const authorityAta = await getOrCreateAuthorityAta(s);

    console.log(
      `Withdrawing ${amountSkr} SKR (${amountLamports.toString()} base units) from Singularity pool...`
    );
    console.log(
      'Protocol must already be paused with zero active bounties for this instruction.'
    );
    console.log(`Destination ATA: ${authorityAta.toBase58()}`);

    const sig = await (s.program.methods as any)
      .withdrawSingularity(amountLamports)
      .accounts({
        authority: s.authority.publicKey,
        globalState: s.globalStatePda,
        authorityTokenAccount: authorityAta,
        singularityVault: s.singularityVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    console.log(`Withdrawn! TX: ${sig}`);
  });
}

async function setHotAuthority(newHot: string) {
  return withSetup(async (s) => {
    const newHotPk = new PublicKey(newHot);

    console.log(`Rotating hot authority to ${newHotPk.toBase58()}...`);

    const sig = await (s.program.methods as any)
      .setHotAuthority(newHotPk)
      .accounts({
        authority: s.authority.publicKey,
        globalState: s.globalStatePda
      })
      .rpc();

    console.log(`Rotated! TX: ${sig}`);
    console.log(
      'Remember to update HOT_AUTHORITY_PRIVATE_KEY in the backend env.'
    );
  });
}

// Rotate the protocol_treasury recipient (i.e. the FEES_WALLET).
// Takes the new wallet pubkey, derives its SKR ATA, creates the ATA
// if it doesn't exist yet (cold authority pays the rent), then calls
// set_treasury on-chain. Cold authority signed.
async function setTreasury(newWallet: string) {
  return withSetup(async (s) => {
    const newWalletPk = new PublicKey(newWallet);
    const newAta = await getAssociatedTokenAddress(SKR_MINT, newWalletPk);

    console.log(`New fees wallet: ${newWalletPk.toBase58()}`);
    console.log(`Derived SKR ATA: ${newAta.toBase58()}`);

    const existing = await s.connection.getAccountInfo(newAta);
    if (!existing) {
      console.log(
        'ATA does not exist — creating it (cold authority pays rent)...'
      );
      const createIx = createAssociatedTokenAccountInstruction(
        s.authority.publicKey,
        newAta,
        newWalletPk,
        SKR_MINT
      );
      const tx = new Transaction().add(createIx);
      const createSig = await sendAuthorityTransaction(
        s.connection,
        s.authority,
        tx,
        {
          preflightCommitment: 'confirmed'
        }
      );
      console.log(`  ATA created. TX: ${createSig}`);
    } else {
      console.log('ATA already exists.');
    }

    const currentState = await (s.program.account as any).globalState.fetch(
      s.globalStatePda
    );
    const oldTreasury = currentState.protocolTreasury as PublicKey;
    console.log(`Old treasury: ${oldTreasury.toBase58()}`);

    const sig = await (s.program.methods as any)
      .setTreasury()
      .accounts({
        authority: s.authority.publicKey,
        globalState: s.globalStatePda,
        newTreasuryOwner: newWalletPk,
        newTreasury: newAta,
        skrMint: SKR_MINT
      })
      .rpc();

    console.log(`Rotated! TX: ${sig}`);
    console.log('All future protocol-treasury inflows will go to the new ATA.');
    console.log(
      'Funds already in the old treasury are unaffected — sweep them separately if needed.'
    );
  });
}

async function resolveDispute(bountyPda: string, outcome: string) {
  return withSetup(async (s) => {
    const normalized = outcome.trim().toLowerCase();
    if (!['win', 'won', 'true', 'loss', 'lost', 'false'].includes(normalized)) {
      throw new Error('Outcome must be one of: win, loss');
    }
    const playerWins = ['win', 'won', 'true'].includes(normalized);
    const bountyPk = new PublicKey(bountyPda);

    const bounty = await (s.program.account as any).bounty.fetch(bountyPk);
    const state = await (s.program.account as any).globalState.fetch(
      s.globalStatePda
    );
    const playerTokenAccount = await getAssociatedTokenAddress(
      SKR_MINT,
      bounty.player as PublicKey
    );

    console.log(
      `Resolving dispute ${bountyPk.toBase58()} as ${playerWins ? 'PLAYER WIN' : 'PLAYER LOSS'}...`
    );
    console.log(`Player: ${bounty.player.toBase58()}`);
    console.log(`Player SKR ATA: ${playerTokenAccount.toBase58()}`);

    const sig = await (s.program.methods as any)
      .resolveDispute(playerWins)
      .accounts({
        authority: s.authority.publicKey,
        globalState: s.globalStatePda,
        bounty: bountyPk,
        playerTokenAccount,
        houseVault: s.houseVaultPda,
        singularityVault: s.singularityVaultPda,
        protocolTreasury: state.protocolTreasury,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    console.log(`Resolved! TX: ${sig}`);
  });
}

async function proposeAuthorityTransfer(newAuth: string) {
  return withSetup(async (s) => {
    const newAuthPk = new PublicKey(newAuth);

    console.log(`Proposing authority transfer to ${newAuthPk.toBase58()}...`);
    console.log(
      '(Nothing changes until the new authority calls accept-transfer.)'
    );

    const sig = await (s.program.methods as any)
      .proposeAuthorityTransfer(newAuthPk)
      .accounts({
        authority: s.authority.publicKey,
        globalState: s.globalStatePda
      })
      .rpc();

    console.log(`Proposed! TX: ${sig}`);
  });
}

async function acceptAuthorityTransfer() {
  return withSetup(async (s) => {
    console.log(
      `Accepting authority transfer AS ${s.authority.publicKey.toBase58()}...`
    );
    console.log(
      '(Run this with AUTHORITY_SIGNER pointing at the NEW authority.)'
    );

    const sig = await (s.program.methods as any)
      .acceptAuthorityTransfer()
      .accounts({
        newAuthority: s.authority.publicKey,
        globalState: s.globalStatePda
      })
      .rpc();

    console.log(`Accepted! TX: ${sig}`);
  });
}

async function cancelAuthorityTransfer() {
  return withSetup(async (s) => {
    console.log(`Cancelling pending authority transfer...`);

    const sig = await (s.program.methods as any)
      .cancelAuthorityTransfer()
      .accounts({
        authority: s.authority.publicKey,
        globalState: s.globalStatePda
      })
      .rpc();

    console.log(`Cancelled! TX: ${sig}`);
  });
}

async function mintToPlayer(playerAddress: string, amountSkr: number) {
  if (IS_MAINNET) {
    console.error(
      'mint is devnet-only — mainnet SKR is the official Solana Mobile token (you do not control the mint).'
    );
    process.exit(1);
  }
  return withSetup(async (s) => {
    if (!s.mintAuthority || !s.mintAuthority.equals(s.authority.publicKey)) {
      console.error(
        `Mint authority is ${s.mintAuthority?.toBase58()}, not the current authority — cannot mint.`
      );
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
          SKR_MINT
        )
      );
    }

    tx.add(
      createMintToInstruction(
        SKR_MINT,
        playerAta,
        s.authority.publicKey,
        amountLamports
      )
    );

    const sig = await sendAuthorityTransaction(s.connection, s.authority, tx, {
      preflightCommitment: 'confirmed'
    });
    console.log(`\nMinted! TX: ${sig}`);

    const balance = await s.connection.getTokenAccountBalance(playerAta);
    console.log(
      `Player SKR balance: ${formatSkr(BigInt(balance.value.amount), s.decimals)}`
    );
  });
}

async function airdropSol(playerAddress: string, amountSol: number) {
  if (IS_MAINNET) {
    console.error(
      'airdrop is devnet-only (mainnet does not allow faucet airdrops).'
    );
    process.exit(1);
  }
  const connection = new Connection(RPC_URL, 'confirmed');
  const playerPubkey = new PublicKey(playerAddress);

  console.log(`Airdropping ${amountSol} SOL to ${playerAddress}...\n`);

  const sig = await connection.requestAirdrop(
    playerPubkey,
    amountSol * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(sig, 'confirmed');
  console.log(`Airdropped! TX: ${sig}`);

  const balance = await connection.getBalance(playerPubkey);
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
  case 'pause':
    setProtocolPaused(true).catch(console.error);
    break;
  case 'resume':
    setProtocolPaused(false).catch(console.error);
    break;
  case 'withdraw-house':
    if (!arg || isNaN(Number(arg))) {
      console.error(
        'Usage: npx ts-node scripts/admin.ts withdraw-house <amount_in_skr>'
      );
      process.exit(1);
    }
    withdrawUnreservedHouse(Number(arg)).catch(console.error);
    break;
  case 'withdraw-singularity':
    if (!arg || isNaN(Number(arg))) {
      console.error(
        'Usage: npx ts-node scripts/admin.ts withdraw-singularity <amount_in_skr>'
      );
      process.exit(1);
    }
    withdrawSingularity(Number(arg)).catch(console.error);
    break;
  case 'set-hot':
    if (!arg) {
      console.error(
        'Usage: npx ts-node scripts/admin.ts set-hot <new_hot_pubkey>'
      );
      process.exit(1);
    }
    setHotAuthority(arg).catch(console.error);
    break;
  case 'set-treasury':
    if (!arg) {
      console.error(
        'Usage: npx ts-node scripts/admin.ts set-treasury <new_fees_wallet_pubkey>'
      );
      console.error(
        '  Rotates the protocol_treasury recipient. Cold-authority signed.'
      );
      console.error(
        '  Pass the WALLET pubkey (not an ATA) — the script derives the ATA.'
      );
      process.exit(1);
    }
    setTreasury(arg).catch(console.error);
    break;
  case 'resolve-dispute': {
    const bountyPda = arg;
    const outcome = process.argv[4];
    if (!bountyPda || !outcome) {
      console.error(
        'Usage: npx ts-node scripts/admin.ts resolve-dispute <bounty_pda> <win|loss>'
      );
      process.exit(1);
    }
    resolveDispute(bountyPda, outcome).catch(console.error);
    break;
  }
  case 'propose-transfer':
    if (!arg) {
      console.error(
        'Usage: npx ts-node scripts/admin.ts propose-transfer <new_authority_pubkey>'
      );
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
      console.error(
        'Usage: npx ts-node scripts/admin.ts mint <player_address> <amount_in_skr>'
      );
      process.exit(1);
    }
    mintToPlayer(playerAddr, Number(amount)).catch(console.error);
    break;
  }
  case 'airdrop': {
    const addr = arg;
    const sol = process.argv[4];
    if (!addr || !sol || isNaN(Number(sol))) {
      console.error(
        'Usage: npx ts-node scripts/admin.ts airdrop <address> <amount_in_sol>'
      );
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
    console.log('  pause                     Pause new bounty acceptance');
    console.log('  resume                    Resume new bounty acceptance');
    console.log(
      '  withdraw-house <amount>  Withdraw unreserved house funds (SKR)'
    );
    console.log(
      '  withdraw-singularity <amount> Withdraw Singularity funds while paused and idle (SKR)'
    );
    console.log('  set-hot <pubkey>          Rotate hot authority');
    console.log(
      '  set-treasury <pubkey>     Rotate fees wallet (protocol_treasury recipient)'
    );
    console.log(
      '  resolve-dispute <bounty> <win|loss> Resolve disputed bounty'
    );
    console.log('  propose-transfer <pubkey> Propose cold-auth rotation');
    console.log(
      '  accept-transfer           Accept pending transfer (AS new authority)'
    );
    console.log('  cancel-transfer           Cancel pending transfer');
    console.log(
      '  mint <addr> <amt>         [devnet only] Mint SKR to a wallet'
    );
    console.log(
      '  airdrop <addr> <sol>      [devnet only] Airdrop SOL to a wallet'
    );
    break;
}
