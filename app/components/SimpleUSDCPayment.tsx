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
  const [status, setStatus] = useState<'idle' | 'creating-order' | 'ready-to-pay' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // USDC contract on Base
  const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  // Simple status checking - poll PayCrest API after transaction
  const checkPaymentStatus = useCallback(async (orderId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/paycrest/status/${orderId}`);
        if (!response.ok) return;
        
        const result = await response.json();
        const order = result.order;
        
        console.log('Payment status:', order?.status);
        
        if (order?.status === 'validated' || order?.status === 'settled') {
          setStatus('success');
          setStatusMessage(`✅ Payment sent! ${currency} delivered to ${phoneNumber}`);
          setTimeout(() => onSuccess(), 2000);
          return;
        }
        
        if (order?.status === 'refunded' || order?.status === 'expired') {
          setStatus('error');
          onError(`Payment ${order.status}`);
          return;
        }
        
        // Continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, 5000);
        } else {
          setStatusMessage('Payment is processing. You will be notified when complete.');
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, 5000);
        }
      }
    };
    
    setTimeout(pollStatus, 3000); // Start after 3 seconds
  }, [currency, phoneNumber, onSuccess, onError]);

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
    console.log('Transaction status:', status);
    
    switch (status.statusName) {
      case 'buildingTransaction':
        setStatus('processing');
        setStatusMessage('Preparing transaction...');
        break;
      case 'transactionPending':
        setStatus('processing'); 
        setStatusMessage('🔐 Waiting for wallet approval... Please confirm in your wallet');
        break;
      case 'success':
        setStatus('processing');
        setStatusMessage(`Payment sent! Converting to ${currency}...`);
        
        // Start simple status checking
        if (paycrestOrder?.id) {
          console.log('🚀 Transaction successful, starting status monitoring');
          checkPaymentStatus(paycrestOrder.id);
        }
        break;
      case 'error':
        setStatus('error');
        onError('Transaction failed');
        break;
    }
  }, [paycrestOrder?.id, checkPaymentStatus, onError, currency]);

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
          <div className="text-center space-y-2">
            <h3 className="text-white font-bold text-lg">Ready to Send Payment</h3>
            <p className="text-gray-300">
              Send ${((parseFloat(paycrestOrder.amount) || 0) + (parseFloat(paycrestOrder.senderFee) || 0) + (parseFloat(paycrestOrder.transactionFee) || 0)).toFixed(2)} USDC → {currency} to {phoneNumber}
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
              <p className="text-yellow-300 text-sm font-medium">
                🔐 You&apos;ll need to approve this transaction in your wallet
              </p>
              <p className="text-yellow-200 text-xs mt-1">
                Base Pay will ask you to confirm spending USDC from your wallet
              </p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="text-xs text-blue-300 space-y-1">
                <div className="flex justify-between">
                  <span>Payment Amount:</span>
                  <span>${paycrestOrder.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee:</span>
                  <span>${paycrestOrder.senderFee}</span>
                </div>
                {parseFloat(paycrestOrder.transactionFee) > 0 && (
                  <div className="flex justify-between">
                    <span>Network Fee:</span>
                    <span>${paycrestOrder.transactionFee}</span>
                  </div>
                )}
                <div className="border-t border-blue-500/20 pt-1 flex justify-between font-semibold">
                  <span>Total to Send:</span>
                  <span>${((parseFloat(paycrestOrder.amount) || 0) + (parseFloat(paycrestOrder.senderFee) || 0) + (parseFloat(paycrestOrder.transactionFee) || 0)).toFixed(2)}</span>
                </div>
              </div>
              <p className="text-blue-300 text-xs mt-2">
                💡 Click to approve USDC transfer from your wallet
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {currency} will be sent to recipient automatically
              </p>
            </div>
          </div>
          
          <Transaction
            chainId={base.id}
            calls={calls}
            onStatus={handleTransactionStatus}
            onSuccess={(response) => {
              console.log('🎯 Transaction successful:', response);
              setStatus('processing');
              setStatusMessage(`Payment sent! Converting to ${currency}...`);
              
              // Start simple status monitoring
              if (paycrestOrder?.id) {
                console.log('🚀 Starting payment status monitoring');
                checkPaymentStatus(paycrestOrder.id);
              }
            }}
            onError={(error) => {
              console.error('Transaction error:', error);
              setStatus('error');
              onError('Transaction failed');
            }}
          >
            <TransactionButton
              text={`🔐 Approve & Send ${((parseFloat(paycrestOrder?.amount || '0') || 0) + (parseFloat(paycrestOrder?.senderFee || '0') || 0) + (parseFloat(paycrestOrder?.transactionFee || '0') || 0)).toFixed(2)} USDC`}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg"
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
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-green-400 mx-auto"></div>
          
          <div className="space-y-2">
            <h3 className="text-white font-semibold text-lg">Processing Payment</h3>
            <p className="text-gray-300">
              {statusMessage || 'Processing your payment...'}
            </p>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-green-300 text-sm">
              ✅ Payment sent → Converting to {currency}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {currency} will be delivered to {phoneNumber}
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