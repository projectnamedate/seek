import { WalletState } from '../types';

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

  walletState = {
    connected: true,
    address: DEMO_WALLET.address,
    balance: DEMO_WALLET.initialBalance,
    isDemo: true,
  };

  notifyListeners();
  console.log('[Wallet] Demo wallet connected:', walletState.address);
  return walletState;
}

/**
 * Disconnect wallet
 */
export async function disconnectWallet(): Promise<void> {
  walletState = {
    connected: false,
    address: null,
    balance: 0,
    isDemo: true,
  };

  notifyListeners();
  console.log('[Wallet] Wallet disconnected');
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
 * Deduct bet amount (demo mode - just updates local state)
 */
export async function deductBet(amount: number): Promise<boolean> {
  if (!walletState.connected) {
    console.error('[Wallet] Cannot deduct: wallet not connected');
    return false;
  }

  if (walletState.balance < amount) {
    console.error('[Wallet] Insufficient balance');
    return false;
  }

  // Simulate transaction delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  walletState = {
    ...walletState,
    balance: walletState.balance - amount,
  };

  notifyListeners();
  console.log(`[Wallet] Deducted ${amount} SKR. New balance: ${walletState.balance}`);
  return true;
}

/**
 * Add winnings (demo mode - just updates local state)
 */
export async function addWinnings(amount: number): Promise<void> {
  if (!walletState.connected) {
    console.error('[Wallet] Cannot add: wallet not connected');
    return;
  }

  // Simulate transaction delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  walletState = {
    ...walletState,
    balance: walletState.balance + amount,
  };

  notifyListeners();
  console.log(`[Wallet] Added ${amount} SKR. New balance: ${walletState.balance}`);
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

export default {
  subscribeToWallet,
  connectWallet,
  disconnectWallet,
  getWalletState,
  getFullAddress,
  deductBet,
  addWinnings,
  hasSufficientBalance,
  formatBalance,
};
