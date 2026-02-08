import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { WalletState, Bounty } from '../types';
import walletService from '../services/wallet.service';
import { getStats, PlayerStats, recordGameResult } from '../utils/storage';
import { DEMO_MODE } from '../config';

// Get MWA hook return type
type MobileWalletContext = ReturnType<typeof useMobileWallet>;

interface AppContextType {
  // Wallet
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;

  // MWA (for transaction signing when not in demo mode)
  signAndSendTransaction: MobileWalletContext['signAndSendTransaction'];
  connection: MobileWalletContext['connection'];

  // Active bounty
  activeBounty: Bounty | null;
  setActiveBounty: (bounty: Bounty | null) => void;

  // Stats
  stats: PlayerStats;
  refreshStats: () => Promise<void>;
  recordResult: (won: boolean, entryAmount: number, rewardAmount?: number) => Promise<void>;

  // Loading states
  isLoading: boolean;
  isDemoMode: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  // MWA hook for real wallet connection
  const mwa = useMobileWallet();

  const [wallet, setWallet] = useState<WalletState>(walletService.getWalletState());
  const [activeBounty, setActiveBounty] = useState<Bounty | null>(null);
  const [stats, setStats] = useState<PlayerStats>({
    totalPlayed: 0,
    totalWon: 0,
    totalLost: 0,
    totalEntry: 0,
    totalRewards: 0,
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

  // Sync MWA state to wallet state when not in demo mode
  useEffect(() => {
    if (!DEMO_MODE.ENABLED && mwa.account) {
      setWallet({
        connected: true,
        address: mwa.account.publicKey.toString().slice(0, 4) + '...' + mwa.account.publicKey.toString().slice(-4),
        skrName: null, // Will be fetched from API
        balance: 0, // Balance will be fetched from chain
        isDemo: false,
      });
    } else if (!DEMO_MODE.ENABLED && !mwa.account) {
      setWallet({
        connected: false,
        address: null,
        skrName: null,
        balance: 0,
        isDemo: false,
      });
    }
  }, [mwa.account]);

  // Subscribe to wallet changes (demo mode only)
  useEffect(() => {
    if (DEMO_MODE.ENABLED) {
      return walletService.subscribeToWallet(setWallet);
    }
  }, []);

  // Wallet actions
  const connectWallet = useCallback(async () => {
    if (DEMO_MODE.ENABLED) {
      await walletService.connectWallet();
    } else {
      await mwa.connect();
    }
  }, [mwa]);

  const disconnectWallet = useCallback(async () => {
    if (DEMO_MODE.ENABLED) {
      await walletService.disconnectWallet();
    } else {
      await mwa.disconnect();
    }
    setActiveBounty(null);
  }, [mwa]);

  // Stats actions
  const refreshStats = async () => {
    const savedStats = await getStats();
    setStats(savedStats);
  };

  const recordResult = async (won: boolean, entryAmount: number, rewardAmount?: number) => {
    const updatedStats = await recordGameResult(won, entryAmount, rewardAmount || 0);
    setStats(updatedStats);
  };

  const value: AppContextType = {
    wallet,
    connectWallet,
    disconnectWallet,
    signAndSendTransaction: mwa.signAndSendTransaction,
    connection: mwa.connection,
    activeBounty,
    setActiveBounty,
    stats,
    refreshStats,
    recordResult,
    isLoading,
    isDemoMode: DEMO_MODE.ENABLED,
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
