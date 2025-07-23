"use client";

import { useState, useCallback } from 'react';
import { 
  Transaction, 
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from '@coinbase/onchainkit/transaction';
import { parseUnits } from 'viem';
import { base } from 'wagmi/chains';
import Image from 'next/image';
import { SmartWalletConnection } from './SmartWalletConnection';

interface EnhancedTransactionFlowProps {
  amount: string;
  phoneNumber: string;
  accountName: string;
  currency: 'KES' | 'NGN';
  provider: string;
  rate: number;
  onComplete: (orderId: string) => void;
  onError: (error: string) => void;
}

type TransactionStage = 
  | 'idle' 
  | 'creating-order' 
  | 'order-ready'
  | 'transaction-pending' 
  | 'transaction-confirmed'
  | 'settlement-processing'
  | 'settlement-complete'
  | 'error';

export function EnhancedTransactionFlow({
  amount,
  phoneNumber,
  accountName,
  currency,
  provider,
  rate,
  onComplete,
  onError
}: EnhancedTransactionFlowProps) {
  const [stage, setStage] = useState<TransactionStage>('idle');
  const [orderId, setOrderId] = useState<string>('');
  const [orderData, setOrderData] = useState<{
    id: string;
    receiveAddress: string;
    amount: string;
    senderFee: string;
    transactionFee: string;
    validUntil: string;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [settlementTime, setSettlementTime] = useState<number>(0);
  const [transactionHash, setTransactionHash] = useState<string>('');

  // USDC contract on Base (correct address from Paycrest docs)
  const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Keep this - it's correct

  // Create PayCrest order
  const createOrder = useCallback(async () => {
    setStage('creating-order');
    setProgress(10);

    try {
      const response = await fetch('/api/paycrest/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneNumber,
          accountName,
          rate,
          returnAddress: '0x0000000000000000000000000000000000000000',
          currency,
          provider
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const { order } = await response.json();
      setOrderId(order.id);
      setOrderData(order);
      setStage('order-ready');
      setProgress(25);
      return order;
    } catch (error) {
      setStage('error');
      onError(error instanceof Error ? error.message : 'Order creation failed');
      throw error;
    }
  }, [amount, phoneNumber, accountName, rate, currency, provider, onError]);

  // Ultra-fast settlement polling with NoBlocks-inspired optimization
  const startSettlementPolling = useCallback(async () => {
    if (!orderId) return;

    setStage('settlement-processing');
    setProgress(75);
    
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 120; // Extended to 60 seconds
    let pollInterval = 250; // Start with 250ms

    const poll = async () => {
      try {
        // Pre-settlement check - look for transaction confirmation
        const txResponse = await fetch(`/api/paycrest/transaction-status?orderId=${orderId}`);
        if (txResponse.ok) {
          const { confirmed, order: txOrder, statusFlags } = await txResponse.json();
          console.log(`Polling attempt ${attempts}: Status = ${txOrder?.status}, Confirmed = ${confirmed}`);
          
          if (confirmed && attempts < 10) {
            // Fast track to settlement check if tx confirmed early
            pollInterval = 200;
          }
          
          // Check if transaction is already complete
          if (statusFlags?.isComplete) {
            const endTime = Date.now();
            setSettlementTime(Math.round((endTime - startTime) / 1000));
            setStage('settlement-complete');
            setProgress(100);
            onComplete(orderId);
            return;
          }
          
          // Check if transaction failed
          if (statusFlags?.isFailed) {
            throw new Error(`Transaction ${txOrder?.status?.replace('payment_order.', '') || 'failed'}`);
          }
        }

        const response = await fetch(`/api/paycrest/orders?orderId=${orderId}`);
        const { order } = await response.json();
        
        console.log(`Order status polling attempt ${attempts}:`, {
          orderId,
          status: order?.status,
          attempts,
          timestamp: new Date().toISOString()
        });

        // Check for 'validated' status - funds sent to recipient (per Paycrest docs)
        if (order.status === 'payment_order.validated' || order.status === 'payment_order.settled') {
          const endTime = Date.now();
          setSettlementTime(Math.round((endTime - startTime) / 1000));
          setStage('settlement-complete');
          setProgress(100);
          onComplete(orderId);
          return;
        }

        if (order.status === 'payment_order.refunded' || order.status === 'payment_order.expired') {
          throw new Error(`Order ${order.status.replace('payment_order.', '')}`);
        }

        attempts++;
        if (attempts < maxAttempts) {
          // Dynamic progress with acceleration
          const baseProgress = 75;
          const progressIncrement = (attempts / maxAttempts) * 23;
          setProgress(Math.min(98, baseProgress + progressIncrement));
          
          // Adaptive polling: slow down after initial burst
          if (attempts > 20) {
            pollInterval = 500; // Slow down to 500ms after 5 seconds
          } else if (attempts > 40) {
            pollInterval = 1000; // Further slow down after 20 seconds
          }
          
          setTimeout(poll, pollInterval);
        } else {
          // Log final status for debugging
          console.log(`Final polling status: ${order?.status || 'unknown'}`);
          throw new Error('Settlement timeout - order may still complete. Check your dashboard.');
        }
      } catch (error) {
        setStage('error');
        onError(error instanceof Error ? error.message : 'Settlement failed');
      }
    };

    poll();
  }, [orderId, onComplete, onError]);

  // Handle transaction success with immediate settlement start
  const handleTransactionSuccess = useCallback((txHash: string) => {
    setTransactionHash(txHash);
    setStage('transaction-confirmed');
    setProgress(70);
    
    // Start settlement polling immediately for faster processing
    setTimeout(() => {
      startSettlementPolling();
    }, 500); // Reduced from 2000ms to 500ms
  }, [startSettlementPolling]);

  // Handle transaction pending
  const handleTransactionPending = useCallback(() => {
    setStage('transaction-pending');
    setProgress(50);
  }, []);

  // Handle transaction error
  const handleTransactionError = useCallback((error: { message?: string }) => {
    setStage('error');
    onError(error.message || 'Transaction failed');
  }, [onError]);

  // Prepare transaction calls with proper amount calculation
  const calls = orderData ? [
    {
      to: USDC_CONTRACT as `0x${string}`,
      data: `0xa9059cbb${orderData.receiveAddress.slice(2).padStart(64, '0')}${parseUnits(
        // Send total amount including all fees as per Paycrest docs
        (parseFloat(orderData.amount || '0') + 
         parseFloat(orderData.senderFee || '0') + 
         parseFloat(orderData.transactionFee || '0')).toString(), 
        6
      ).toString(16).padStart(64, '0')}` as `0x${string}`,
      value: BigInt(0),
    }
  ] : [];

  // Stage configurations
  const stageConfig = {
    idle: { title: 'Ready to Send', icon: '💰', color: 'blue' },
    'creating-order': { title: 'Creating Order...', icon: '⚙️', color: 'blue' },
    'order-ready': { title: 'Order Ready', icon: '✅', color: 'green' },
    'transaction-pending': { title: 'Transaction Pending...', icon: '⏳', color: 'yellow' },
    'transaction-confirmed': { title: 'Transaction Confirmed', icon: '✅', color: 'green' },
    'settlement-processing': { title: 'Processing Settlement...', icon: '🚀', color: 'purple' },
    'settlement-complete': { title: 'Settlement Complete!', icon: '🎉', color: 'green' },
    error: { title: 'Transaction Failed', icon: '❌', color: 'red' }
  };

  const currentConfig = stageConfig[stage];

  return (
    <div className="space-y-6">
      {/* Enhanced Progress Display */}
      {stage !== 'idle' && (
        <div className="relative w-full max-w-md mx-auto">
          <div className="relative rounded-3xl card-shadow-lg overflow-hidden">
            {/* Dynamic background based on stage */}
            <div className={`absolute inset-0 bg-gradient-to-br ${
              currentConfig.color === 'green' ? 'from-green-900 via-black to-green-800' :
              currentConfig.color === 'blue' ? 'from-blue-900 via-black to-blue-800' :
              currentConfig.color === 'purple' ? 'from-purple-900 via-black to-purple-800' :
              currentConfig.color === 'yellow' ? 'from-yellow-900 via-black to-yellow-800' :
              'from-red-900 via-black to-red-800'
            }`}>
              <div className="absolute inset-0 gradient-mesh opacity-40"></div>
              
              {/* Animated floating elements */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-6 right-6 w-12 h-12 border border-white rounded-full animate-pulse"></div>
                <div className="absolute bottom-8 left-8 w-8 h-8 border border-white rounded-full animate-bounce"></div>
                <div className="absolute top-1/2 left-6 w-10 h-10 border border-white rounded-full animate-ping"></div>
              </div>
            </div>
            
            {/* Progress content */}
            <div className="relative z-10 p-6 text-center">
              {/* Stage Icon */}
              <div className="w-16 h-16 mx-auto mb-4 relative">
                {stage === 'settlement-processing' || stage === 'transaction-pending' ? (
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white shadow-lg">
                    <div className="absolute inset-2 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-2xl">{currentConfig.icon}</span>
                    </div>
                  </div>
                ) : (
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br ${
                    currentConfig.color === 'green' ? 'from-green-500 to-green-600' :
                    currentConfig.color === 'blue' ? 'from-blue-500 to-blue-600' :
                    currentConfig.color === 'purple' ? 'from-purple-500 to-purple-600' :
                    currentConfig.color === 'yellow' ? 'from-yellow-500 to-yellow-600' :
                    'from-red-500 to-red-600'
                  }`}>
                    <span className="text-2xl">{currentConfig.icon}</span>
                  </div>
                )}
              </div>
              
              {/* Stage Title */}
              <h3 className="text-xl font-bold text-white mb-2">{currentConfig.title}</h3>
              
              {/* Progress Bar */}
              <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    currentConfig.color === 'green' ? 'bg-green-400' :
                    currentConfig.color === 'blue' ? 'bg-blue-400' :
                    currentConfig.color === 'purple' ? 'bg-purple-400' :
                    currentConfig.color === 'yellow' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              {/* Progress Percentage */}
              <div className="text-white/80 text-sm mb-4">{progress}% Complete</div>
              
              {/* Settlement Time Display */}
              {settlementTime > 0 && (
                <div className="bg-green-500/20 p-3 rounded-xl border border-green-400/30">
                  <div className="text-green-300 text-sm font-medium">
                    ⚡ Settled in {settlementTime} seconds!
                  </div>
                </div>
              )}
              
              {/* Transaction Hash Link */}
              {transactionHash && (
                <div className="mt-4">
                  <a 
                    href={`https://basescan.org/tx/${transactionHash}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm underline"
                  >
                    View on BaseScan ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Interface */}
      {!orderData && stage === 'idle' && (
        <button
          onClick={createOrder}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        >
          <div className="flex items-center justify-center space-x-2">
            <span>Create Order & Send USDC</span>
            <span>💰</span>
          </div>
        </button>
      )}

      {/* Smart Wallet Connection for Transaction */}
      {orderData && stage === 'order-ready' && (
        <div className="space-y-4">
          <SmartWalletConnection 
            showForTransaction={true}
            onWalletReady={(address) => {
              console.log('Wallet ready for transaction:', address);
            }}
            onProceedToTransaction={() => {
              console.log('Proceeding to transaction...');
              setStage('transaction-pending');
            }}
          />
        </div>
      )}

      {orderData && (stage === 'transaction-pending' || stage === 'transaction-confirmed' || stage === 'settlement-processing') && (
        <Transaction
          chainId={base.id}
          calls={calls}
          onSuccess={(response) => handleTransactionSuccess(response.transactionReceipts[0].transactionHash)}
          onStatus={(status) => {
            if (status.statusName === 'transactionPending') {
              handleTransactionPending();
            }
          }}
          onError={handleTransactionError}
        >
          <TransactionButton
            text={
              stage === 'transaction-pending' ? 'Transaction Pending...' :
              stage === 'transaction-confirmed' ? 'Processing Settlement...' :
              'Send USDC via Base Pay'
            }
            disabled={stage === 'transaction-pending' || stage === 'settlement-processing'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300"
          />
          
          <TransactionStatus>
            <TransactionStatusLabel />
            <TransactionStatusAction />
          </TransactionStatus>
        </Transaction>
      )}

      {/* Success Celebration */}
      {stage === 'settlement-complete' && (
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce">🎉</div>
          <div className="text-2xl font-bold text-green-400">
            Payment Sent Successfully!
          </div>
          <div className="text-gray-300">
            {currency} will arrive in {accountName}&apos;s account shortly
          </div>
          
          {/* Network Badge */}
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 px-4 py-2 rounded-xl border border-blue-400/30">
            <Image 
              src="/Base_Network_Logo.svg" 
              alt="Base Network" 
              width={16}
              height={16}
            />
            <span className="text-blue-300 text-sm font-medium">Powered by Base</span>
          </div>
        </div>
      )}

      {/* Speed Optimization Info */}
      <div className="text-xs text-gray-400 space-y-1 text-center">
        <div>• OnchainKit integration for secure wallet experience</div>
        <div>• Adaptive polling (250ms → 1s) for optimal speed</div>
        <div>• NoBlocks-inspired settlement patterns</div>
        <div>• Target settlement: &lt;20 seconds</div>
      </div>
    </div>
  );
}