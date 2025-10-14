"use client";

import { useState, useCallback, useRef } from 'react';
import { base } from 'wagmi/chains';
import { parseUnits } from 'viem';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { LoadingSpinner } from './LoadingSpinner';
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
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<{
    currentBalance?: number;
    requiredAmount?: number;
    insufficientBy?: number;
  } | null>(null);
  const [fallbackMonitoringStarted, setFallbackMonitoringStarted] = useState(false);
  const pollingStartedRef = useRef(false);

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
          console.log('❌ API response not OK:', response.status);
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
            // Show delivery confirmation - this is when M-Pesa actually gets the money
            setStatus('success');
            const deliveryMethod = currency === 'NGN' ? 'bank account' : 'mobile number';
            setStatusMessage(`${currency} validated and delivered to your ${deliveryMethod}`);
            return;
            
          case 'settled':
            // Show delivery confirmation for settled status as well
            setStatus('success');
            const settlementMethod = currency === 'NGN' ? 'bank account' : 'mobile number';
            setStatusMessage(`${currency} settled and delivered to your ${settlementMethod}`);
            return;
        }
        
        // Handle failure states per PayCrest docs (only official statuses)
        if (order?.status === 'refunded') {
          console.log('Order was refunded to the sender');
          setStatus('error');
          onError('Payment was refunded. Please try again.');
          return;
        }
        
        if (order?.status === 'expired') {
          console.log('Order expired without completion');
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
        } else {
          console.log('⏰ Polling timeout - webhook will handle any remaining updates');
          // Don't change UI - webhook system will provide final updates
        }
        
      } catch (error) {
        console.error('📡 Polling error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };
    
    // Start polling after 5 seconds (reduced since webhooks provide real-time updates)
    setTimeout(poll, 5000);
  }, [onError, currency]);

  // Create PayCrest order
  const createPaycrestOrder = useCallback(async () => {
    setStatus('creating-order');
    // Reset polling state for new order
    pollingStartedRef.current = false;
    
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
          setStatusMessage(errorData.details || 'Insufficient USDC balance');
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
          console.error('Unexpected PayCrest response structure:', data);
          throw new Error('Unexpected PayCrest response structure');
        }

        console.log('🎯 Extracted order data:', orderData);
        
        const paycrestOrderObj = {
          id: orderData.id,
          receiveAddress: orderData.receiveAddress,
          amount: orderData.amount,
          senderFee: orderData.senderFee || '0',
          transactionFee: orderData.transactionFee || '0',
          validUntil: orderData.validUntil
        };
        
        console.log('📦 Setting PayCrest order object:', paycrestOrderObj);
        setPaycrestOrder(paycrestOrderObj);
        setStatus('ready-to-pay');
      } else {
        console.error('Invalid PayCrest response:', data);
        throw new Error('Invalid response from PayCrest API');
      }
    } catch (error) {
      console.error('Order creation failed:', error);
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
    
    console.log('💰 USDC Transfer Calculation:', {
      baseAmount,
      senderFee,
      transactionFee,
      totalAmountToSend,
      totalAmountWei: totalAmountWei.toString(),
      receiveAddress: paycrestOrder.receiveAddress
    });
    
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

  console.log('🎯 Transaction call prepared for PayCrest:', {
    receiveAddress: paycrestOrder?.receiveAddress,
    baseAmount: paycrestOrder?.amount,
    senderFee: paycrestOrder?.senderFee,
    transactionFee: paycrestOrder?.transactionFee,
    totalAmountToSend: paycrestOrder && paycrestOrder.amount 
      ? ((parseFloat(paycrestOrder.amount) || 0) + (parseFloat(paycrestOrder.senderFee) || 0) + (parseFloat(paycrestOrder.transactionFee) || 0)).toString()
      : '0',
    usdcContract: USDC_CONTRACT,
    callsLength: calls.length
  });


  const handleTransactionStatus = useCallback((status: LifecycleStatus) => {
    console.log('📱 onStatus callback - Transaction status:', status.statusName, status);
    
    switch (status.statusName) {
      case 'buildingTransaction':
        setStatusMessage('Preparing transaction...');
        // Don't show processing spinner yet - wait for wallet confirmation
        break;
      case 'transactionPending':
        setStatus('processing');
        setStatusMessage('Transaction pending on Base network...');

        // Start fallback success after 30 seconds if transaction doesn't complete normally
        if (!fallbackMonitoringStarted && paycrestOrder?.id) {
          setFallbackMonitoringStarted(true);
          setTimeout(() => {
            console.log('🔄 Fallback: Assuming transaction completed after 30s delay');

            // Start background polling
            startPolling(paycrestOrder.id);

            onSuccess();
          }, 30000); // 30 seconds fallback
        }
        break;
      case 'success':
        console.log('✅ onStatus SUCCESS - payment sent to PayCrest');

        // Start background polling to track delivery and handle failures
        if (paycrestOrder?.id) {
          console.log('🔄 onStatus: Starting polling for order', paycrestOrder.id);
          startPolling(paycrestOrder.id);
        }

        // Call onSuccess immediately - user has successfully sent funds to PayCrest
        onSuccess();
        break;
      case 'error':
        setStatus('error');
        onError('Transaction failed');
        break;
    }
  }, [paycrestOrder?.id, startPolling, onError, fallbackMonitoringStarted, onSuccess]);

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
      {status === 'ready-to-pay' && paycrestOrder && (
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
            onSuccess={() => {
              // Start polling only if not already started by onStatus
              if (paycrestOrder?.id && !pollingStartedRef.current) {
                startPolling(paycrestOrder.id);
              }

              onSuccess();
            }}
            onError={() => {
              setStatus('error');
              onError('Transaction failed');
            }}
          />
        </div>
      )}

      {/* Processing */}
      {status === 'processing' && (
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center">
            <LoadingSpinner />
          </div>

          <div className="space-y-2">
            <h3 className="text-white font-semibold text-lg">Processing Payment</h3>
            <p className="text-gray-300">
              {statusMessage || 'Processing your payment...'}
            </p>
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
              setStatusMessage('');
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