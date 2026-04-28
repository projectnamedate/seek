import { Connection, PublicKey } from '@solana/web3.js';
import { WalletState } from '../types';
import { TOKEN } from '../config';

// Dev-only logging - stripped from production builds
const log = (...args: any[]) => __DEV__ && console.log(...args);
const logError = (...args: any[]) => __DEV__ && console.error(...args);

// Singleton wallet state (mirror of AppContext for non-React consumers).
// Updated by AppContext via setWalletState(). Real wallet state is owned
// by AppContext + MWA hook; this exists for legacy fetchRealBalance /
// getFullAddress callers that don't have React context.
let walletState: WalletState = {
  connected: false,
  address: null,
  fullAddress: null,
  skrName: null,
  balance: 0,
  isDemo: false,
};

// Subscribers for state changes (legacy — AppContext is the source of truth)
type WalletListener = (state: WalletState) => void;
const listeners: Set<WalletListener> = new Set();

export function subscribeToWallet(listener: WalletListener): () => void {
  listeners.add(listener);
  listener(walletState);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((listener) => listener(walletState));
}

export function setWalletState(next: WalletState): void {
  walletState = next;
  notifyListeners();
}

export function getWalletState(): WalletState {
  return { ...walletState };
}

/**
 * Get full wallet address (for display in certain contexts).
 * Returns the MWA-populated `fullAddress` when connected, null otherwise.
 */
export function getFullAddress(): string | null {
  return walletState.connected ? walletState.fullAddress : null;
}

export function hasSufficientBalance(amount: number): boolean {
  return walletState.connected && walletState.balance >= amount;
}

export function formatBalance(amount: number): string {
  return `${amount.toLocaleString()} $SKR`;
}

/**
 * Fetch real on-chain SKR token balance for a wallet
 * Returns balance in whole SKR units (not lamports)
 */
export async function fetchRealBalance(
  connection: Connection,
  publicKey: PublicKey,
): Promise<number> {
  try {
    const mintPubkey = new PublicKey(TOKEN.MINT);
    const accounts = await connection.getTokenAccountsByOwner(publicKey, {
      mint: mintPubkey,
    });

    if (accounts.value.length === 0) {
      log('[Wallet] No SKR token account found for', publicKey.toBase58());
      return 0;
    }

    // Token account data: first 32 bytes = mint, next 32 = owner, next 8 = amount (little-endian u64)
    const data = accounts.value[0].account.data;
    const amountBytes = data.slice(64, 72);
    const amount = Number(amountBytes.readBigUInt64LE(0));
    const balance = amount / Math.pow(10, TOKEN.DECIMALS);

    log(`[Wallet] Real SKR balance: ${balance} SKR`);
    return balance;
  } catch (error) {
    logError('[Wallet] Failed to fetch real balance:', error);
    return 0;
  }
}

export default {
  subscribeToWallet,
  setWalletState,
  getWalletState,
  getFullAddress,
  hasSufficientBalance,
  formatBalance,
  fetchRealBalance,
};
