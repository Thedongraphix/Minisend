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
  const pollCountRef = useRef(0);
  const maxPolls = 40; // 40 attempts at 2-3s intervals = ~2 minutes max

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

        // If payment is delivered (validated or settled), stop polling
        if (statusData.ready) {
          setIsChecking(false);
          return;
        }

        // If payment failed, show error
        if (['refunded', 'expired', 'failed'].includes(order.status)) {
          setError('Payment could not be completed');
          setIsChecking(false);
          return;
        }

        // Continue polling with adaptive intervals
        pollCountRef.current++;
        const nextInterval = pollCountRef.current < 15 ? 2000 : 3000; // Fast for first 30s, then slower
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
          className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-2xl p-6"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#3a3a3c] border-t-[#0066FF] rounded-full animate-spin"></div>
            <div className="text-center space-y-2">
              <p className="text-white font-medium">Verifying Payment Status</p>
              <p className="text-[#8e8e93] text-sm">This may take a moment...</p>
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
        className="bg-[#1c1c1e] border border-red-500/30 rounded-2xl p-6"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-400 text-sm text-center">{error}</p>
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
          className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-2xl p-6 space-y-4"
        >
          {/* Status Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#3a3a3c]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#0066FF]/20 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-3 border-[#0066FF] border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="text-white font-semibold">Processing Payment</h3>
                <p className="text-[#8e8e93] text-xs">
                  {orderData.status === 'pending' ? 'Awaiting provider assignment' :
                   orderData.status === 'processing' ? 'Sending funds to recipient' :
                   'Processing transaction'}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#8e8e93] text-sm">Amount</span>
              <span className="text-white font-semibold">
                ₦{parseFloat(orderData.amount || '0').toLocaleString()}
              </span>
            </div>

            {orderData.recipientName && (
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e93] text-sm">Recipient</span>
                <span className="text-white font-medium text-sm truncate max-w-[200px]">
                  {orderData.recipientName}
                </span>
              </div>
            )}

            {orderData.recipientAccount && (
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e93] text-sm">Account</span>
                <span className="text-white font-mono text-sm">
                  {orderData.recipientAccount}
                </span>
              </div>
            )}
          </div>

          {/* Animated Status Indicator */}
          <div className="pt-3 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-[#0066FF] rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-[#0066FF] rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-[#0066FF] rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
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
          className="bg-[#1c1c1e] border border-green-500/30 rounded-2xl p-6 space-y-6"
        >
          {/* Success Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#3a3a3c]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Payment Delivered</h3>
                <p className="text-green-400 text-xs">Funds sent successfully</p>
              </div>
            </div>
          </div>

          {/* Receipt Details */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#8e8e93] text-sm">Amount Sent</span>
              <span className="text-white font-bold text-lg">
                ₦{parseFloat(orderData.amount || '0').toLocaleString()}
              </span>
            </div>

            {orderData.rate && (
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e93] text-sm">Exchange Rate</span>
                <span className="text-white font-medium text-sm">
                  1 USDC = ₦{parseFloat(orderData.rate).toFixed(2)}
                </span>
              </div>
            )}

            <div className="h-px bg-[#3a3a3c]"></div>

            {orderData.recipientName && (
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e93] text-sm">Recipient</span>
                <span className="text-white font-medium text-sm truncate max-w-[200px]">
                  {orderData.recipientName}
                </span>
              </div>
            )}

            {orderData.recipientAccount && (
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e93] text-sm">Account Number</span>
                <span className="text-white font-mono text-sm">
                  {orderData.recipientAccount}
                </span>
              </div>
            )}

            {orderData.bankName && (
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e93] text-sm">Bank</span>
                <span className="text-white font-medium text-sm">
                  {orderData.bankName}
                </span>
              </div>
            )}

            {orderData.reference && (
              <div className="flex flex-col space-y-1 pt-2">
                <span className="text-[#8e8e93] text-xs">Reference ID</span>
                <span className="text-[#8e8e93] font-mono text-xs break-all">
                  {orderData.reference}
                </span>
              </div>
            )}
          </div>

          {/* Success Footer */}
          <div className="pt-3 text-center">
            <div className="inline-flex items-center space-x-2 bg-green-500/10 px-4 py-2 rounded-lg">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-400 text-sm font-medium">Transaction Complete</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}
