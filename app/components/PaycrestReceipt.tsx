"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaycrestReceiptProps {
  orderId: string;
}

interface OrderStatus {
  ready: boolean;
  status: string;
  amount?: string;
  currency?: string;
  recipientName?: string;
  recipientAccount?: string;
  bankName?: string;
  rate?: string;
  txHash?: string;
  reference?: string;
}

export function PaycrestReceipt({ orderId }: PaycrestReceiptProps) {
  const [orderData, setOrderData] = useState<OrderStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const pollCountRef = useRef(0);
  const maxPolls = 30; // 30 attempts at 3-4s intervals = ~2 minutes max

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided');
      setIsChecking(false);
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkOrderStatus = async () => {
      if (!isMounted || pollCountRef.current >= maxPolls) {
        if (pollCountRef.current >= maxPolls) {
          setError('Status check timed out');
        }
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch(`/api/paycrest/status/${orderId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch order status');
        }

        const result = await response.json();
        const order = result.order;

        if (!order) {
          throw new Error('Order not found');
        }

        // Map PayCrest order data
        const statusData: OrderStatus = {
          ready: ['validated', 'settled'].includes(order.status),
          status: order.status,
          amount: order.amount_in_local?.toString(),
          currency: order.local_currency,
          recipientName: order.account_name,
          recipientAccount: order.account_number,
          bankName: order.bank_name,
          rate: order.rate?.toString(),
          txHash: order.transaction_hash,
          reference: order.reference_id
        };

        setOrderData(statusData);

        // Calculate progress based on status
        let currentProgress = 0;
        if (order.status === 'pending') {
          currentProgress = 30; // Waiting for provider
        } else if (order.status === 'processing') {
          currentProgress = 60; // Provider assigned, sending funds
        } else if (order.status === 'validated' || order.status === 'settled') {
          currentProgress = 100; // Complete
        } else {
          // Default progress based on time elapsed
          currentProgress = Math.min(20 + (pollCountRef.current * 2), 90);
        }
        setProgress(currentProgress);

        // If payment is delivered (validated or settled), stop polling
        if (statusData.ready) {
          setProgress(100);
          setIsChecking(false);
          return;
        }

        // If payment failed, show error
        if (['refunded', 'expired', 'failed'].includes(order.status)) {
          if (order.status === 'refunded') {
            setError('Payment was refunded - no provider could fulfill the order');
          } else if (order.status === 'expired') {
            setError('Payment expired - please try again');
          } else {
            setError('Payment could not be completed');
          }
          setIsChecking(false);
          return;
        }

        // Continue polling with slower intervals to avoid rate limiting
        pollCountRef.current++;
        const nextInterval = pollCountRef.current < 10 ? 3000 : 4000; // Slower polling to avoid 429 errors
        timeoutId = setTimeout(checkOrderStatus, nextInterval);

      } catch (err) {
        console.error('Error checking order status:', err);

        // Retry on error (network issues, etc.)
        pollCountRef.current++;
        if (pollCountRef.current < maxPolls) {
          timeoutId = setTimeout(checkOrderStatus, 3000);
        } else {
          setError('Could not verify payment status');
          setIsChecking(false);
        }
      }
    };

    // Start checking immediately
    checkOrderStatus();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [orderId]);

  // Loading state
  if (isChecking && !orderData) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="checking"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl p-4"
        >
          <div className="flex flex-col items-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#3a3a3c] border-t-[#5e5ce6] rounded-full animate-spin"></div>
            <div className="text-center space-y-1">
              <p className="text-white font-medium text-sm">Verifying Payment</p>
              <p className="text-[#8e8e93] text-xs">Please wait...</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1c1c1e] border border-red-500/30 rounded-xl p-4"
      >
        <div className="flex items-center space-y-0 space-x-3">
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">Payment Failed</p>
            <p className="text-[#8e8e93] text-xs mt-0.5">{error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Processing state (transaction sent, awaiting delivery)
  if (orderData && !orderData.ready) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="processing"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl p-4 space-y-3"
        >
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-[#5e5ce6]/20 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-3 border-[#5e5ce6] border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Processing Payment</h3>
                <p className="text-[#8e8e93] text-xs">
                  {orderData.status === 'pending' ? 'Finding provider' :
                   orderData.status === 'processing' ? 'Sending to bank' :
                   'Processing'}
                </p>
              </div>
            </div>
            <span className="text-[#5e5ce6] font-bold text-sm">{progress}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#2c2c2e] rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#5e5ce6] to-[#7b79ea] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {/* Compact Payment Details */}
          <div className="pt-1 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[#8e8e93] text-xs">Amount</span>
              <span className="text-white font-semibold text-sm">
                ₦{parseFloat(orderData.amount || '0').toLocaleString()}
              </span>
            </div>

            {orderData.recipientName && (
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e93] text-xs">To</span>
                <span className="text-white font-medium text-xs truncate max-w-[180px]">
                  {orderData.recipientName}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Success state (payment delivered)
  if (orderData && orderData.ready) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1c1c1e] border border-green-500/30 rounded-xl p-4 space-y-3"
        >
          {/* Success Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#3a3a3c]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Payment Delivered</h3>
                <p className="text-green-400 text-xs">Funds sent successfully</p>
              </div>
            </div>
          </div>

          {/* Receipt Details */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[#8e8e93] text-xs">Amount Sent</span>
              <span className="text-white font-bold text-base">
                ₦{parseFloat(orderData.amount || '0').toLocaleString()}
              </span>
            </div>

            {orderData.rate && (
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e93] text-xs">Exchange Rate</span>
                <span className="text-white font-medium text-xs">
                  1 USDC = ₦{parseFloat(orderData.rate).toFixed(2)}
                </span>
              </div>
            )}

            <div className="h-px bg-[#3a3a3c]"></div>

            {orderData.recipientName && (
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e93] text-xs">Recipient</span>
                <span className="text-white font-medium text-xs truncate max-w-[180px]">
                  {orderData.recipientName}
                </span>
              </div>
            )}

            {orderData.recipientAccount && (
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e93] text-xs">Account</span>
                <span className="text-white font-mono text-xs">
                  {orderData.recipientAccount}
                </span>
              </div>
            )}

            {orderData.bankName && (
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e93] text-xs">Bank</span>
                <span className="text-white font-medium text-xs truncate max-w-[180px]">
                  {orderData.bankName}
                </span>
              </div>
            )}

            {orderData.reference && (
              <div className="flex justify-between items-center pt-1">
                <span className="text-[#8e8e93] text-[10px]">Ref</span>
                <span className="text-[#8e8e93] font-mono text-[10px] truncate max-w-[200px]">
                  {orderData.reference}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}
