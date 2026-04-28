import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { WalletState, Bounty } from '../types';
import walletService, { fetchRealBalance } from '../services/wallet.service';
import { getStats, PlayerStats, recordGameResult } from '../utils/storage';
import sgtService from '../services/sgt.service';
import apiService from '../services/api.service';

// Get MWA hook return type
type MobileWalletContext = ReturnType<typeof useMobileWallet>;

interface AppContextType {
  // Wallet
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;

  // MWA (for transaction signing)
  signAndSendTransaction: MobileWalletContext['signAndSendTransaction'];
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  connection: MobileWalletContext['connection'];

  // Active bounty
  activeBounty: Bounty | null;
  setActiveBounty: (bounty: Bounty | null) => void;

  // Stats
  stats: PlayerStats;
  refreshStats: () => Promise<void>;
  recordResult: (won: boolean, entryAmount: number, rewardAmount?: number) => Promise<void>;

  // SGT verification
  sgtVerified: boolean;

  // Loading states
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

const EMPTY_WALLET: WalletState = {
  connected: false,
  address: null,
  fullAddress: null,
  skrName: null,
  balance: 0,
  isDemo: false,
};

export function AppProvider({ children }: AppProviderProps) {
  // MWA hook for real wallet connection
  const mwa = useMobileWallet();

  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
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
  const [sgtVerified, setSgtVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mirror state into walletService singleton for non-React consumers.
  useEffect(() => {
    walletService.setWalletState(wallet);
  }, [wallet]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        const savedStats = await getStats();
        setStats(savedStats);
      } catch (error) {
        if (__DEV__) console.error('[AppContext] Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Track whether we've started a balance fetch to avoid duplicates
  const balanceFetchRef = useRef<string | null>(null);

  // Sync MWA state to wallet state
  useEffect(() => {
    if (mwa.account) {
      const fullAddress = mwa.account.publicKey.toBase58();
      const shortAddress = fullAddress.slice(0, 4) + '...' + fullAddress.slice(-4);

      // Set wallet connected immediately with address
      setWallet((prev) => ({
        connected: true,
        address: shortAddress,
        fullAddress: fullAddress,
        skrName: prev.address === shortAddress ? prev.skrName : null,
        balance: prev.address === shortAddress ? prev.balance : 0,
        isDemo: false,
      }));

      // Fetch real balance + .skr name in background (only once per address)
      if (balanceFetchRef.current !== fullAddress) {
        balanceFetchRef.current = fullAddress;

        // Always reflect the on-chain balance — no fallback constant.
        // A wallet with 0 SKR shows 0 (not 50,000).
        if (mwa.connection) {
          fetchRealBalance(mwa.connection, mwa.account.publicKey).then((balance) => {
            setWallet((prev) => prev.connected ? { ...prev, balance: balance ?? 0 } : prev);
          });
        }

        // Fetch .skr name
        apiService.resolveSkrName(fullAddress).then((result) => {
          if (result.success && result.skrName) {
            setWallet((prev) => prev.connected ? { ...prev, skrName: result.skrName! } : prev);
          }
        });
      }
    } else {
      balanceFetchRef.current = null;
      setWallet(EMPTY_WALLET);
    }
  }, [mwa.account, mwa.connection]);

  // Auto-check SGT verification when wallet connects
  useEffect(() => {
    const checkSGT = async () => {
      const addr = wallet.fullAddress || wallet.address;
      if (wallet.connected && addr) {
        const cached = await sgtService.getCachedVerification();
        if (cached.verified && cached.walletAddress === addr) {
          setSgtVerified(true);
        } else {
          const status = await sgtService.checkSGTStatus(addr);
          setSgtVerified(status.verified);
        }
      } else {
        setSgtVerified(false);
      }
    };
    checkSGT();
  }, [wallet.connected, wallet.fullAddress, wallet.address]);

  // Wallet actions — MWA only.
  const connectWallet = useCallback(async () => {
    try {
      await mwa.connect();
    } catch (error) {
      if (__DEV__) console.log('[AppContext] MWA connect failed:', error);
    }
  }, [mwa]);

  const disconnectWallet = useCallback(async () => {
    try {
      await mwa.disconnect();
    } catch (error) {
      if (__DEV__) console.log('[AppContext] Disconnect error:', error);
    }
    balanceFetchRef.current = null;
    setWallet(EMPTY_WALLET);
    setActiveBounty(null);
    setSgtVerified(false);
    sgtService.clearVerification();
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
    signMessage: mwa.signMessage as (message: Uint8Array) => Promise<Uint8Array>,
    connection: mwa.connection,
    activeBounty,
    setActiveBounty,
    stats,
    refreshStats,
    recordResult,
    sgtVerified,
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
