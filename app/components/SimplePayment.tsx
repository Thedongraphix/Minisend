"use client";

import { useState, useCallback } from 'react';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel } from '@coinbase/onchainkit/transaction';
import { base } from 'wagmi/chains';
import { parseUnits } from 'viem';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

interface SimplePaymentProps {
  amount: string;
  phoneNumber: string;
  accountName: string;
  currency: 'KES' | 'NGN';
  returnAddress: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function SimplePayment({
  amount,
  phoneNumber,
  accountName,
  currency,
  returnAddress,
  onSuccess,
  onError
}: SimplePaymentProps) {
  const [currentStep, setCurrentStep] = useState<'quote' | 'send' | 'processing' | 'success' | 'error'>('quote');
  const [orderData, setOrderData] = useState<{
    id: string;
    receiveAddress: string;
    amount: string;
    senderFee: string;
    transactionFee: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // USDC contract on Base
  const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  // Step 1: Get live rate and create order
  const createOrder = useCallback(async () => {
    setCurrentStep('quote');
    
    try {
      // First, get live rate from PayCrest
      setStatusMessage('Getting live exchange rate...');
      
      const rateResponse = await fetch(`/api/paycrest/rates/USDC/${amount}/${currency}`);
      
      if (!rateResponse.ok) {
        throw new Error('Failed to fetch live exchange rate');
      }
      
      const rateData = await rateResponse.json();
      
      if (!rateData.success || !rateData.rate) {
        throw new Error('Invalid rate response');
      }
      
      console.log('Live rate fetched:', rateData);
      setStatusMessage(`Rate: 1 USDC = ${rateData.rate} ${currency}. Creating order...`);
      
      // Create order with live rate
      const orderResponse = await fetch('/api/paycrest/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneNumber,
          accountName,
          currency,
          returnAddress,
          rate: rateData.rate, // Use live rate
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const orderData = await orderResponse.json();
      
      if (orderData.success && orderData.order) {
        setOrderData(orderData.order);
        setCurrentStep('send');
      } else {
        throw new Error('Invalid order response');
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      setCurrentStep('error');
      onError(error instanceof Error ? error.message : 'Failed to create order');
    }
  }, [amount, phoneNumber, accountName, currency, returnAddress, onError]);

  // Step 2: Create transaction calls for Base Pay
  const calls = orderData ? (() => {
    const totalAmount = parseFloat(orderData.amount) + 
                       parseFloat(orderData.senderFee || '0') + 
                       parseFloat(orderData.transactionFee || '0');
    
    console.log('💰 Creating USDC transfer:', {
      to: orderData.receiveAddress,
      amount: totalAmount,
      amountWei: parseUnits(totalAmount.toString(), 6).toString()
    });
    
    return [{
      to: USDC_CONTRACT as `0x${string}`,
      value: BigInt(0),
      data: `0xa9059cbb000000000000000000000000${orderData.receiveAddress.slice(2).padStart(64, '0')}${parseUnits(totalAmount.toString(), 6).toString(16).padStart(64, '0')}` as `0x${string}`
    }];
  })() : [];

  // Step 3: Handle transaction status
  const handleTransactionStatus = useCallback((status: LifecycleStatus) => {
    console.log('Transaction status:', status);
    
    switch (status.statusName) {
      case 'buildingTransaction':
        setStatusMessage('Preparing transaction...');
        break;
      case 'transactionPending':
        setCurrentStep('processing');
        setStatusMessage('Transaction pending...');
        break;
      case 'success':
        setCurrentStep('success');
        const deliveryMethod = currency === 'NGN' ? 'bank account' : 'mobile number';
        setStatusMessage(`✅ Payment sent successfully! ${currency} will be sent to your ${deliveryMethod} shortly.`);
        
        // Call onSuccess immediately - user has successfully sent funds to PayCrest
        setTimeout(() => onSuccess(), 2000);
        break;
      case 'error':
        setCurrentStep('error');
        onError('Transaction failed');
        break;
    }
  }, [orderData?.id, onError]);

  // Step 4: Check payment status via webhook
  const checkPaymentStatus = useCallback(async (orderId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Check for 5 minutes
    
    const checkStatus = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/paycrest/status/${orderId}`);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.order) {
            const order = result.order;
            
            if (order.isSettled || order.status === 'fulfilled' || order.status === 'validated' || order.status === 'settled') {
              setCurrentStep('success');
              setStatusMessage(`Payment completed! ${currency} sent to ${phoneNumber}`);
              setTimeout(() => onSuccess(), 2000);
              return;
            } else if (order.isFailed || order.status === 'refunded' || order.status === 'expired') {
              setCurrentStep('error');
              onError(`Payment ${order.status}`);
              return;
            }
          }
        }
        
        // Continue checking if not terminal status
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          setStatusMessage('Payment is still processing. You will be notified when complete.');
        }
      } catch (error) {
        console.error('Status check error:', error);
        // Continue checking on errors
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        }
      }
    };
    
    // Start checking after a delay
    setTimeout(checkStatus, 3000);
  }, [currency, phoneNumber, onSuccess, onError]);

  return (
    <div className="space-y-6">
      {/* Step 1: Quote */}
      {currentStep === 'quote' && (
        <div className="space-y-4">
          <button
            onClick={createOrder}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            Get Live Rate & Create Order
          </button>
          {statusMessage && (
            <div className="text-center">
              <p className="text-blue-300 text-sm">{statusMessage}</p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Send Payment */}
      {currentStep === 'send' && orderData && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-white font-bold text-lg">Ready to Send Payment</h3>
            <p className="text-gray-300">
              Send ${((parseFloat(orderData.amount) || 0) + (parseFloat(orderData.senderFee) || 0) + (parseFloat(orderData.transactionFee) || 0)).toFixed(2)} → {currency} to {phoneNumber}
            </p>
          </div>
          
          <Transaction
            chainId={base.id}
            calls={calls}
            onStatus={handleTransactionStatus}
          >
            <TransactionButton
              text={`Send Payment $${((parseFloat(orderData.amount) || 0) + (parseFloat(orderData.senderFee) || 0) + (parseFloat(orderData.transactionFee) || 0)).toFixed(2)}`}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300"
            />
            
            <TransactionStatus>
              <TransactionStatusLabel />
            </TransactionStatus>
          </Transaction>
        </div>
      )}

      {/* Step 3: Processing */}
      {currentStep === 'processing' && (
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-green-400 mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-white font-semibold text-lg">Processing Payment</h3>
            <p className="text-gray-300">
              {statusMessage || 'Processing your payment...'}
            </p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-green-300 text-sm">
              ✅ Payment sent to PayCrest. Funds will be delivered to {phoneNumber} shortly.
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {currentStep === 'success' && (
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-white font-bold text-xl">Payment Sent!</h3>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400 font-medium">
              {statusMessage}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {currentStep === 'error' && (
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-white font-bold text-xl">Payment Failed</h3>
          <button
            onClick={() => setCurrentStep('quote')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}