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

  // USDC contract on Base
  const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

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
      
      console.log('PayCrest response structure:', JSON.stringify(data, null, 2));
      
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

        console.log('Extracted order data:', orderData);
        
        setPaycrestOrder({
          id: orderData.id,
          receiveAddress: orderData.receiveAddress,
          amount: orderData.amount,
          senderFee: orderData.senderFee || '0',
          transactionFee: orderData.transactionFee || '0',
          validUntil: orderData.validUntil
        });
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

  // Poll PayCrest order status after successful transaction
  const pollOrderStatus = useCallback(async (orderId: string) => {
    const maxAttempts = 60; // 3 minutes max (should complete in 1-2 minutes per docs)
    let attempts = 0;

    // Start with converting status
    setStatus('converting');
    setStatusMessage('Payment received! Processing conversion...');

    const poll = async () => {
      try {
        // Use the new status endpoint for better real-time updates
        const response = await fetch(`/api/paycrest/status/${orderId}`);
        if (!response.ok) throw new Error('Failed to get order status');
        
        const data = await response.json();
        const order = data.order;
        
        console.log(`Order status polling attempt ${attempts + 1}/${maxAttempts}:`, {
          orderId,
          status: order?.status,
          attempts: attempts + 1,
          timeElapsed: `${Math.round((attempts * 3) / 60 * 10) / 10} minutes`
        });

        // Update status message based on progress and status  
        const timeElapsed = Math.round((attempts * 3) / 60 * 10) / 10;
        
        if (order.status === 'initiated') {
          setStatusMessage('Payment initiated...');
        } else if (order.status === 'pending') {
          if (attempts < 6) {
            setStatusMessage('Processing payment...');
          } else if (attempts < 12) {
            setStatusMessage(`Finding best exchange rate... ${timeElapsed}m`);
          } else {
            setStatusMessage(`Processing with provider... ${timeElapsed}m`);
          }
        } else if (order.status === 'settled') {
          // SUCCESS! Payment has been completed and settled
          console.log('🎉 SUCCESS: Payment completed and settled!');
          console.log('Payment completion details:', {
            orderId,
            finalStatus: order.status,
            totalTime: `${timeElapsed} minutes`,
            recipient: phoneNumber,
            currency: currency
          });
          
          setStatusMessage(`✅ Payment successful! ${currency} sent to ${phoneNumber}`);
          setStatus('success');
          
          // Show success message for a moment before calling onSuccess
          setTimeout(() => {
            onSuccess();
          }, 2000);
          return;
        }

        // Check for failure statuses
        if (order.status === 'refunded') {
          console.error(`❌ Order refunded: ${order.status}`);
          throw new Error(`Payment was refunded. Your USDC will be returned to your wallet. Contact support if you need assistance.`);
        }
        
        if (order.status === 'expired') {
          console.error(`❌ Order expired: ${order.status}`);
          throw new Error(`Payment expired. This shouldn't happen after sending funds. Contact support immediately.`);
        }

        attempts++;
        if (attempts < maxAttempts) {
          // Faster intervals for new PayCrest processing times: 2s for first 30s, then 3s
          let interval = 2000;
          if (attempts > 15) interval = 3000; // After 30 seconds, poll every 3s
          
          setTimeout(poll, interval);
        } else {
          console.warn('⚠️ Polling timeout reached after 3 minutes - payment may have issues');
          setStatusMessage('Payment processing delayed - checking status...');
          
          // Don't assume success after 3 minutes - something might be wrong
          // Try one final status check
          setTimeout(async () => {
            try {
              const finalResponse = await fetch(`/api/paycrest/status/${orderId}`);
              const finalData = await finalResponse.json();
              const finalOrder = finalData.order;
              
              if (finalOrder.status === 'settled') {
                setStatus('success');
                onSuccess();
              } else {
                setStatus('error');
                onError('Payment processing timed out. Please check your transaction status or contact support.');
              }
            } catch {
              setStatus('error'); 
              onError('Unable to verify payment status. Please check your transaction or contact support.');
            }
          }, 5000);
        }
      } catch (error) {
        console.error('Polling error:', error);
        setStatus('error');
        onError(error instanceof Error ? error.message : 'Payment processing failed');
      }
    };

    poll();
  }, [onSuccess, onError, phoneNumber, currency]);

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
        console.log('✅ Transaction successful, starting PayCrest order status polling');
        setStatusMessage('Transaction confirmed! Processing payment...');
        // Start polling PayCrest for order status as per documentation
        if (paycrestOrder?.id) {
          pollOrderStatus(paycrestOrder.id);
        } else {
          // Fallback if no order ID
          setStatusMessage('✅ Payment completed successfully!');
          setTimeout(() => {
            setStatus('success');
            onSuccess();
          }, 2000);
        }
        break;
      case 'error':
        setStatus('error');
        onError('Transaction failed');
        break;
    }
  }, [onSuccess, onError, paycrestOrder?.id, pollOrderStatus]);

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
              console.log('Transaction successful:', response);
              setStatus('processing');
              // Start polling PayCrest for order status
              if (paycrestOrder?.id) {
                pollOrderStatus(paycrestOrder.id);
              } else {
                setTimeout(() => {
                  setStatus('success');
                  onSuccess();
                }, 2000);
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
            <h3 className="text-white font-semibold text-lg">Signing Transaction</h3>
            <p className="text-gray-300">
              📱 Check your wallet
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
            <h3 className="text-white font-semibold text-lg">Processing Payment</h3>
            <p className="text-gray-300">
              {statusMessage || `Processing your payment...`}
            </p>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-300 text-sm">
              ⏱️ Usually takes 1-3 minutes
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Sending to {phoneNumber}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              💡 Your payment is being processed securely
            </p>
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