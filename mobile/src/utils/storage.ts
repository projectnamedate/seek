import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage utilities for persisting data
 */

const KEYS = {
  WALLET_ADDRESS: 'seek_wallet_address',
  STATS: 'seek_stats',
  SETTINGS: 'seek_settings',
  LAST_BOUNTY: 'seek_last_bounty',
} as const;

/**
 * Player statistics
 */
export interface PlayerStats {
  totalPlayed: number;
  totalWon: number;
  totalLost: number;
  totalEntry: number;
  totalRewards: number;
  winStreak: number;
  bestStreak: number;
  lastPlayedAt: number | null;
}

const DEFAULT_STATS: PlayerStats = {
  totalPlayed: 0,
  totalWon: 0,
  totalLost: 0,
  totalEntry: 0,
  totalRewards: 0,
  winStreak: 0,
  bestStreak: 0,
  lastPlayedAt: null,
};

/**
 * Save wallet address
 */
export async function saveWalletAddress(address: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.WALLET_ADDRESS, address);
}

/**
 * Get saved wallet address
 */
export async function getWalletAddress(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.WALLET_ADDRESS);
}

/**
 * Clear wallet address
 */
export async function clearWalletAddress(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.WALLET_ADDRESS);
}

/**
 * Get player stats
 */
export async function getStats(): Promise<PlayerStats> {
  try {
    const data = await AsyncStorage.getItem(KEYS.STATS);
    if (data) {
      return { ...DEFAULT_STATS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('[Storage] Error reading stats:', error);
  }
  return DEFAULT_STATS;
}

/**
 * Update player stats
 */
export async function updateStats(
  update: Partial<PlayerStats>
): Promise<PlayerStats> {
  const current = await getStats();
  const updated = { ...current, ...update };
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(updated));
  return updated;
}

/**
 * Record a game result
 */
export async function recordGameResult(
  won: boolean,
  entryAmount: number,
  rewardAmount: number = 0
): Promise<PlayerStats> {
  const current = await getStats();

  const updated: PlayerStats = {
    ...current,
    totalPlayed: current.totalPlayed + 1,
    totalWon: current.totalWon + (won ? 1 : 0),
    totalLost: current.totalLost + (won ? 0 : 1),
    totalEntry: current.totalEntry + entryAmount,
    totalRewards: current.totalRewards + (won ? rewardAmount : -entryAmount),
    winStreak: won ? current.winStreak + 1 : 0,
    bestStreak: won
      ? Math.max(current.bestStreak, current.winStreak + 1)
      : current.bestStreak,
    lastPlayedAt: Date.now(),
  };

  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(updated));
  return updated;
}

/**
 * Reset stats
 */
export async function resetStats(): Promise<void> {
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(DEFAULT_STATS));
}
