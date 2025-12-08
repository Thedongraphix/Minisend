import { useState, useEffect, useCallback } from 'react';

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
    if (!transactionCode || !enabled || attempts >= maxAttempts) {
      return;
    }

    setIsChecking(true);
    setError(undefined);

    try {
      const response = await fetch(`/api/pretium/receipt-status/${transactionCode}`);

      if (!response.ok) {
        throw new Error('Failed to check receipt status');
      }

      const data: ReceiptStatus = await response.json();

      if (data.ready && data.hasReceiptNumber && data.receiptNumber) {
        setIsReady(true);
        setReceiptNumber(data.receiptNumber);
        setIsChecking(false);
        return true; // Stop polling
      }

      setAttempts(prev => prev + 1);
      return false; // Continue polling
    } catch (err) {
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
    if (!transactionCode || !enabled || isReady || attempts >= maxAttempts) {
      return;
    }

    // Initial check
    checkStatus();

    // Set up polling
    const intervalId = setInterval(async () => {
      const shouldStop = await checkStatus();
      if (shouldStop) {
        clearInterval(intervalId);
      }
    }, pollInterval);

    return () => clearInterval(intervalId);
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
