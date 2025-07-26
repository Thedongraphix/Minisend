"use client";

import { useState, useCallback, useEffect } from 'react';
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
  const [pollingStarted, setPollingStarted] = useState(false);

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

  // Simple PayCrest status polling following official PayCrest guide
  const pollPayCrestOrder = useCallback(async (orderId: string) => {
    // Prevent multiple polling instances
    if (pollingStarted) {
      console.log('⚠️ Polling already started, skipping duplicate');
      return;
    }
    
    console.log('🚀 SIMPLE POLLING STARTED for order:', orderId);
    setPollingStarted(true);
    
    // Start with converting status
    setStatus('converting');
    setStatusMessage('Payment received! Processing conversion...');
    console.log('📱 UI Status set to converting, message updated');

    let attempts = 0;
    const maxAttempts = 40; // 40 attempts over ~10 minutes
    const pollInterval = 15000; // 15 seconds between polls
    
    const checkStatus = async (): Promise<void> => {
      try {
        attempts++;
        console.log(`🔍 Status check attempt ${attempts}/${maxAttempts} for order:`, orderId);
        
        // Simple status check using our status endpoint
        const response = await fetch(`/api/paycrest/status/${orderId}`);
        
        if (!response.ok) {
          throw new Error('Failed to get order status');
        }

        const result = await response.json();
        const order = result.order;
        
        console.log('📊 Order status check:', {
          orderId,
          status: order?.status,
          isSettled: order?.isSettled,
          isFailed: order?.isFailed,
          txHash: order?.txHash,
          amountPaid: order?.amountPaid
        });

        // Following PayCrest official guide: handle different statuses
        switch (order?.status) {
          case 'pending':
            console.log('Order is pending provider assignment');
            // Check if crypto was already deposited (amountPaid > 0 or isSettled)
            if (order.amountPaid || order.isSettled) {
              console.log('🎯 Crypto received, processing fiat transfer...', {
                amountPaid: order.amountPaid,
                isSettled: order.isSettled
              });
              setStatusMessage('✅ Crypto received! Converting to mobile money...');
            } else {
              setStatusMessage('Processing payment through liquidity providers...');
            }
            break;
            
          case 'validated':
            // SUCCESS: Funds have been sent to recipient's bank/mobile network
            console.log('🎉 Funds have been sent to recipient\'s bank/mobile network (value transfer confirmed)');
            console.log('🎯 Payment SUCCESS - validated status:', {
              orderId,
              recipient: phoneNumber,
              currency: currency,
              txHash: order.txHash,
              amountPaid: order.amountPaid
            });
            
            setStatusMessage(`✅ Payment delivered! ${currency} sent to ${phoneNumber}`);
            setStatus('success');
            
            console.log('🚀 Calling onSuccess after 2 second delay...');
            setTimeout(() => {
              console.log('🎊 Payment completion confirmed!');
              onSuccess();
            }, 2000);
            return;
            
          case 'settled':
            // SUCCESS: Order has been settled on blockchain (also successful)
            console.log('🔗 Order has been settled on blockchain');
            console.log('🎯 Payment SUCCESS - settled status:', {
              orderId,
              recipient: phoneNumber,
              currency: currency,
              txHash: order.txHash,
              amountPaid: order.amountPaid
            });
            
            setStatusMessage(`✅ Payment delivered! ${currency} sent to ${phoneNumber}`);
            setStatus('success');
            
            console.log('🚀 Calling onSuccess after 2 second delay...');
            setTimeout(() => {
              console.log('🎊 Payment completion confirmed!');
              onSuccess();
            }, 2000);
            return;
            
          case 'refunded':
            console.log('❌ Order was refunded to the sender');
            throw new Error('Payment was refunded - transaction failed');
            
          case 'expired':
            console.log('⏰ Order expired without completion');
            throw new Error('Payment expired - no payment received in time');
            
          default:
            console.log(`📋 Order status: ${order?.status} - continuing to monitor...`);
            // Show crypto received feedback if we have settlement data
            if (order?.isSettled || order?.amountPaid) {
              setStatusMessage(`✅ Crypto received! Converting to ${currency}...`);
            } else if (order?.status) {
              setStatusMessage(`Converting payment... (${order.status})`);
            }
        }

        // Check if we should continue polling
        if (attempts >= maxAttempts) {
          throw new Error('Payment monitoring timeout - please check status manually');
        }

        // Continue polling after delay
        setTimeout(checkStatus, pollInterval);
        
      } catch (error) {
        console.error('PayCrest status check error:', error);
        setStatus('error');
        onError(error instanceof Error ? error.message : 'Payment processing failed');
      }
    };

    // Start the polling loop
    checkStatus();
  }, [onSuccess, onError, phoneNumber, currency, pollingStarted]);


  // Check if order is already settled when component loads (e.g., page refresh)
  useEffect(() => {
    if (paycrestOrder?.id && status === 'ready-to-pay') {
      const checkInitialStatus = async () => {
        try {
          console.log('🔍 Checking if order is already settled:', paycrestOrder.id);
          const response = await fetch(`/api/paycrest/status/${paycrestOrder.id}`);
          
          if (response.ok) {
            const result = await response.json();
            const order = result.order;
            
            // If already settled, show success immediately
            if (order?.status === 'settled' || order?.status === 'validated') {
              console.log('🎉 Order already settled/validated, showing success:', {
                orderId: paycrestOrder.id,
                status: order.status
              });
              
              setStatusMessage(`✅ Payment delivered! ${currency} sent to ${phoneNumber}`);
              setStatus('success');
              setTimeout(() => onSuccess(), 2000);
              return;
            }
            
            // If failed, show error
            if (['refunded', 'expired', 'failed', 'cancelled'].includes(order?.status)) {
              console.log('❌ Order failed, status:', order.status);
              setStatus('error');
              onError(`Payment ${order.status}`);
              return;
            }
            
            console.log('📋 Order not yet settled, will start polling if transaction occurs');
          }
        } catch (error) {
          console.error('Initial status check failed:', error);
          // Don't fail the component, just log the error
        }
      };
      
      checkInitialStatus();
      
      // Safety mechanism - start polling after 15 seconds if no transaction triggers it
      const timer = setTimeout(() => {
        if (!pollingStarted && paycrestOrder.id) {
          console.log('🔄 SAFETY: Auto-starting polling after 15 seconds for order:', paycrestOrder.id);
          pollPayCrestOrder(paycrestOrder.id);
        }
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [paycrestOrder?.id, status, pollingStarted, pollPayCrestOrder, currency, phoneNumber, onSuccess, onError]);

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
        // RESEARCH-BASED: Start polling immediately when transaction becomes pending
        // This is more reliable than waiting for success callback
        if (paycrestOrder?.id) {
          console.log('🚀 Transaction pending - starting PayCrest polling early for order:', paycrestOrder.id);
          // Give transaction a moment to be detected by PayCrest, then start polling
          setTimeout(() => {
            pollPayCrestOrder(paycrestOrder.id);
          }, 3000);
        }
        break;
      case 'success':
        console.log('✅ Transaction successful, PayCrest should detect it soon');
        // IMMEDIATE FEEDBACK: Let user know their crypto transaction succeeded
        setStatus('converting');
        setStatusMessage('✅ Crypto sent successfully! Processing payment...');
        console.log('🎯 IMMEDIATE FEEDBACK: Crypto transaction completed, starting conversion');
        // Don't start polling here - it's already started in transactionPending
        break;
      case 'error':
        setStatus('error');
        onError('Transaction failed');
        break;
    }
  }, [paycrestOrder?.id, pollPayCrestOrder, onError]);

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
              console.log('🎯 Transaction onSuccess callback triggered:', response);
              
              // IMMEDIATE USER FEEDBACK: Crypto transaction completed successfully
              setStatus('converting');
              setStatusMessage('✅ Crypto sent successfully! Converting to mobile money...');
              console.log('🎊 IMMEDIATE FEEDBACK: Transaction success - user gets confirmation');
              
              // Backup polling start in case status callback didn't work
              if (paycrestOrder?.id) {
                console.log('🔄 Backup: ensuring polling is running for order:', paycrestOrder.id);
                // Small delay to ensure PayCrest detects the transaction
                setTimeout(() => {
                  pollPayCrestOrder(paycrestOrder.id);
                }, 5000);
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