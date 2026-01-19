/**
 * React Hook: useBlockradarBalance
 * Fetches and manages Blockradar address balance information
 */

import { useState, useEffect, useCallback } from 'react';

interface BlockradarBalanceAsset {
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string;
  network: 'mainnet' | 'testnet';
  address: string;
  blockchain?: {
    name: string;
    slug: string;
    symbol: string;
    logoUrl: string;
  };
}

interface BlockradarBalanceData {
  asset: BlockradarBalanceAsset;
  balance: string;
  convertedBalance: string;
}

interface UseBlockradarBalanceOptions {
  addressId: string | null;
  asset?: string; // Optional asset symbol filter (e.g., 'USDC', 'ETH')
  autoFetch?: boolean;
  refreshInterval?: number; // Auto-refresh interval in milliseconds
}

interface UseBlockradarBalanceReturn {
  balance: BlockradarBalanceData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isRefreshing: boolean;
}

/**
 * Hook to fetch Blockradar address balance
 *
 * @param options - Configuration options
 * @returns Balance data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { balance, isLoading, error, refetch } = useBlockradarBalance({
 *   addressId: 'your-address-id',
 *   asset: 'USDC', // Optional: filter by specific asset
 *   autoFetch: true,
 *   refreshInterval: 30000 // Refresh every 30 seconds
 * });
 * ```
 */
export function useBlockradarBalance({
  addressId,
  asset = 'USDC', // Default to USDC for backwards compatibility
  autoFetch = true,
  refreshInterval,
}: UseBlockradarBalanceOptions): UseBlockradarBalanceReturn {
  const [balance, setBalance] = useState<BlockradarBalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (isRefresh = false) => {
    if (!addressId) {
      setError('Address ID is required');
      return;
    }

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Build URL with optional asset filter
      const url = asset
        ? `/api/blockradar/balance/${addressId}?asset=${encodeURIComponent(asset)}`
        : `/api/blockradar/balance/${addressId}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch balance information');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch balance information');
      }

      setBalance(data.data);
      console.log('[useBlockradarBalance] Balance fetched successfully:', {
        balance: data.data.balance,
        asset: data.data.asset?.symbol || 'unknown',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('[useBlockradarBalance] Error fetching balance:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addressId, asset]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && addressId) {
      fetchBalance(false);
    }
  }, [autoFetch, addressId, fetchBalance]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || !addressId) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchBalance(true);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, addressId, fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: () => fetchBalance(true),
    isRefreshing,
  };
}

