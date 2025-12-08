import { useState, useEffect, useCallback } from 'react';

console.log('🔥 useReceiptReadiness.ts loaded');

interface ReceiptStatus {
  ready: boolean;
  status: string;
  hasReceiptNumber: boolean;
  receiptNumber?: string;
  transactionCode?: string;
}

interface UseReceiptReadinessOptions {
  transactionCode?: string;
  enabled?: boolean;
  maxAttempts?: number;
  pollInterval?: number;
}

interface UseReceiptReadinessReturn {
  isReady: boolean;
  isChecking: boolean;
  receiptNumber?: string;
  error?: string;
  checkNow: () => void;
}

/**
 * Hook to check if a receipt is ready for download
 * Polls the status endpoint until M-Pesa code is available
 */
export function useReceiptReadiness({
  transactionCode,
  enabled = true,
  maxAttempts = 10,
  pollInterval = 2000, // 2 seconds
}: UseReceiptReadinessOptions): UseReceiptReadinessReturn {
  const [isReady, setIsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState<string>();
  const [error, setError] = useState<string>();
  const [attempts, setAttempts] = useState(0);

  const checkStatus = useCallback(async () => {
    console.log('[useReceiptReadiness] checkStatus called:', {
      transactionCode,
      enabled,
      attempts,
      maxAttempts,
      shouldSkip: !transactionCode || !enabled || attempts >= maxAttempts
    });

    if (!transactionCode || !enabled || attempts >= maxAttempts) {
      console.log('[useReceiptReadiness] Skipping check - conditions not met');
      return;
    }

    setIsChecking(true);
    setError(undefined);

    try {
      console.log(`[useReceiptReadiness] Fetching status for: ${transactionCode}`);
      const response = await fetch(`/api/pretium/receipt-status/${transactionCode}`);

      console.log('[useReceiptReadiness] Response received:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        throw new Error('Failed to check receipt status');
      }

      const data: ReceiptStatus = await response.json();
      console.log('[useReceiptReadiness] Status data:', data);

      if (data.ready && data.hasReceiptNumber && data.receiptNumber) {
        console.log('[useReceiptReadiness] ✅ Receipt is ready!', {
          receiptNumber: data.receiptNumber
        });
        setIsReady(true);
        setReceiptNumber(data.receiptNumber);
        setIsChecking(false);
        return true; // Stop polling
      }

      console.log('[useReceiptReadiness] ⏳ Receipt not ready yet, will retry');
      setAttempts(prev => prev + 1);
      return false; // Continue polling
    } catch (err) {
      console.error('[useReceiptReadiness] ❌ Error checking status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAttempts(prev => prev + 1);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [transactionCode, enabled, attempts, maxAttempts]);

  // Manual check function
  const checkNow = useCallback(() => {
    setAttempts(0);
    checkStatus();
  }, [checkStatus]);

  // Auto-polling effect
  useEffect(() => {
    console.log('[useReceiptReadiness] Effect triggered:', {
      transactionCode,
      enabled,
      isReady,
      attempts,
      maxAttempts,
      willStartPolling: transactionCode && enabled && !isReady && attempts < maxAttempts
    });

    if (!transactionCode || !enabled || isReady || attempts >= maxAttempts) {
      console.log('[useReceiptReadiness] Not starting polling - conditions not met');
      return;
    }

    console.log('[useReceiptReadiness] 🚀 Starting polling for receipt...');

    // Initial check
    checkStatus();

    // Set up polling
    const intervalId = setInterval(async () => {
      console.log(`[useReceiptReadiness] ⏰ Polling interval triggered (${pollInterval}ms)`);
      const shouldStop = await checkStatus();
      if (shouldStop) {
        console.log('[useReceiptReadiness] ⛔ Stopping polling - receipt ready');
        clearInterval(intervalId);
      }
    }, pollInterval);

    return () => {
      console.log('[useReceiptReadiness] 🧹 Cleanup: stopping polling');
      clearInterval(intervalId);
    };
  }, [transactionCode, enabled, isReady, attempts, maxAttempts, pollInterval, checkStatus]);

  // Stop checking after max attempts
  useEffect(() => {
    if (attempts >= maxAttempts && !isReady) {
      setIsChecking(false);
      setError('Receipt is taking longer than expected. Please try again in a moment.');
    }
  }, [attempts, maxAttempts, isReady]);

  return {
    isReady,
    isChecking,
    receiptNumber,
    error,
    checkNow,
  };
}
