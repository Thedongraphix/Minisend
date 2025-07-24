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
    id: string;
    receiveAddress: string;
    amount: string;
    senderFee: string;
    transactionFee: string;
    validUntil: string;
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
  }, [amount, phoneNumber, accountName, currency, onError]);

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

  // Poll PayCrest order status as per documentation
  const pollOrderStatus = useCallback(async (orderId: string) => {
    const maxAttempts = 60; // 5 minutes with 5s intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/paycrest/orders-docs?orderId=${orderId}`);
        if (!response.ok) throw new Error('Failed to get order status');
        
        const data = await response.json();
        const order = data.order;
        
        console.log(`Order status polling attempt ${attempts}:`, {
          orderId,
          status: order?.status,
          attempts
        });

        // Check for success status as per documentation
        if (order.status === 'payment_order.validated') {
          console.log('Funds have been sent to recipient\'s bank/mobile network (value transfer confirmed)');
          setStatus('success');
          onSuccess();
          return;
        }

        // Check for failure statuses
        if (order.status === 'payment_order.refunded' || order.status === 'payment_order.expired') {
          throw new Error(`Order ${order.status.replace('payment_order.', '')}`);
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          throw new Error('Settlement timeout - order may still complete. Check your dashboard.');
        }
      } catch (error) {
        setStatus('error');
        onError(error instanceof Error ? error.message : 'Settlement failed');
      }
    };

    poll();
  }, [onSuccess, onError]);

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
        console.log('Transaction successful, starting PayCrest order status polling');
        setStatus('processing');
        // Start polling PayCrest for order status as per documentation
        if (paycrestOrder?.id) {
          pollOrderStatus(paycrestOrder.id);
        } else {
          // Fallback if no order ID
          setTimeout(() => {
            setStatus('success');
            onSuccess();
          }, 3000);
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
              setStatus('processing');
              // Start polling PayCrest for order status
              if (paycrestOrder?.id) {
                pollOrderStatus(paycrestOrder.id);
              } else {
                setTimeout(() => {
                  setStatus('success');
                  onSuccess();
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
          <p className="text-white">Processing payment...</p>
          <p className="text-gray-400 text-sm mt-2">
            Waiting for PayCrest to process your payment to mobile money
          </p>
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