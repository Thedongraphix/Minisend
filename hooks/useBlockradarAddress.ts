/**
 * React Hook: useBlockradarAddress
 * Fetches and manages Blockradar address information
 */

import { useState, useEffect, useCallback } from 'react';
import type { BlockradarAddressData } from '@/lib/blockradar/types';

interface UseBlockradarAddressOptions {
  addressId: string | null;
  showPrivateKey?: boolean;
  autoFetch?: boolean;
}

interface UseBlockradarAddressReturn {
  address: BlockradarAddressData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch Blockradar address information
 * 
 * @param options - Configuration options
 * @returns Address data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { address, isLoading, error, refetch } = useBlockradarAddress({
 *   addressId: 'your-address-id',
 *   showPrivateKey: false,
 *   autoFetch: true
 * });
 * ```
 */
export function useBlockradarAddress({
  addressId,
  showPrivateKey = false,
  autoFetch = true,
}: UseBlockradarAddressOptions): UseBlockradarAddressReturn {
  const [address, setAddress] = useState<BlockradarAddressData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddress = useCallback(async () => {
    if (!addressId) {
      setError('Address ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = showPrivateKey ? '?showPrivateKey=true' : '';
      const response = await fetch(`/api/blockradar/address/${addressId}${queryParams}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch address information');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch address information');
      }

      setAddress(data.data);
      console.log('[useBlockradarAddress] Address fetched successfully:', {
        address: data.data.address,
        blockchain: data.data.blockchain.name,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('[useBlockradarAddress] Error fetching address:', err);
    } finally {
      setIsLoading(false);
    }
  }, [addressId, showPrivateKey]);

  useEffect(() => {
    if (autoFetch && addressId) {
      fetchAddress();
    }
  }, [autoFetch, addressId, fetchAddress]);

  return {
    address,
    isLoading,
    error,
    refetch: fetchAddress,
  };
}

