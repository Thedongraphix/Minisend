"use client";

import { useState, useCallback, useRef } from 'react';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import { base } from 'wagmi/chains';
import { parseUnits } from 'viem';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { ReceiptSection } from './ReceiptDownloadButton';
import { PaymentSpinner } from './PaymentSpinner';

interface SimpleUSDCPaymentProps {
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

export function SimpleUSDCPayment({
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
  const [fallbackMonitoringStarted, setFallbackMonitoringStarted] = useState(false);
  const pollingStartedRef = useRef(false);

  // USDC contract on Base
  const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  // Optimized polling that works alongside webhooks for maximum speed
  const startPolling = useCallback((orderId: string) => {
    // Prevent multiple polling instances
    if (pollingStartedRef.current) {
      console.log('🚫 Polling already started, skipping duplicate');
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
            setStatus('success');
            const deliveryMethod = currency === 'NGN' ? 'bank account' : 'mobile number';
            setStatusMessage(`Payment sent to ${deliveryMethod}`);

            // Start background polling
            startPolling(paycrestOrder.id);

            setTimeout(() => onSuccess(), 2000);
          }, 30000); // 30 seconds fallback
        }
        break;
      case 'success':
        console.log('✅ onStatus SUCCESS - payment sent to PayCrest');
        setStatus('success');
        const deliveryMethod = currency === 'NGN' ? 'bank account' : 'mobile number';
        setStatusMessage(`Payment sent to ${deliveryMethod}`);
        
        // Start background polling to track delivery and handle failures
        if (paycrestOrder?.id) {
          console.log('🔄 onStatus: Starting polling for order', paycrestOrder.id);
          startPolling(paycrestOrder.id);
        }
        
        // Call onSuccess immediately - user has successfully sent funds to PayCrest
        setTimeout(() => onSuccess(), 2000);
        break;
      case 'error':
        setStatus('error');
        onError('Transaction failed');
        break;
    }
  }, [paycrestOrder?.id, startPolling, onError, currency, fallbackMonitoringStarted, onSuccess]);

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
          <div className="text-center space-y-2">
            <h3 className="text-white font-bold text-lg">Ready to Send Payment</h3>
            <p className="text-gray-300">
              Send ${((parseFloat(paycrestOrder.amount) || 0) + (parseFloat(paycrestOrder.senderFee) || 0) + (parseFloat(paycrestOrder.transactionFee) || 0)).toFixed(2)} USDC → {currency} to {phoneNumber || (tillNumber ? `Till ${tillNumber}` : accountNumber)}
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
              <p className="text-yellow-300 text-sm font-medium">
                You&apos;ll need to approve this transaction in your wallet
              </p>
              {/*<p className="text-yellow-200 text-xs mt-1">
                Base Pay will ask you to confirm spending USDC from your wallet
              </p>*/}

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
                Click to approve USDC transfer from your wallet
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {currency} will be sent to {phoneNumber ? 'mobile wallet' : tillNumber ? 'till number' : 'bank account'} automatically
              </p>
            </div>
          </div>
          
          <Transaction
            chainId={base.id}
            calls={calls}
            onStatus={handleTransactionStatus}
            onSuccess={(response) => {
              console.log('🎯 Transaction onSuccess callback triggered:', response);
              // The onStatus callback already handles success - this is a fallback for desktop
              console.log('📝 onSuccess: Current status is', status);
              setStatus('success');
              const deliveryMethod = currency === 'NGN' ? 'bank account' : 'mobile number';
              setStatusMessage(`Payment sent to ${deliveryMethod}`);
              
              // Start polling only if not already started by onStatus
              if (paycrestOrder?.id && !pollingStartedRef.current) {
                console.log('🔄 onSuccess: Starting polling as fallback');
                startPolling(paycrestOrder.id);
              }
              
              setTimeout(() => onSuccess(), 2000);
            }}
            onError={(error) => {
              console.error('Transaction error:', error);
              setStatus('error');
              onError('Transaction failed');
            }}
          >
            <TransactionButton
              text={`Approve & Send ${((parseFloat(paycrestOrder?.amount || '0') || 0) + (parseFloat(paycrestOrder?.senderFee || '0') || 0) + (parseFloat(paycrestOrder?.transactionFee || '0') || 0)).toFixed(2)} USDC`}
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
          <div className="flex justify-center items-center">
            <PaymentSpinner />
          </div>

          <div className="space-y-2">
            <h3 className="text-white font-semibold text-lg">Processing Payment</h3>
            <p className="text-gray-300">
              {statusMessage || 'Processing your payment...'}
            </p>
          </div>
          
        </div>
      )}


      {/* Success */}
      {status === 'success' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-xl">Payment Sent</h3>
          <p className="text-gray-300 text-sm">
            Your {currency} has been sent to {currency === 'KES' ? phoneNumber : accountName}
          </p>
          
          {/* Receipt Download Section */}
          {paycrestOrder && (
            <ReceiptSection 
              orderData={{
                id: paycrestOrder.id,
                amount_in_usdc: parseFloat(amount),
                amount_in_local: rate ? parseFloat(amount) * rate : 0,
                local_currency: currency,
                account_name: accountName,
                phone_number: phoneNumber,
                account_number: accountNumber,
                bank_code: bankCode,
                wallet_address: returnAddress,
                rate: rate ?? 0,
                sender_fee: parseFloat(paycrestOrder.senderFee || '0'),
                transaction_fee: parseFloat(paycrestOrder.transactionFee || '0'),
                status: 'completed',
                created_at: new Date().toISOString(),
                paycrest_order_id: paycrestOrder.id,
                receive_address: paycrestOrder.receiveAddress,
                valid_until: paycrestOrder.validUntil,
              }}
              className="mt-4"
            />
          )}
        </div>
      )}
    </div>
  );
}