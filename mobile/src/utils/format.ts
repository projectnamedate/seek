/**
 * Format utilities for displaying values
 */

/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format time in seconds to human readable (e.g., "5 min", "2m 30s")
 */
export function formatTimeHuman(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (secs === 0) {
    return `${mins} min`;
  }
  return `${mins}m ${secs}s`;
}

/**
 * Format SKR amount with symbol
 */
export function formatSkr(amount: number): string {
  return `${amount.toLocaleString()} $SKR`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Truncate wallet address for display
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Calculate remaining time from end timestamp
 */
export function getRemainingSeconds(endTime: number): number {
  return Math.max(0, Math.floor((endTime - Date.now()) / 1000));
}

/**
 * Check if a timestamp has passed
 */
export function isExpired(endTime: number): boolean {
  return Date.now() > endTime;
}
