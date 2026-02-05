import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WalletState, Bounty } from '../types';
import walletService from '../services/wallet.service';
import { getStats, PlayerStats, recordGameResult } from '../utils/storage';

interface AppContextType {
  // Wallet
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;

  // Active bounty
  activeBounty: Bounty | null;
  setActiveBounty: (bounty: Bounty | null) => void;

  // Stats
  stats: PlayerStats;
  refreshStats: () => Promise<void>;
  recordResult: (won: boolean, betAmount: number, winAmount?: number) => Promise<void>;

  // Loading states
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [wallet, setWallet] = useState<WalletState>(walletService.getWalletState());
  const [activeBounty, setActiveBounty] = useState<Bounty | null>(null);
  const [stats, setStats] = useState<PlayerStats>({
    totalPlayed: 0,
    totalWon: 0,
    totalLost: 0,
    totalBet: 0,
    totalWinnings: 0,
    winStreak: 0,
    bestStreak: 0,
    lastPlayedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        const savedStats = await getStats();
        setStats(savedStats);
      } catch (error) {
        console.error('[AppContext] Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Subscribe to wallet changes
  useEffect(() => {
    return walletService.subscribeToWallet(setWallet);
  }, []);

  // Wallet actions
  const connectWallet = async () => {
    await walletService.connectWallet();
  };

  const disconnectWallet = async () => {
    await walletService.disconnectWallet();
    setActiveBounty(null);
  };

  // Stats actions
  const refreshStats = async () => {
    const savedStats = await getStats();
    setStats(savedStats);
  };

  const recordResult = async (won: boolean, betAmount: number, winAmount?: number) => {
    const updatedStats = await recordGameResult(won, betAmount, winAmount || 0);
    setStats(updatedStats);
  };

  const value: AppContextType = {
    wallet,
    connectWallet,
    disconnectWallet,
    activeBounty,
    setActiveBounty,
    stats,
    refreshStats,
    recordResult,
    isLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
