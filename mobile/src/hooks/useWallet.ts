import { useState, useEffect, useCallback } from 'react';
import walletService from '../services/wallet.service';
import { WalletState } from '../types';

/**
 * Hook for managing wallet state
 */
export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(walletService.getWalletState());
  const [isConnecting, setIsConnecting] = useState(false);

  // Subscribe to wallet changes
  useEffect(() => {
    return walletService.subscribeToWallet(setWallet);
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await walletService.connectWallet();
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    await walletService.disconnectWallet();
  }, []);

  // Check balance
  const hasBalance = useCallback(
    (amount: number) => {
      return walletService.hasSufficientBalance(amount);
    },
    [wallet.balance]
  );

  // Format balance
  const formattedBalance = walletService.formatBalance(wallet.balance);

  return {
    wallet,
    isConnecting,
    connect,
    disconnect,
    hasBalance,
    formattedBalance,
    address: wallet.address,
    balance: wallet.balance,
    connected: wallet.connected,
    isDemo: wallet.isDemo,
  };
}

export default useWallet;
