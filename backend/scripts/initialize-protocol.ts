/**
 * Initialize the Seek Protocol on-chain (3-step process)
 *
 * Usage: npx ts-node scripts/initialize-protocol.ts
 *
 * Steps:
 *   1. initialize       - Creates GlobalState PDA
 *   2. initializeHouseVault  - Creates house vault token account
 *   3. initializeSingularityVault - Creates singularity vault + sets treasury
 */
import 'dotenv/config';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import bs58 from 'bs58';
import idl from '../src/idl/seek_protocol.json';

// Load config from env
const RPC_URL = process.env.SOLANA_RPC_URL!;
const AUTHORITY_KEY = process.env.AUTHORITY_PRIVATE_KEY!;
const PROGRAM_ID = new PublicKey(process.env.SEEK_PROGRAM_ID!);
const SKR_MINT = new PublicKey(process.env.SKR_MINT!);

async function main() {
  console.log('=== Seek Protocol Initialization ===\n');

  // Setup
  const connection = new Connection(RPC_URL, 'confirmed');
  const authority = Keypair.fromSecretKey(bs58.decode(AUTHORITY_KEY));
  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(idl as any, provider);

  console.log(`RPC:       ${RPC_URL}`);
  console.log(`Authority: ${authority.publicKey.toBase58()}`);
  console.log(`Program:   ${PROGRAM_ID.toBase58()}`);
  console.log(`SKR Mint:  ${SKR_MINT.toBase58()}`);

  const balance = await connection.getBalance(authority.publicKey);
  console.log(`Balance:   ${balance / 1e9} SOL\n`);

  // Derive PDAs
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

  console.log(`Global State PDA:     ${globalStatePda.toBase58()}`);
  console.log(`House Vault PDA:      ${houseVaultPda.toBase58()}`);
  console.log(`Singularity Vault PDA: ${singularityVaultPda.toBase58()}\n`);

  // Check if already initialized
  const existingState = await connection.getAccountInfo(globalStatePda);
  if (existingState) {
    console.log('Global state already exists. Checking vault status...\n');
    const state = await (program.account as any).globalState.fetch(globalStatePda);
    console.log('Current state:', {
      authority: state.authority.toBase58(),
      houseVault: state.houseVault.toBase58(),
      singularityVault: state.singularityVault.toBase58(),
      protocolTreasury: state.protocolTreasury.toBase58(),
      houseFundBalance: state.houseFundBalance.toString(),
      totalBountiesCreated: state.totalBountiesCreated.toString(),
    });

    // Check if vaults need initialization
    const houseVaultExists = await connection.getAccountInfo(houseVaultPda);
    const singularityVaultExists = await connection.getAccountInfo(singularityVaultPda);

    if (!houseVaultExists) {
      console.log('\nHouse vault not initialized. Running step 2...');
      await step2_initHouseVault(program, authority, globalStatePda, houseVaultPda);
    } else {
      console.log('House vault: OK');
    }

    if (!singularityVaultExists) {
      console.log('\nSingularity vault not initialized. Running step 3...');
      const treasuryAta = await getOrCreateTreasury(connection, authority);
      await step3_initSingularityVault(program, authority, globalStatePda, singularityVaultPda, treasuryAta);
    } else {
      console.log('Singularity vault: OK');
    }

    console.log('\nProtocol initialization complete!');
    return;
  }

  // === Step 1: Initialize Global State ===
  console.log('Step 1/3: Initializing global state...');
  try {
    const sig = await program.methods
      .initialize()
      .accounts({
        authority: authority.publicKey,
        globalState: globalStatePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`  TX: ${sig}`);
    console.log('  Global state created!\n');
  } catch (e: any) {
    if (e.message?.includes('already in use')) {
      console.log('  Global state already exists, skipping.\n');
    } else {
      throw e;
    }
  }

  // === Step 2: Initialize House Vault ===
  await step2_initHouseVault(program, authority, globalStatePda, houseVaultPda);

  // === Step 3: Initialize Singularity Vault + Treasury ===
  const treasuryAta = await getOrCreateTreasury(connection, authority);
  await step3_initSingularityVault(program, authority, globalStatePda, singularityVaultPda, treasuryAta);

  // === Verify ===
  console.log('\n=== Verification ===');
  const state = await (program.account as any).globalState.fetch(globalStatePda);
  console.log('Global State:', {
    authority: state.authority.toBase58(),
    houseVault: state.houseVault.toBase58(),
    singularityVault: state.singularityVault.toBase58(),
    protocolTreasury: state.protocolTreasury.toBase58(),
    bump: state.bump,
  });

  console.log('\nProtocol initialization complete!');
}

async function step2_initHouseVault(
  program: Program,
  authority: Keypair,
  globalStatePda: PublicKey,
  houseVaultPda: PublicKey
) {
  console.log('Step 2/3: Initializing house vault...');
  try {
    const sig = await program.methods
      .initializeHouseVault()
      .accounts({
        authority: authority.publicKey,
        globalState: globalStatePda,
        houseVault: houseVaultPda,
        skrMint: SKR_MINT,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(`  TX: ${sig}`);
    console.log('  House vault created!\n');
  } catch (e: any) {
    if (e.message?.includes('already in use')) {
      console.log('  House vault already exists, skipping.\n');
    } else {
      throw e;
    }
  }
}

async function step3_initSingularityVault(
  program: Program,
  authority: Keypair,
  globalStatePda: PublicKey,
  singularityVaultPda: PublicKey,
  treasuryAta: PublicKey
) {
  console.log('Step 3/3: Initializing singularity vault + treasury...');
  try {
    const sig = await program.methods
      .initializeSingularityVault()
      .accounts({
        authority: authority.publicKey,
        globalState: globalStatePda,
        singularityVault: singularityVaultPda,
        protocolTreasury: treasuryAta,
        skrMint: SKR_MINT,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(`  TX: ${sig}`);
    console.log('  Singularity vault + treasury set!\n');
  } catch (e: any) {
    if (e.message?.includes('already in use')) {
      console.log('  Singularity vault already exists, skipping.\n');
    } else {
      throw e;
    }
  }
}

async function getOrCreateTreasury(
  connection: Connection,
  authority: Keypair
): Promise<PublicKey> {
  // Use authority's ATA as the protocol treasury
  const treasuryAta = await getAssociatedTokenAddress(SKR_MINT, authority.publicKey);

  const existing = await connection.getAccountInfo(treasuryAta);
  if (!existing) {
    console.log('Creating treasury token account (authority ATA)...');
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        authority.publicKey,
        treasuryAta,
        authority.publicKey,
        SKR_MINT
      )
    );
    const sig = await connection.sendTransaction(tx, [authority]);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log(`  Treasury ATA created: ${treasuryAta.toBase58()}\n`);
  } else {
    console.log(`Treasury ATA: ${treasuryAta.toBase58()}`);
  }

  return treasuryAta;
}

main().catch((err) => {
  console.error('\nInitialization failed:', err.message || err);
  process.exit(1);
});
