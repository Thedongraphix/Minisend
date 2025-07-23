"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { base } from 'wagmi/chains';

interface TransactionFlowProps {
  amount: string;
  phoneNumber: string;
  accountName: string;
  currency: 'KES' | 'NGN';
  provider: string;
  rate: number;
  onComplete: (orderId: string) => void;
  onError: (error: string) => void;
}

export function OptimizedTransactionFlow({
  amount,
  phoneNumber,
  accountName,
  currency,
  provider,
  rate,
  onComplete,
  onError
}: TransactionFlowProps) {
  const { address } = useAccount();
  const [status, setStatus] = useState<'idle' | 'creating-order' | 'sending-tx' | 'confirming' | 'polling' | 'complete'>('idle');
  const [orderId, setOrderId] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const { writeContract, data: txData, isPending: isTxPending } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: txData,
  });

  // USDC contract on Base
  const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  // Poll for order completion
  const startPolling = useCallback(async () => {
    if (!orderId) return;

    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/paycrest/orders?orderId=${orderId}`);
        const { order } = await response.json();

        if (order.status === 'settled') {
          setStatus('complete');
          setProgress(100);
          onComplete(orderId);
          return;
        }

        if (order.status === 'refunded' || order.status === 'expired') {
          throw new Error(`Order ${order.status}`);
        }

        attempts++;
        if (attempts < maxAttempts) {
          // Update progress based on attempts
          setProgress(70 + (attempts / maxAttempts) * 25);
          setTimeout(poll, 1000); // Poll every second
        } else {
          throw new Error('Transaction timeout - please check your order status');
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Polling failed');
      }
    };

    poll();
  }, [orderId, onComplete, onError]);

  const startTransaction = useCallback(async () => {
    if (!address) {
      onError('Please connect your wallet');
      return;
    }

    try {
      setStatus('creating-order');
      setProgress(10);

      // Step 1: Create PayCrest order
      const orderResponse = await fetch('/api/paycrest/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneNumber,
          accountName,
          rate,
          returnAddress: address,
          currency,
          provider
        }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const { order } = await orderResponse.json();
      setOrderId(order.id);
      setProgress(30);

      // Step 2: Send USDC transaction
      setStatus('sending-tx');
      const amountWei = parseUnits(order.totalAmount, 6); // USDC has 6 decimals

      writeContract({
        address: USDC_CONTRACT,
        abi: [
          {
            name: 'transfer',
            type: 'function',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable'
          }
        ],
        functionName: 'transfer',
        args: [order.receiveAddress, amountWei],
        chainId: base.id,
      });

    } catch (error) {
      console.error('Transaction error:', error);
      onError(error instanceof Error ? error.message : 'Transaction failed');
      setStatus('idle');
    }
  }, [address, amount, phoneNumber, accountName, rate, currency, provider, writeContract, onError]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isTxConfirmed && txData) {
      setStatus('polling');
      setProgress(70);
      setTxHash(txData);
      startPolling();
    }
  }, [isTxConfirmed, txData, startPolling]);

  // Update progress for transaction states
  useEffect(() => {
    if (isTxPending) {
      setStatus('sending-tx');
      setProgress(40);
    } else if (isTxConfirming) {
      setStatus('confirming');
      setProgress(60);
    }
  }, [isTxPending, isTxConfirming]);

  const getStatusText = () => {
    switch (status) {
      case 'creating-order': return 'Creating order...';
      case 'sending-tx': return 'Confirm transaction in wallet...';
      case 'confirming': return 'Confirming transaction...';
      case 'polling': return 'Processing payment...';
      case 'complete': return 'Payment sent successfully!';
      default: return 'Ready to send';
    }
  };

  return (
    <div className="space-y-4">
      {status !== 'idle' && (
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">{getStatusText()}</span>
            <span className="text-sm text-gray-400">{progress}%</span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {txHash && (
            <div className="mt-2 text-xs text-gray-400">
              <a 
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                View on BaseScan
              </a>
            </div>
          )}
        </div>
      )}

      <button
        onClick={startTransaction}
        disabled={status !== 'idle' || !address}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        {status === 'idle' ? 'Send Payment' : getStatusText()}
      </button>

      {status !== 'idle' && (
        <div className="text-xs text-gray-400 text-center">
          Estimated completion: &lt;60 seconds
        </div>
      )}
    </div>
  );
}