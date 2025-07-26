import { useState, useEffect, useCallback, useRef } from 'react';

export interface PaymentStatusUpdate {
  orderId: string;
  status: string;
  isSettled: boolean;
  isFailed: boolean;
  isProcessing: boolean;
  message?: string;
  txHash?: string;
  amountPaid?: string;
  settledAt?: string;
}

interface UsePaymentStatusOptions {
  orderId: string | null;
  onStatusUpdate?: (update: PaymentStatusUpdate) => void;
  onSettled?: (update: PaymentStatusUpdate) => void;
  onFailed?: (update: PaymentStatusUpdate) => void;
  enabled?: boolean;
  pollInterval?: number;
  maxPollDuration?: number;
}

export function usePaymentStatus({
  orderId,
  onStatusUpdate,
  onSettled,
  onFailed,
  enabled = true,
  pollInterval = 5000, // Poll every 5 seconds
  maxPollDuration = 300000, // Stop polling after 5 minutes
}: UsePaymentStatusOptions) {
  const [currentStatus, setCurrentStatus] = useState<PaymentStatusUpdate | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollStartTime = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownStatus = useRef<string | null>(null);

  const checkPaymentStatus = useCallback(async (orderIdToCheck: string): Promise<PaymentStatusUpdate | null> => {
    try {
      console.log('🔍 Checking payment status for order:', orderIdToCheck);
      
      const response = await fetch(`/api/paycrest/status/${orderIdToCheck}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.order) {
        throw new Error('Invalid response format');
      }

      const order = result.order;
      const statusUpdate: PaymentStatusUpdate = {
        orderId: order.id,
        status: order.status,
        isSettled: order.isSettled || false,
        isFailed: order.isFailed || false,
        isProcessing: order.isProcessing || false,
        txHash: order.txHash,
        amountPaid: order.amountPaid,
        settledAt: order.settledAt,
        message: order.isSettled 
          ? 'Payment completed successfully!' 
          : order.isFailed 
            ? `Payment ${order.status}`
            : 'Payment processing...'
      };

      console.log('📊 Payment status update:', statusUpdate);
      
      return statusUpdate;
    } catch (err) {
      console.error('Failed to check payment status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    }
  }, []);

  const startPolling = useCallback((orderIdToCheck: string) => {
    if (!enabled || isPolling) return;

    console.log('🚀 Starting payment status polling for order:', orderIdToCheck);
    setIsPolling(true);
    setError(null);
    pollStartTime.current = Date.now();

    const poll = async () => {
      // Check if we've exceeded max poll duration
      if (pollStartTime.current && Date.now() - pollStartTime.current > maxPollDuration) {
        console.log('⏰ Max poll duration reached, stopping polling');
        stopPolling();
        return;
      }

      const statusUpdate = await checkPaymentStatus(orderIdToCheck);
      
      if (statusUpdate) {
        setCurrentStatus(statusUpdate);
        
        // Call status update callback if status changed
        if (lastKnownStatus.current !== statusUpdate.status) {
          lastKnownStatus.current = statusUpdate.status;
          onStatusUpdate?.(statusUpdate);
          
          console.log('📢 Status changed to:', statusUpdate.status);
        }

        // Handle terminal states
        if (statusUpdate.isSettled) {
          console.log('✅ Payment settled, stopping polling');
          onSettled?.(statusUpdate);
          stopPolling();
          return;
        }

        if (statusUpdate.isFailed) {
          console.log('❌ Payment failed, stopping polling');
          onFailed?.(statusUpdate);
          stopPolling();
          return;
        }
      }
    };

    // Initial check
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, pollInterval);
  }, [enabled, isPolling, maxPollDuration, pollInterval, checkPaymentStatus, onStatusUpdate, onSettled, onFailed]);

  const stopPolling = useCallback(() => {
    console.log('🛑 Stopping payment status polling');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsPolling(false);
    pollStartTime.current = null;
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!orderId) return null;
    
    const statusUpdate = await checkPaymentStatus(orderId);
    if (statusUpdate) {
      setCurrentStatus(statusUpdate);
      onStatusUpdate?.(statusUpdate);
    }
    return statusUpdate;
  }, [orderId, checkPaymentStatus, onStatusUpdate]);

  // Auto-start polling when orderId is provided and enabled
  useEffect(() => {
    if (orderId && enabled && !isPolling) {
      startPolling(orderId);
    }

    return () => {
      if (isPolling) {
        stopPolling();
      }
    };
  }, [orderId, enabled, startPolling, stopPolling, isPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    currentStatus,
    isPolling,
    error,
    startPolling: orderId ? () => startPolling(orderId) : () => {},
    stopPolling,
    refreshStatus,
  };
}