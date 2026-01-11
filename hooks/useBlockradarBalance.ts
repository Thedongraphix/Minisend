/**
 * React Hook: useBlockradarBalance
 * Fetches and manages Blockradar gateway balance information
 */

import { useState, useEffect, useCallback } from 'react';
import type { BlockradarBalanceData } from '@/lib/blockradar/types';

interface UseBlockradarBalanceOptions {
  addressId: string | null;
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
 * Hook to fetch Blockradar gateway balance
 * 
 * @param options - Configuration options
 * @returns Balance data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { balance, isLoading, error, refetch } = useBlockradarBalance({
 *   addressId: 'your-address-id',
 *   autoFetch: true,
 *   refreshInterval: 30000 // Refresh every 30 seconds
 * });
 * ```
 */
export function useBlockradarBalance({
  addressId,
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
      const response = await fetch(`/api/blockradar/balance/${addressId}`);

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
        asset: data.data.asset.symbol,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('[useBlockradarBalance] Error fetching balance:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addressId]);

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

