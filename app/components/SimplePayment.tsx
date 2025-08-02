"use client";

import { useState, useCallback, useMemo } from 'react';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel } from '@coinbase/onchainkit/transaction';
import { base } from 'wagmi/chains';
import { parseUnits } from 'viem';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import type { ContractFunctionParameters } from 'viem';

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

  // Polling function for payment status
  const startPolling = useCallback((orderId: string) => {
    let attempts = 0;
    const maxAttempts = 180;
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/paycrest/status/${orderId}`);
        if (response.ok) {
          const result = await response.json();
          const order = result.order;
          
          if (order?.status === 'settled') {
            const method = currency === 'KES' ? 'M-Pesa' : 'bank account';
            setStatusMessage(`🎉 ${currency} delivered to your ${method}!`);
            return;
          }
          
          if (['refunded', 'expired', 'cancelled'].includes(order?.status)) {
            setCurrentStep('error');
            onError(`Payment ${order.status}. Please try again.`);
            return;
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };
    
    setTimeout(poll, 10000);
  }, [currency, onError]);

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
      const orderResponse = await fetch('/api/paycrest/orders/simple', {
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

  // USDC ERC20 ABI for transfer function
  const USDC_ABI = [
    {
      name: 'transfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: 'success', type: 'bool' }]
    }
  ] as const;

  // Step 2: Create transaction calls for Base Pay using proper ContractFunctionParameters
  const calls: ContractFunctionParameters[] = useMemo(() => orderData ? (() => {
    console.log('🗒️ Order data received:', orderData);
    
    // Validate order data
    if (!orderData.receiveAddress || !orderData.amount) {
      console.error('❌ Invalid order data - missing receiveAddress or amount');
      return [];
    }
    
    const totalAmount = parseFloat(orderData.amount) + 
                       parseFloat(orderData.senderFee || '0') + 
                       parseFloat(orderData.transactionFee || '0');
    
    if (totalAmount <= 0) {
      console.error('❌ Invalid total amount:', totalAmount);
      return [];
    }
    
    const amountWei = parseUnits(totalAmount.toString(), 6);
    
    console.log('💰 Creating USDC transfer with ContractFunctionParameters:', {
      contract: USDC_CONTRACT,
      to: orderData.receiveAddress,
      amount: totalAmount,
      amountWei: amountWei.toString(),
      isValidAddress: /^0x[a-fA-F0-9]{40}$/.test(orderData.receiveAddress)
    });
    
    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(orderData.receiveAddress)) {
      console.error('❌ Invalid Ethereum address format:', orderData.receiveAddress);
      return [];
    }
    
    const callData = {
      address: USDC_CONTRACT as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'transfer' as const,
      args: [orderData.receiveAddress as `0x${string}`, amountWei]
    };
    
    console.log('✅ Transaction call data created:', callData);
    return [callData];
  })() : [], [orderData, USDC_ABI]);
  
  console.log('📊 Final calls array:', calls);

  // Step 3: Handle transaction status
  const handleTransactionStatus = useCallback((status: LifecycleStatus) => {
    console.log('Transaction status:', status);
    
    switch (status.statusName) {
      case 'init':
        console.log('Transaction initialized');
        break;
      case 'transactionIdle':
        console.log('Transaction idle, ready to build');
        break;
      case 'buildingTransaction':
        setStatusMessage('Preparing transaction...');
        console.log('Building transaction with calls:', calls);
        break;
      case 'transactionPending':
        setCurrentStep('processing');
        setStatusMessage('Transaction pending on Base network...');
        console.log('Transaction submitted to Base network');
        break;
      case 'transactionLegacyExecuted':
        console.log('Legacy transaction executed:', status.statusData);
        break;
      case 'success':
        setCurrentStep('success');
        const deliveryMethod = currency === 'NGN' ? 'bank account' : 'mobile number';
        setStatusMessage(`✅ Payment sent successfully! ${currency} will be sent to your ${deliveryMethod} shortly.`);
        console.log('Transaction successful:', status.statusData);
        
        // Start background polling for provider failures
        if (orderData?.id) {
          const orderId = orderData.id;
          setTimeout(() => startPolling(orderId), 0);
        }
        
        // Call onSuccess immediately - user has successfully sent funds to PayCrest
        setTimeout(() => onSuccess(), 2000);
        break;
      case 'error':
        setCurrentStep('error');
        console.error('Transaction error:', status.statusData);
        const errorMessage = status.statusData?.message || 'Transaction failed';
        onError(errorMessage);
        break;
    }
  }, [orderData?.id, onError, currency, onSuccess, calls, startPolling]);



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
            {/* Debug info */}
            <div className="text-xs text-gray-500 mt-2">
              <p>Order ID: {orderData.id}</p>
              <p>Receive Address: {orderData.receiveAddress}</p>
              <p>Calls Length: {calls.length}</p>
            </div>
          </div>
          
          {calls.length > 0 ? (
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
          ) : (
            <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-300">❌ No transaction calls generated</p>
              <p className="text-red-400 text-sm mt-2">Order data: {JSON.stringify(orderData)}</p>
            </div>
          )}
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
              ✅ Payment initiated. Funds will be delivered to {phoneNumber} shortly.
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {currentStep === 'success' && (
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                <svg 
                  className="w-8 h-8 text-white animate-bounce" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="absolute inset-0 w-16 h-16 bg-blue-400/30 rounded-full animate-ping"></div>
            </div>
          </div>
          <h3 className="text-white font-bold text-xl">Payment Successful</h3>
          <div className="space-y-3">
            <p className="text-gray-300 text-base font-medium">
              Your KES has been sent to {phoneNumber}
            </p>
            <p className="text-gray-400 text-sm">
              It will take approximately 1-2 minutes to receive the fiat
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