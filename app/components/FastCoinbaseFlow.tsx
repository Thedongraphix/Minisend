"use client";

import { useState, useCallback } from 'react';
import { 
  Transaction, 
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from '@coinbase/onchainkit/transaction';
import { parseUnits } from 'viem';
import { base } from 'wagmi/chains';

interface FastCoinbaseFlowProps {
  amount: string;
  phoneNumber: string;
  accountName: string;
  currency: 'KES' | 'NGN';
  provider: string;
  rate: number;
  onComplete: (orderId: string) => void;
  onError: (error: string) => void;
}

export function FastCoinbaseFlow({
  amount,
  phoneNumber,
  accountName,
  currency,
  provider,
  rate,
  onComplete,
  onError
}: FastCoinbaseFlowProps) {
  const [orderId, setOrderId] = useState<string>('');
  const [orderData, setOrderData] = useState<{
    id: string;
    receiveAddress: string;
    totalAmount: string;
    validUntil: string;
  } | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [settlementTime, setSettlementTime] = useState<number>(0);

  // USDC contract on Base
  const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  // Create PayCrest order before transaction
  const createOrder = useCallback(async () => {
    try {
      const response = await fetch('/api/paycrest/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneNumber,
          accountName,
          rate,
          returnAddress: '0x0000000000000000000000000000000000000000', // Will be replaced
          currency,
          provider
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const { order } = await response.json();
      setOrderId(order.id);
      setOrderData(order);
      return order;
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Order creation failed');
      throw error;
    }
  }, [amount, phoneNumber, accountName, rate, currency, provider, onError]);

  // Ultra-fast polling with aggressive intervals
  const startUltraFastPolling = useCallback(async () => {
    if (!orderId) return;

    setIsPolling(true);
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max

    const ultraFastPoll = async () => {
      try {
        const response = await fetch(`/api/paycrest/orders?orderId=${orderId}`);
        const { order } = await response.json();

        if (order.status === 'settled') {
          const endTime = Date.now();
          setSettlementTime(Math.round((endTime - startTime) / 1000));
          setIsPolling(false);
          onComplete(orderId);
          return;
        }

        if (order.status === 'refunded' || order.status === 'expired') {
          setIsPolling(false);
          throw new Error(`Order ${order.status}`);
        }

        attempts++;
        if (attempts < maxAttempts) {
          // Aggressive polling: 500ms intervals for first 30 seconds, then 1s
          const interval = attempts < 60 ? 500 : 1000;
          setTimeout(ultraFastPoll, interval);
        } else {
          setIsPolling(false);
          throw new Error('Settlement timeout - order may still complete');
        }
      } catch (error) {
        setIsPolling(false);
        onError(error instanceof Error ? error.message : 'Polling failed');
      }
    };

    ultraFastPoll();
  }, [orderId, onComplete, onError]);

  // Handle successful transaction
  const handleSuccess = useCallback(() => {
    if (orderId) {
      startUltraFastPolling();
    }
  }, [orderId, startUltraFastPolling]);

  // Prepare transaction calls
  const calls = orderData ? [
    {
      to: USDC_CONTRACT as `0x${string}`,
      data: `0xa9059cbb${orderData.receiveAddress.slice(2).padStart(64, '0')}${parseUnits(orderData.totalAmount, 6).toString(16).padStart(64, '0')}` as `0x${string}`,
      value: BigInt(0),
    }
  ] : [];

  return (
    <div className="space-y-4">
      {/* Settlement Time Display */}
      {isPolling && (
        <div className="bg-green-900/20 border border-green-600 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-green-300 text-sm font-medium">
              ⚡ Ultra-Fast Settlement Active
            </span>
            <span className="text-green-400 text-xs">
              Polling every 500ms
            </span>
          </div>
        </div>
      )}

      {settlementTime > 0 && (
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
          <div className="text-center">
            <span className="text-blue-300 text-sm font-medium">
              🎉 Settled in {settlementTime} seconds!
            </span>
          </div>
        </div>
      )}

      <Transaction
        chainId={base.id}
        calls={calls}
        onSuccess={handleSuccess}
        onError={(error) => onError(error.message)}
      >
        <TransactionButton
          disabled={!orderData}
          text={orderData ? "Send USDC (Coinbase Wallet)" : "Creating order..."}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg"
        />
        
        <TransactionStatus>
          <TransactionStatusLabel />
          <TransactionStatusAction />
        </TransactionStatus>
      </Transaction>

      {/* Order Creation */}
      {!orderData && (
        <button
          onClick={createOrder}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg"
        >
          Create Order & Prepare Transaction
        </button>
      )}

      {/* Speed Optimization Info */}
      <div className="text-xs text-gray-400 space-y-1">
        <div>• Coinbase Wallet integration for instant transaction</div>
        <div>• 500ms polling intervals for ultra-fast settlement detection</div>
        <div>• Direct USDC transfer with optimized gas</div>
        <div>• Target: &lt;30 second settlement time</div>
      </div>
    </div>
  );
}