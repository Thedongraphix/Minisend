"use client";

import { useState, useCallback, useEffect } from 'react';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import { base } from 'wagmi/chains';
import { parseUnits } from 'viem';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { usePaymentStatus } from '@/lib/hooks/usePaymentStatus';
import { useRealtimePaymentStatus } from '@/lib/paycrest/realtime';

interface SimpleUSDCPaymentProps {
  amount: string;
  phoneNumber: string;
  accountName: string;
  currency: 'KES' | 'NGN';
  returnAddress: string;
  rate?: number | null; // Optional rate - will be fetched dynamically if not provided
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function SimpleUSDCPayment({
  amount,
  phoneNumber,
  accountName,
  currency,
  returnAddress,
  rate,
  onSuccess,
  onError
}: SimpleUSDCPaymentProps) {
  const [paycrestOrder, setPaycrestOrder] = useState<{
    id: string;
    receiveAddress: string;
    amount: string;
    senderFee: string;
    transactionFee: string;
    validUntil: string;
  } | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating-order' | 'ready-to-pay' | 'processing' | 'converting' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [transactionCompleted, setTransactionCompleted] = useState(false);

  // USDC contract on Base
  const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  // Enhanced payment monitoring with dual approach: polling + real-time
  const paymentStatus = usePaymentStatus({
    orderId: paycrestOrder?.id || null,
    enabled: transactionCompleted && status === 'converting',
    pollInterval: 3000, // Poll every 3 seconds
    maxPollDuration: 180000, // Stop after 3 minutes
    onStatusUpdate: (update) => {
      console.log('📊 Payment status update via polling:', update);
      setStatusMessage(update.message || 'Processing payment...');
    },
    onSettled: (update) => {
      console.log('✅ Payment settled via polling:', update);
      setStatus('success');
      setStatusMessage(`✅ Payment sent! ${currency} delivered to ${phoneNumber}`);
      setTimeout(() => onSuccess(), 2000);
    },
    onFailed: (update) => {
      console.log('❌ Payment failed via polling:', update);
      setStatus('error');
      onError(update.message || 'Payment failed');
    }
  });

  // Real-time updates via Server-Sent Events
  const realtimeStatus = useRealtimePaymentStatus(
    paycrestOrder?.id || null,
    (event) => {
      console.log('🔔 Real-time payment event:', event);
      
      switch (event.type) {
        case 'validation':
          console.log('🎉 Real-time: Payment validated!');
          setStatus('success');
          setStatusMessage(`✅ Payment sent! ${currency} delivered to ${phoneNumber}`);
          setTimeout(() => onSuccess(), 2000);
          break;
          
        case 'settlement':
          console.log('🔗 Real-time: Payment settled!');
          if (status !== 'success') {
            setStatus('success');
            setStatusMessage(`✅ Payment sent! ${currency} delivered to ${phoneNumber}`);
            setTimeout(() => onSuccess(), 2000);
          }
          break;
          
        case 'status_update':
          if (event.status === 'refunded' || event.status === 'expired') {
            setStatus('error');
            onError(event.message || `Payment ${event.status}`);
          } else {
            setStatusMessage(event.message || 'Processing payment...');
          }
          break;
      }
    }
  );

  // Create PayCrest order
  const createPaycrestOrder = useCallback(async () => {
    setStatus('creating-order');
    
    try {
      const response = await fetch('/api/paycrest/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneNumber,
          accountName,
          currency,
          provider: currency === 'KES' ? 'M-Pesa' : 'Bank Transfer',
          returnAddress,
          ...(rate && { rate }) // Include rate only if provided
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create PayCrest order');
      }

      const data = await response.json();
      console.log('PayCrest order created:', data);
      
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
  }, [amount, phoneNumber, accountName, currency, returnAddress, rate, onError]);

  // USDC transfer using proper OnchainKit calls format
  const calls = paycrestOrder && paycrestOrder.receiveAddress && paycrestOrder.amount ? (() => {
    const baseAmount = parseFloat(paycrestOrder.amount) || 0;
    const senderFee = parseFloat(paycrestOrder.senderFee) || 0;
    const transactionFee = parseFloat(paycrestOrder.transactionFee) || 0;
    const totalAmount = baseAmount + senderFee + transactionFee;
    
    return [{
      to: USDC_CONTRACT as `0x${string}`,
      value: BigInt(0),
      data: `0xa9059cbb000000000000000000000000${paycrestOrder.receiveAddress.slice(2)}${parseUnits(totalAmount.toString(), 6).toString(16).padStart(64, '0')}` as `0x${string}`
    }];
  })() : [];

  console.log('Transaction call prepared:', {
    receiveAddress: paycrestOrder?.receiveAddress,
    amount: paycrestOrder?.amount,
    senderFee: paycrestOrder?.senderFee,
    transactionFee: paycrestOrder?.transactionFee,
    totalAmount: paycrestOrder && paycrestOrder.amount 
      ? ((parseFloat(paycrestOrder.amount) || 0) + (parseFloat(paycrestOrder.senderFee) || 0) + (parseFloat(paycrestOrder.transactionFee) || 0)).toString()
      : '0'
  });

  // Webhook-only approach: Check status once after transaction, then rely on webhooks
  const checkInitialStatus = useCallback(async (orderId: string) => {
    try {
      console.log('🔍 Checking initial status for order:', orderId);
      const response = await fetch(`/api/paycrest/status/${orderId}`);
      
      if (!response.ok) {
        console.error('Failed to get initial status');
        return;
      }
      
      const result = await response.json();
      const order = result.order;
      
      console.log('Initial order status:', order?.status);

      // PayCrest docs: Handle conclusive responses immediately
      switch (order?.status) {
        case 'validated':
          console.log('✅ Payment already validated');
          setStatusMessage(`✅ Payment sent! ${currency} delivered to ${phoneNumber}`);
          setStatus('success');
          setTimeout(() => onSuccess(), 2000);
          return;
          
        case 'settled':
          console.log('✅ Payment already settled');
          setStatusMessage(`✅ Payment sent! ${currency} delivered to ${phoneNumber}`);
          setStatus('success');
          setTimeout(() => onSuccess(), 2000);
          return;
          
        case 'expired':
          console.log('❌ Payment expired');
          setStatus('error');
          onError('Payment expired');
          return;
          
        case 'refunded':
          console.log('❌ Payment refunded');
          setStatus('error');
          onError('Payment was refunded');
          return;
          
        default:
          // Payment pending - webhooks will update us
          console.log('Payment pending - waiting for webhook updates');
          setStatus('converting');
          setStatusMessage(`Converting USDC to ${currency}...`);
      }
      
    } catch (error) {
      console.error('Initial status check error:', error);
      // Don't fail, just continue with webhook waiting
      setStatus('converting');
      setStatusMessage(`Converting USDC to ${currency}...`);
    }
  }, [onSuccess, onError, phoneNumber, currency]);


  // Check if order is already completed when component loads
  useEffect(() => {
    if (paycrestOrder?.id && status === 'ready-to-pay') {
      checkInitialStatus(paycrestOrder.id);
    }
  }, [paycrestOrder?.id, status, checkInitialStatus]);

  const handleTransactionStatus = useCallback((status: LifecycleStatus) => {
    console.log('Transaction status:', status);
    
    switch (status.statusName) {
      case 'buildingTransaction':
        setStatus('processing');
        setStatusMessage('Preparing transaction...');
        break;
      case 'transactionPending':
        setStatus('processing'); 
        setStatusMessage('Transaction pending...');
        break;
      case 'success':
        setStatus('converting');
        setStatusMessage(`Converting USDC to ${currency}...`);
        setTransactionCompleted(true);
        
        // Start comprehensive monitoring
        if (paycrestOrder?.id) {
          console.log('🚀 Transaction successful, starting comprehensive monitoring');
          
          // Initial status check after transaction
          setTimeout(() => {
            checkInitialStatus(paycrestOrder.id);
          }, 3000);
          
          // The polling and real-time hooks will handle ongoing monitoring
        }
        break;
      case 'error':
        setStatus('error');
        onError('Transaction failed');
        break;
    }
  }, [paycrestOrder?.id, checkInitialStatus, onError, currency]);

  return (
    <div className="space-y-6">
      {/* Create Order Button */}
      {status === 'idle' && (
        <button
          onClick={createPaycrestOrder}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
        >
          Send ${amount} → {phoneNumber}
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
          <div className="text-center">
            <h3 className="text-white font-bold">Ready to Send</h3>
            <p className="text-gray-300 text-sm">
              Send ${amount} to {phoneNumber}
            </p>
          </div>
          
          <Transaction
            chainId={base.id}
            calls={calls}
            onStatus={handleTransactionStatus}
            onSuccess={(response) => {
              console.log('🎯 Transaction successful:', response);
              setStatus('converting');
              setStatusMessage(`Converting USDC to ${currency}...`);
              setTransactionCompleted(true);
              
              // Start comprehensive monitoring
              if (paycrestOrder?.id) {
                console.log('🚀 Starting comprehensive payment monitoring');
                setTimeout(() => {
                  checkInitialStatus(paycrestOrder.id);
                }, 3000);
              }
            }}
            onError={(error) => {
              console.error('Transaction error:', error);
              setStatus('error');
              onError('Transaction failed');
            }}
          >
            <TransactionButton
              text="Send Payment"
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
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-blue-400 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-white font-semibold text-lg">Processing Transaction</h3>
            <p className="text-gray-300">
              {statusMessage || '📱 Check your wallet'}
            </p>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-300 text-xs">
              💡 Your payment will be processed automatically after transaction
            </p>
          </div>
        </div>
      )}

      {/* Converting */}
      {status === 'converting' && (
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-green-400 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-white font-semibold text-lg">Converting Payment</h3>
            <p className="text-gray-300">
              {statusMessage || 'Processing your payment...'}
            </p>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="text-green-300 text-sm">
              Converting USDC to {currency}
            </p>
            <p className="text-gray-400 text-xs">
              Sending to {phoneNumber}
            </p>
            
            {/* Enhanced monitoring status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Polling Status:</span>
                <span className={`${paymentStatus.isPolling ? 'text-green-400' : 'text-gray-500'}`}>
                  {paymentStatus.isPolling ? '🔄 Active' : '⏸️ Standby'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Real-time Updates:</span>
                <span className={`${realtimeStatus.isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
                  {realtimeStatus.isConnected ? '🔔 Connected' : '⚡ Connecting...'}
                </span>
              </div>
              {paymentStatus.currentStatus && (
                <div className="text-xs text-blue-300">
                  Last Status: {paymentStatus.currentStatus.status}
                </div>
              )}
            </div>
            
            <div className="border-t border-green-500/20 pt-2 space-y-1">
              <p className="text-gray-400 text-xs">
                ⏱️ Usually completes in 1-3 minutes
              </p>
              <p className="text-gray-400 text-xs">
                🔔 You&apos;ll get instant notifications when complete
              </p>
              <p className="text-green-300 text-xs">
                💡 Dual monitoring: Polling + Real-time webhooks
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-white font-bold text-xl">Payment Sent!</h3>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400 font-medium">
              ✅ {currency} sent to {phoneNumber}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}