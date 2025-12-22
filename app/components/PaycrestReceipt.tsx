"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface PaycrestReceiptProps {
  orderId: string;
}

interface OrderStatus {
  ready: boolean;
  status: string;
  amount?: string;
  recipientName?: string;
  recipientAccount?: string;
  bankName?: string;
  rate?: string;
  reference?: string;
}

// Status message mapping based on PayCrest events
const getStatusMessage = (status: string) => {
  switch (status) {
    case 'initiated':
      return 'Order created, waiting for payment...';
    case 'pending':
      return 'Payment received, finding provider...';
    case 'processing':
      return 'Provider found, sending funds...';
    case 'validated':
      return 'Payment delivered successfully!';
    case 'settled':
      return 'Transaction complete!';
    case 'refunded':
      return 'Payment refunded - no provider available';
    case 'expired':
      return 'Order expired - please try again';
    default:
      return 'Processing payment...';
  }
};

// Progress percentage based on status
const getProgress = (status: string) => {
  switch (status) {
    case 'initiated':
      return 15;
    case 'pending':
      return 35;
    case 'processing':
      return 70;
    case 'validated':
    case 'settled':
      return 100;
    default:
      return 10;
  }
};

export function PaycrestReceipt({ orderId }: PaycrestReceiptProps) {
  const [orderData, setOrderData] = useState<OrderStatus | null>(null);
  const pollCountRef = useRef(0);
  const maxPolls = 30;

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkOrderStatus = async () => {
      if (!isMounted || pollCountRef.current >= maxPolls) {
        return;
      }

      try {
        const response = await fetch(`/api/paycrest/status/${orderId}`);
        if (!response.ok) throw new Error('Failed to fetch');

        const result = await response.json();
        const order = result.order;

        if (order) {
          const statusData: OrderStatus = {
            ready: ['validated', 'settled'].includes(order.status),
            status: order.status,
            amount: order.amount_in_local?.toString(),
            recipientName: order.account_name,
            recipientAccount: order.account_number,
            bankName: order.bank_name,
            rate: order.rate?.toString(),
            reference: order.reference_id
          };

          setOrderData(statusData);

          // Stop polling if complete or failed
          if (statusData.ready || ['refunded', 'expired', 'failed'].includes(order.status)) {
            return;
          }
        }

        // Continue polling with slower intervals
        pollCountRef.current++;
        const nextInterval = pollCountRef.current < 10 ? 3000 : 4000;
        timeoutId = setTimeout(checkOrderStatus, nextInterval);

      } catch {
        pollCountRef.current++;
        if (pollCountRef.current < maxPolls) {
          timeoutId = setTimeout(checkOrderStatus, 3000);
        }
      }
    };

    checkOrderStatus();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [orderId]);

  const currentStatus = orderData?.status || 'initiated';
  const progress = getProgress(currentStatus);
  const message = getStatusMessage(currentStatus);
  const isComplete = orderData?.ready || false;
  const isFailed = ['refunded', 'expired', 'failed'].includes(currentStatus);

  return (
    <div className="space-y-4">
      {/* Status Message */}
      <div className="text-center">
        <p className={`text-sm font-medium ${
          isComplete ? 'text-green-400' :
          isFailed ? 'text-red-400' :
          'text-white'
        }`}>
          {message}
        </p>
        {orderData?.recipientName && !isFailed && (
          <p className="text-xs text-[#8e8e93] mt-1">
            To {orderData.recipientName}
          </p>
        )}
      </div>

      {/* Simple Progress Bar */}
      {!isComplete && !isFailed && (
        <div className="w-full bg-[#2c2c2e] rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#5e5ce6] to-[#7b79ea]"
            initial={{ width: '10%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Success Receipt */}
      {isComplete && orderData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1c1c1e] border border-green-500/30 rounded-xl p-4 space-y-3"
        >
          {/* Success Header */}
          <div className="flex items-center justify-center space-x-2 pb-3 border-b border-[#3a3a3c]">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-green-400 font-semibold text-sm">Payment Delivered</h3>
          </div>

          {/* Receipt Details */}
          <div className="space-y-2.5">
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
                <span className="text-[#8e8e93] text-xs">Account Number</span>
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
                <span className="text-[#8e8e93] text-[10px]">Reference</span>
                <span className="text-[#8e8e93] font-mono text-[10px] truncate max-w-[200px]">
                  {orderData.reference}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Error Icon */}
      {isFailed && (
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
