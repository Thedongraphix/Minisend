/**
 * BaseScan utility functions for transaction and address tracking
 */

export const BASESCAN_BASE_URL = 'https://basescan.org';

/**
 * Generate BaseScan transaction URL
 */
export function getBaseScanTxUrl(txHash: string): string {
  if (!txHash) return '';
  return `${BASESCAN_BASE_URL}/tx/${txHash}`;
}

/**
 * Generate BaseScan address URL
 */
export function getBaseScanAddressUrl(address: string): string {
  if (!address) return '';
  return `${BASESCAN_BASE_URL}/address/${address}`;
}

/**
 * Truncate hash for display (e.g., 0x123...789)
 */
export function truncateHash(hash: string, startChars = 6, endChars = 4): string {
  if (!hash || hash.length < startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Copy text to clipboard and return success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Format date to EAT timezone
 */
export function formatEATDate(date: string | Date, includeTime = true): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime && {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
  return d.toLocaleString('en-US', options);
}

/**
 * Calculate time difference in human-readable format
 */
export function getTimeDifference(startDate: string | Date, endDate: string | Date): string {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const diff = end - start;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
