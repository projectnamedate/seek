import { Connection, PublicKey } from '@solana/web3.js';
import { WalletState } from '../types';
import apiService from './api.service';
import { TOKEN } from '../config';

// Dev-only logging - stripped from production builds
const log = (...args: any[]) => __DEV__ && console.log(...args);
const logError = (...args: any[]) => __DEV__ && console.error(...args);

// Demo wallet configuration
const DEMO_WALLET = {
  address: 'Demo7...seeker',
  fullAddress: 'Demo7xR3kN9vU2mQp8sW4yL6hJ1cBfT5gA2dSeeker',
  initialBalance: 10000, // 10000 SKR to start
};

// Singleton wallet state
let walletState: WalletState = {
  connected: false,
  address: null,
  fullAddress: null,
  skrName: null,
  balance: 0,
  isDemo: true,
};

// Subscribers for state changes
type WalletListener = (state: WalletState) => void;
const listeners: Set<WalletListener> = new Set();

/**
 * Subscribe to wallet state changes
 */
export function subscribeToWallet(listener: WalletListener): () => void {
  listeners.add(listener);
  // Immediately notify with current state
  listener(walletState);
  // Return unsubscribe function
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of state change
 */
function notifyListeners() {
  listeners.forEach((listener) => listener(walletState));
}

/**
 * Connect demo wallet (simulates MWA connection)
 */
export async function connectWallet(): Promise<WalletState> {
  // Simulate connection delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Fetch .skr name for the wallet
  let skrName: string | null = null;
  try {
    const result = await apiService.resolveSkrName(DEMO_WALLET.fullAddress);
    if (result.success && result.skrName) {
      skrName = result.skrName;
      log('[Wallet] Resolved .skr name:', skrName);
    }
  } catch (error) {
    log('[Wallet] Could not resolve .skr name:', error);
  }

  walletState = {
    connected: true,
    address: DEMO_WALLET.address,
    fullAddress: DEMO_WALLET.fullAddress,
    skrName,
    balance: DEMO_WALLET.initialBalance,
    isDemo: true,
  };

  notifyListeners();
  log('[Wallet] Demo wallet connected:', walletState.address, skrName ? `(${skrName})` : '');
  return walletState;
}

/**
 * Disconnect wallet
 */
export async function disconnectWallet(): Promise<void> {
  walletState = {
    connected: false,
    address: null,
    fullAddress: null,
    skrName: null,
    balance: 0,
    isDemo: true,
  };

  notifyListeners();
  log('[Wallet] Wallet disconnected');
}

/**
 * Get current wallet state
 */
export function getWalletState(): WalletState {
  return { ...walletState };
}

/**
 * Get full wallet address (for display in certain contexts)
 */
export function getFullAddress(): string | null {
  return walletState.connected ? DEMO_WALLET.fullAddress : null;
}

/**
 * Deduct entry amount (demo mode - just updates local state)
 */
export async function deductEntry(amount: number): Promise<boolean> {
  if (!walletState.connected) {
    logError('[Wallet] Cannot deduct: wallet not connected');
    return false;
  }

  if (walletState.balance < amount) {
    logError('[Wallet] Insufficient balance');
    return false;
  }

  // Simulate transaction delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  walletState = {
    ...walletState,
    balance: walletState.balance - amount,
  };

  notifyListeners();
  log(`[Wallet] Deducted ${amount} SKR. New balance: ${walletState.balance}`);
  return true;
}

/**
 * Add winnings (demo mode - just updates local state)
 */
export async function addWinnings(amount: number): Promise<void> {
  if (!walletState.connected) {
    logError('[Wallet] Cannot add: wallet not connected');
    return;
  }

  // Simulate transaction delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  walletState = {
    ...walletState,
    balance: walletState.balance + amount,
  };

  notifyListeners();
  log(`[Wallet] Added ${amount} SKR. New balance: ${walletState.balance}`);
}

/**
 * Check if wallet has sufficient balance
 */
export function hasSufficientBalance(amount: number): boolean {
  return walletState.connected && walletState.balance >= amount;
}

/**
 * Format balance for display
 */
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

    // Parse the token account data to get the balance
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
  connectWallet,
  disconnectWallet,
  getWalletState,
  getFullAddress,
  deductEntry,
  addWinnings,
  hasSufficientBalance,
  formatBalance,
  fetchRealBalance,
};
