/**
 * Transfer SKR from the cold-authority Ledger's ATA to a destination wallet.
 *
 * Used for the second leg of house withdrawals: `withdraw-house` lands funds
 * on the cold authority ATA; this script forwards them (Ledger-signed) to the
 * fees wallet or any other recipient. Creates the destination ATA if missing.
 *
 * Usage (from backend/):
 *   AUTHORITY_SIGNER=ledger \
 *   AUTHORITY_LEDGER_PUBKEY=GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY \
 *   npx ts-node scripts/transfer-skr-ledger.ts <dest_wallet_pubkey> <amount_in_skr>
 */
import 'dotenv/config';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import {
  loadAuthoritySigner,
  sendAuthorityTransaction
} from '../src/utils/authority-signer';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

async function main() {
  const destWalletArg = process.argv[2];
  const amountSkr = Number(process.argv[3]);
  if (!destWalletArg || isNaN(amountSkr) || amountSkr <= 0) {
    console.error(
      'Usage: npx ts-node scripts/transfer-skr-ledger.ts <dest_wallet_pubkey> <amount_in_skr>'
    );
    process.exit(1);
  }
  if ((process.env.SOLANA_NETWORK ?? '').toLowerCase() !== 'mainnet-beta') {
    throw new Error('SOLANA_NETWORK must be mainnet-beta for this script.');
  }

  const RPC_URL = requiredEnv('SOLANA_RPC_URL');
  const SKR_MINT = new PublicKey(requiredEnv('SKR_MINT'));
  const destWallet = new PublicKey(destWalletArg);

  const connection = new Connection(RPC_URL, 'confirmed');
  const authority = await loadAuthoritySigner();

  try {
    const mintInfo = await getMint(connection, SKR_MINT);
    const multiplier = 10 ** mintInfo.decimals;
    const amount = BigInt(Math.round(amountSkr * multiplier));

    const sourceAta = await getAssociatedTokenAddress(
      SKR_MINT,
      authority.publicKey
    );
    const destAta = await getAssociatedTokenAddress(SKR_MINT, destWallet);

    console.log(`Signer:          ${authority.label}`);
    console.log(`Source ATA:      ${sourceAta.toBase58()}`);
    console.log(`Destination ATA: ${destAta.toBase58()}`);
    console.log(`Amount:          ${amountSkr} SKR (${amount.toString()} base units)`);

    const source = await getAccount(connection, sourceAta);
    if (source.amount < amount) {
      throw new Error(
        `Insufficient balance: source has ${Number(source.amount) / multiplier} SKR`
      );
    }

    const tx = new Transaction();

    try {
      await getAccount(connection, destAta);
    } catch {
      console.log('Destination ATA missing — creating it in this transaction...');
      tx.add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          destAta,
          destWallet,
          SKR_MINT
        )
      );
    }

    tx.add(
      createTransferInstruction(
        sourceAta,
        destAta,
        authority.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const sig = await sendAuthorityTransaction(connection, authority, tx, {
      preflightCommitment: 'confirmed'
    });
    console.log(`Transfer confirmed! TX: ${sig}`);
  } finally {
    await authority.close?.();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
