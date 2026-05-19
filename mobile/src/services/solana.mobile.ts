/**
 * Solana Mobile Transaction Builder
 *
 * Builds accept_bounty instruction + transaction for MWA signing.
 * Uses raw @solana/web3.js (no Anchor dependency) to keep mobile bundle small.
 */
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import { PROGRAM_ID, TOKEN } from '../config';

// Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Associated Token Program ID
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// accept_bounty instruction discriminator (from IDL)
const ACCEPT_BOUNTY_DISCRIMINATOR = Buffer.from([165, 37, 99, 130, 123, 244, 67, 35]);
const ACCEPT_BOUNTY_V2_DISCRIMINATOR = Buffer.from([6, 224, 241, 216, 81, 119, 234, 132]);

// Program public key
const SEEK_PROGRAM_ID = new PublicKey(PROGRAM_ID);

// SKR Mint public key
const SKR_MINT = new PublicKey(TOKEN.MINT);

/**
 * Derive Global State PDA
 */
export function deriveGlobalStatePda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    SEEK_PROGRAM_ID
  );
}

/**
 * Derive House Vault PDA
 */
export function deriveHouseVaultPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('house_vault')],
    SEEK_PROGRAM_ID
  );
}

/**
 * Derive Associated Token Address (SPL Token)
 */
export function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey
): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

/**
 * Serialize accept_bounty instruction data
 * Layout: [8 bytes discriminator] [8 bytes u64 entry_amount] [8 bytes i64 timestamp] [32 bytes commitment]
 */
function serializeAcceptBountyData(
  entryAmount: bigint,
  timestamp: bigint,
  commitment: number[]
): Buffer {
  const data = Buffer.alloc(8 + 8 + 8 + 32); // 56 bytes total

  // Discriminator (8 bytes)
  ACCEPT_BOUNTY_DISCRIMINATOR.copy(data, 0);

  // entry_amount as u64 LE (8 bytes)
  data.writeBigUInt64LE(entryAmount, 8);

  // timestamp as i64 LE (8 bytes)
  data.writeBigInt64LE(timestamp, 16);

  // mission_commitment (32 bytes)
  Buffer.from(commitment).copy(data, 24);

  return data;
}

/**
 * Serialize accept_bounty_v2 instruction data
 * Layout: [8 discriminator] [1 u8 tier] [8 u64 entry_amount] [8 i64 timestamp] [32 commitment]
 */
function serializeAcceptBountyV2Data(
  tier: number,
  entryAmount: bigint,
  timestamp: bigint,
  commitment: number[]
): Buffer {
  const data = Buffer.alloc(8 + 1 + 8 + 8 + 32); // 57 bytes total

  ACCEPT_BOUNTY_V2_DISCRIMINATOR.copy(data, 0);
  data.writeUInt8(tier, 8);
  data.writeBigUInt64LE(entryAmount, 9);
  data.writeBigInt64LE(timestamp, 17);
  Buffer.from(commitment).copy(data, 25);

  return data;
}

/**
 * Build the accept_bounty transaction for MWA signing.
 *
 * @param connection - Solana connection
 * @param playerPubkey - Player's wallet public key
 * @param entryAmount - Entry amount in SKR base units from /prepare
 * @param timestamp - Solana timestamp from /prepare endpoint
 * @param commitment - 32-byte mission commitment from /prepare endpoint
 * @param bountyPda - Pre-computed bounty PDA from /prepare endpoint
 * @returns Serialized transaction ready for MWA signAndSendTransaction
 */
export async function buildAcceptBountyTransaction(
  connection: Connection,
  playerPubkey: PublicKey,
  entryAmount: bigint,
  timestamp: bigint,
  commitment: number[],
  bountyPda: PublicKey,
  options?: {
    instructionVersion?: 1 | 2;
    tier?: number;
  }
): Promise<Transaction> {
  // Derive PDAs
  const [globalStatePda] = deriveGlobalStatePda();
  const [houseVaultPda] = deriveHouseVaultPda();

  // Get player's associated token account for SKR
  const playerTokenAccount = getAssociatedTokenAddress(SKR_MINT, playerPubkey);

  // Serialize instruction data
  const instructionVersion = options?.instructionVersion ?? 1;
  if (instructionVersion === 2 && ![1, 2, 3].includes(options?.tier ?? 0)) {
    throw new Error('accept_bounty_v2 requires tier 1, 2, or 3');
  }
  const instructionData = instructionVersion === 2
    ? serializeAcceptBountyV2Data(
        options?.tier ?? 0,
        entryAmount,
        timestamp,
        commitment
      )
    : serializeAcceptBountyData(
        entryAmount,
        timestamp,
        commitment
      );

  // Build instruction with accounts in exact IDL order
  const instruction = new TransactionInstruction({
    programId: SEEK_PROGRAM_ID,
    keys: [
      { pubkey: playerPubkey, isSigner: true, isWritable: true },           // player
      { pubkey: globalStatePda, isSigner: false, isWritable: true },        // global_state
      { pubkey: bountyPda, isSigner: false, isWritable: true },             // bounty
      { pubkey: playerTokenAccount, isSigner: false, isWritable: true },    // player_token_account
      { pubkey: houseVaultPda, isSigner: false, isWritable: true },         // house_vault
      { pubkey: SKR_MINT, isSigner: false, isWritable: false },             // skr_mint
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },     // token_program
    ],
    data: instructionData,
  });

  // Build transaction
  const transaction = new Transaction();
  transaction.add(instruction);

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = playerPubkey;

  return transaction;
}
