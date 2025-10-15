"use client";

import { useState, useCallback, useRef } from 'react';
import { base } from 'wagmi/chains';
import { parseUnits } from 'viem';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { TransactionHandler } from './TransactionHandler';
import { USDC_CONTRACTS } from '@/lib/paymaster-config';

interface PaymentProcessorProps {
  amount: string;
  phoneNumber?: string;
  tillNumber?: string;
  accountNumber?: string;
  bankCode?: string;
  accountName: string;
  currency: 'KES' | 'NGN';
  returnAddress: string;
  rate?: number | null; // Optional rate - will be fetched dynamically if not provided
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentProcessor({
  amount,
  phoneNumber,
  tillNumber,
  accountNumber,
  bankCode,
  accountName,
  currency,
  returnAddress,
  rate,
  onSuccess,
  onError
}: PaymentProcessorProps) {
  const [paycrestOrder, setPaycrestOrder] = useState<{
    id: string;
    receiveAddress: string;
    amount: string;
    senderFee: string;
    transactionFee: string;
    validUntil: string;
  } | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating-order' | 'ready-to-pay' | 'processing' | 'success' | 'error' | 'insufficient-funds'>('idle');
  const [errorDetails, setErrorDetails] = useState<{
    currentBalance?: number;
    requiredAmount?: number;
    insufficientBy?: number;
  } | null>(null);
  const pollingStartedRef = useRef(false);
  const successTriggeredRef = useRef(false);

  // USDC contract on Base (using config constant)
  const USDC_CONTRACT = USDC_CONTRACTS.mainnet;

  // Optimized polling that works alongside webhooks for maximum speed
  const startPolling = useCallback((orderId: string) => {
    // Prevent multiple polling instances
    if (pollingStartedRef.current) {
      return;
    }
    pollingStartedRef.current = true;
    
    let attempts = 0;
    const maxAttempts = 60; // Reduced to 5 minutes since webhooks handle most updates
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/paycrest/status/${orderId}`);

        if (!response.ok) {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000);
          }
          return;
        }
        
        const result = await response.json();
        const order = result.order;
        
        
        // Handle specific status updates per PayCrest docs
        switch (order?.status) {
          case 'pending':
            break;

          case 'validated':
          case 'settled':
            // Payment delivered successfully - no UI update needed as user already saw success
            return;
        }
        
        // Handle failure states per PayCrest docs (only official statuses)
        if (order?.status === 'refunded') {
          setStatus('error');
          onError('Payment was refunded. Please try again.');
          return;
        }

        if (order?.status === 'expired') {
          setStatus('error');
          onError('Payment expired. Please try again.');
          return;
        }
        
        // Continue polling for in-progress states (reduced frequency since webhooks are primary)
        attempts++;
        if (attempts < maxAttempts) {
          // Exponential backoff: faster polls initially, slower later since webhooks handle real-time updates
          const pollInterval = attempts < 20 ? 3000 : 10000; // 3s for first 20 attempts, then 10s
          setTimeout(poll, pollInterval);
        }

      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };
    
    // Start polling after 5 seconds (reduced since webhooks provide real-time updates)
    setTimeout(poll, 5000);
  }, [onError]);

  // Create PayCrest order
  const createPaycrestOrder = useCallback(async () => {
    setStatus('creating-order');
    // Reset polling state and success trigger for new order
    pollingStartedRef.current = false;
    successTriggeredRef.current = false;
    
    try {
      const response = await fetch('/api/paycrest/orders/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneNumber,
          tillNumber,
          accountNumber,
          bankCode,
          accountName,
          currency,
          provider: currency === 'KES' ? 'M-Pesa' : 'Bank Transfer',
          returnAddress,
          ...(rate && { rate }) // Include rate only if provided
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // Handle insufficient funds error specifically
        if (response.status === 400 && errorData?.error === 'Insufficient funds') {
          setStatus('insufficient-funds');
          setErrorDetails(errorData.balanceInfo);
          return;
        }

        throw new Error(errorData?.error || 'Failed to create PayCrest order');
      }

      const data = await response.json();

      if (data.success && data.order) {
        let orderData;

        // Handle different response structures
        if (data.order.data) {
          // Structure: { success: true, order: { data: { ... } } }
          orderData = data.order.data;
        } else if (data.order.id || data.order.receiveAddress) {
          // Structure: { success: true, order: { id, receiveAddress, ... } }
          orderData = data.order;
        } else {
          throw new Error('Unexpected PayCrest response structure');
        }

        const paycrestOrderObj = {
          id: orderData.id,
          receiveAddress: orderData.receiveAddress,
          amount: orderData.amount,
          senderFee: orderData.senderFee || '0',
          transactionFee: orderData.transactionFee || '0',
          validUntil: orderData.validUntil
        };

        setPaycrestOrder(paycrestOrderObj);
        setStatus('ready-to-pay');
      } else {
        throw new Error('Invalid response from PayCrest API');
      }
    } catch (error) {
      setStatus('error');
      onError(error instanceof Error ? error.message : 'Failed to create order');
    }
  }, [amount, phoneNumber, tillNumber, accountNumber, bankCode, accountName, currency, returnAddress, rate, onError]);

  // USDC transfer using OnchainKit standard format for proper gas estimation
  const calls = paycrestOrder && paycrestOrder.receiveAddress && paycrestOrder.amount ? (() => {
    const baseAmount = parseFloat(paycrestOrder.amount) || 0;
    const senderFee = parseFloat(paycrestOrder.senderFee) || 0;
    const transactionFee = parseFloat(paycrestOrder.transactionFee) || 0;
    
    // PayCrest docs: "The amount you send to the receive address should be the sum of amount, senderFee, and transactionFee"
    const totalAmountToSend = baseAmount + senderFee + transactionFee;
    const totalAmountWei = parseUnits(totalAmountToSend.toString(), 6);
    
    // Use standard ContractFunctionParameters format for OnchainKit
    return [{
      address: USDC_CONTRACT as `0x${string}`,
      abi: [
        {
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }
      ] as const,
      functionName: 'transfer',
      args: [paycrestOrder.receiveAddress as `0x${string}`, totalAmountWei]
    }];
  })() : [];


  const handleTransactionStatus = useCallback((status: LifecycleStatus) => {
    switch (status.statusName) {
      case 'transactionPending':
        setStatus('processing');
        break;
      case 'success':
        if (successTriggeredRef.current) return;
        successTriggeredRef.current = true;

        // Show success UI immediately
        setStatus('success');

        // Start polling in background
        if (paycrestOrder?.id) {
          startPolling(paycrestOrder.id);
        }

        // Transition to full success page after 2 seconds
        setTimeout(() => onSuccess(), 2000);
        break;
      case 'error':
        setStatus('error');
        onError('Transaction failed');
        break;
    }
  }, [paycrestOrder?.id, startPolling, onError, onSuccess]);

  return (
    <div className="space-y-6">
      {/* Create Order Button */}
      {status === 'idle' && (
        <button
          onClick={createPaycrestOrder}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
        >
          Send ${amount} → {phoneNumber || (tillNumber ? `Till ${tillNumber}` : accountNumber)}
        </button>
      )}

      {/* Creating Order */}
      {status === 'creating-order' && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-white">Creating order...</p>
        </div>
      )}

      {/* Ready to Pay - Transaction Component */}
      {(status === 'ready-to-pay' || status === 'processing') && paycrestOrder && (
        <div className="space-y-4">
          <div className="text-center space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Payment</span>
                <span className="text-white">${paycrestOrder.amount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Service Fee</span>
                <span className="text-gray-100">${paycrestOrder.senderFee}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-300">Gas Fees</span>
                <span className="text-green-400">Free (saves $0.015)</span>
              </div>
              <div className="border-t border-gray-600/40 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">Total to Send</span>
                  <span className="text-white font-bold text-lg">${((parseFloat(paycrestOrder.amount) || 0) + (parseFloat(paycrestOrder.senderFee) || 0) + (parseFloat(paycrestOrder.transactionFee) || 0)).toFixed(2)} USDC</span>
                </div>
              </div>
            </div>
          </div>

          <TransactionHandler
            chainId={base.id}
            calls={calls}
            buttonText="Approve & Send"
            onStatus={handleTransactionStatus}
            onError={() => {
              setStatus('error');
              onError('Transaction failed');
            }}
          />
        </div>
      )}


      {/* Success - Brief confirmation before transitioning */}
      {status === 'success' && (
        <div className="text-center space-y-6 py-8">
          {/* Animated checkmark */}
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-green-500/50">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-green-500 rounded-full animate-ping opacity-20"></div>
          </div>

          {/* Success message */}
          <div className="space-y-2">
            <h3 className="text-white font-bold text-2xl">Transaction Confirmed!</h3>
            <p className="text-green-300 text-base font-medium">
              Your USDC payment was sent successfully
            </p>
            <p className="text-gray-400 text-sm">
              Processing your {currency} transfer...
            </p>
          </div>

          {/* Loading indicator for next page */}
          <div className="flex items-center justify-center space-x-2 text-gray-400 text-sm">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      )}

      {/* Insufficient Funds */}
      {status === 'insufficient-funds' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-xl">Insufficient Funds</h3>
          <div className="bg-black/95 border border-red-600/60 rounded-2xl p-5 backdrop-blur-sm shadow-xl shadow-red-900/60">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-red-300 font-semibold">
                Need more USDC to complete this transaction
              </p>
            </div>
            {errorDetails && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-red-200 font-medium">Your Balance</span>
                  <span className="text-white font-semibold">${errorDetails.currentBalance?.toFixed(4) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-red-200 font-medium">Required</span>
                  <span className="text-red-100 font-semibold">${errorDetails.requiredAmount?.toFixed(4) || '0.00'}</span>
                </div>
                <div className="border-t border-red-500/30 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-red-300 font-semibold">Need</span>
                    <span className="text-red-300 font-bold text-lg">${errorDetails.insufficientBy?.toFixed(4) || '0.00'} more</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setStatus('idle');
              setErrorDetails(null);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

    </div>
  );
}