"use client";

import { useState, useCallback } from 'react';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import { base } from 'wagmi/chains';
import { parseUnits } from 'viem';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

interface SimpleUSDCPaymentProps {
  amount: string;
  phoneNumber: string;
  accountName: string;
  currency: 'KES' | 'NGN';
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function SimpleUSDCPayment({
  amount,
  phoneNumber,
  accountName,
  currency,
  onSuccess,
  onError
}: SimpleUSDCPaymentProps) {
  const [paycrestOrder, setPaycrestOrder] = useState<{
    data: {
      receiveAddress: string;
      amount: string;
    };
  } | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating-order' | 'ready-to-pay' | 'processing' | 'success' | 'error'>('idle');

  // USDC contract on Base
  const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  // Create PayCrest order
  const createPaycrestOrder = useCallback(async () => {
    setStatus('creating-order');
    
    try {
      const response = await fetch('/api/paycrest/orders-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneNumber,
          accountName,
          currency,
          provider: currency === 'KES' ? 'M-Pesa' : 'Bank Transfer',
          returnAddress: '0x7D6109a51781FB8dFCae01F5Cd5C70dF412a9CEc'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create PayCrest order');
      }

      const data = await response.json();
      console.log('PayCrest order created:', data);
      
      setPaycrestOrder(data.order);
      setStatus('ready-to-pay');
    } catch (error) {
      console.error('Order creation failed:', error);
      setStatus('error');
      onError(error instanceof Error ? error.message : 'Failed to create order');
    }
  }, [amount, phoneNumber, accountName, currency, onError]);

  // USDC transfer transaction call using proper viem encoding
  const calls = paycrestOrder && paycrestOrder.data?.receiveAddress ? [{
    to: USDC_CONTRACT as `0x${string}`,
    data: `0xa9059cbb${paycrestOrder.data.receiveAddress.slice(2).padStart(64, '0')}${parseUnits(paycrestOrder.data.amount.toString(), 6).toString(16).padStart(64, '0')}` as `0x${string}`,
    value: BigInt(0),
  }] : [];

  const handleTransactionStatus = useCallback((status: LifecycleStatus) => {
    console.log('Transaction status:', status);
    
    switch (status.statusName) {
      case 'buildingTransaction':
        setStatus('processing');
        break;
      case 'transactionPending':
        setStatus('processing');
        break;
      case 'success':
        setStatus('success');
        // Start polling PayCrest for settlement
        setTimeout(() => {
          onSuccess();
        }, 2000);
        break;
      case 'error':
        setStatus('error');
        onError('Transaction failed');
        break;
    }
  }, [onSuccess, onError]);

  return (
    <div className="space-y-6">
      {/* Create Order Button */}
      {status === 'idle' && (
        <button
          onClick={createPaycrestOrder}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
        >
          Send ${amount} USDC → {currency} {phoneNumber}
        </button>
      )}

      {/* Creating Order */}
      {status === 'creating-order' && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-white">Creating PayCrest order...</p>
        </div>
      )}

      {/* Ready to Pay - Transaction Component */}
      {status === 'ready-to-pay' && paycrestOrder && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-white font-bold">Ready to Send</h3>
            <p className="text-gray-300 text-sm">
              Send ${amount} USDC to PayCrest for conversion
            </p>
          </div>
          
          <Transaction
            chainId={base.id}
            calls={calls}
            onStatus={handleTransactionStatus}
            onSuccess={(response) => {
              console.log('Transaction successful:', response);
              setStatus('success');
              setTimeout(() => onSuccess(), 2000);
            }}
            onError={(error) => {
              console.error('Transaction error:', error);
              setStatus('error');
              onError('Transaction failed');
            }}
          >
            <TransactionButton
              text="Send USDC"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300"
            />
            
            <TransactionStatus>
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </TransactionStatus>
          </Transaction>
        </div>
      )}

      {/* Processing */}
      {status === 'processing' && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-white">Processing transaction...</p>
        </div>
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-white font-bold text-lg">Payment Sent!</h3>
          <p className="text-gray-300">
            Your {currency} will be sent to {phoneNumber} shortly.
          </p>
        </div>
      )}
    </div>
  );
}