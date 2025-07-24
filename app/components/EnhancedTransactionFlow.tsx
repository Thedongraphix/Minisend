"use client";

import { useState, useCallback, useEffect } from 'react';
import { 
  Transaction, 
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
  TransactionToast,
  TransactionToastIcon,
  TransactionToastLabel,
  TransactionToastAction,
} from '@coinbase/onchainkit/transaction';
import { parseUnits } from 'viem';
import { base } from 'wagmi/chains';
import Image from 'next/image';

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
  const [transactionHash, setTransactionHash] = useState<string>('')
  const [transactionTimeout, setTransactionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (transactionTimeout) {
        clearTimeout(transactionTimeout);
      }
    };
  }, [transactionTimeout]);

  // USDC contract on Base (correct address from Paycrest docs)
  const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Keep this - it's correct

  // Create PayCrest order
  const createOrder = useCallback(async () => {
    setStage('creating-order');
    setProgress(10);

    try {
      console.log('Creating PayCrest order with data:', {
        amount,
        phoneNumber,
        accountName,
        rate,
        currency,
        provider
      });

      const response = await fetch('/api/paycrest/orders-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneNumber,
          accountName,
          rate,
          returnAddress: '0x7D6109a51781FB8dFCae01F5Cd5C70dF412a9CEc',
          currency,
          provider
        }),
      });

      console.log('PayCrest API response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to create order';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('PayCrest API error response:', errorData);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('PayCrest order created successfully:', responseData);

      if (!responseData.success || !responseData.order) {
        throw new Error('Invalid response from PayCrest API');
      }

      const { order } = responseData;
      setOrderId(order.id);
      setOrderData(order);
      setStage('order-ready');
      setProgress(25);
      return order;
    } catch (error) {
      console.error('Order creation error:', error);
      setStage('error');
      const errorMessage = error instanceof Error ? error.message : 'Order creation failed';
      onError(errorMessage);
      throw error;
    }
  }, [amount, phoneNumber, accountName, rate, currency, provider, onError]);

  // Ultra-fast settlement polling with NoBlocks-inspired optimization
  const startSettlementPolling = useCallback(async () => {
    if (!orderId) {
      console.warn('No orderId available for settlement polling');
      return;
    }
    
    console.log('Starting settlement polling for orderId:', orderId);

    setStage('settlement-processing');
    setProgress(75);
    
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 120; // Extended to 60 seconds
    let pollInterval = 250; // Start with 250ms

    const poll = async () => {
      try {
        const response = await fetch(`/api/paycrest/orders-docs?orderId=${orderId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch order status: ${response.status}`);
        }
        
        const { order } = await response.json();
        
        console.log(`Order status polling attempt ${attempts}:`, {
          orderId,
          status: order?.status,
          attempts,
          timestamp: new Date().toISOString()
        });

        // Check for completion statuses
        if (order.status === 'payment_order.validated' || order.status === 'payment_order.settled') {
          const endTime = Date.now();
          setSettlementTime(Math.round((endTime - startTime) / 1000));
          setStage('settlement-complete');
          setProgress(100);
          onComplete(orderId);
          return;
        }

        // Check for failure statuses
        if (order.status === 'payment_order.refunded' || order.status === 'payment_order.expired') {
          throw new Error(`Order ${order.status.replace('payment_order.', '')}`);
        }

        // Fast track polling for confirmed transactions
        if (order.status === 'payment_order.validated' && attempts < 10) {
          pollInterval = 200;
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
    console.log('Transaction success - starting settlement polling for hash:', txHash);
    setTransactionHash(txHash);
    setStage('transaction-confirmed');
    setProgress(70);
    
    // Start settlement polling immediately for faster processing
    setTimeout(() => {
      startSettlementPolling();
    }, 1000); // Give 1 second for transaction to propagate
  }, [startSettlementPolling]);

  // Handle transaction pending
  const handleTransactionPending = useCallback(() => {
    console.log('Transaction pending - user has confirmed payment');
    setStage('transaction-pending');
    setProgress(50);
    
    // Since user confirmed with Base Pay, set a reasonable timeout to proceed
    const fallbackTimeout = setTimeout(() => {
      console.log('Transaction pending fallback - proceeding to settlement');
      setStage('transaction-confirmed');
      setProgress(70);
      // Start settlement polling since PayCrest order exists
      setTimeout(() => {
        startSettlementPolling();
      }, 2000);
    }, 15000); // 15 seconds - reasonable time for transaction to propagate
    
    if (transactionTimeout) clearTimeout(transactionTimeout);
    setTransactionTimeout(fallbackTimeout);
  }, [transactionTimeout, startSettlementPolling]);

  // Handle transaction error
  const handleTransactionError = useCallback((error: { message?: string }) => {
    setStage('error');
    onError(error.message || 'Transaction failed');
  }, [onError]);

  // Prepare transaction calls using proper OnchainKit format
  const calls = orderData && orderData.receiveAddress ? [
    {
      to: USDC_CONTRACT as `0x${string}`,
      data: `0xa9059cbb${orderData.receiveAddress.slice(2).padStart(64, '0')}${parseUnits(
        // Use the exact amount from PayCrest order
        orderData.amount.toString(), 
        6 // USDC has 6 decimals
      ).toString(16).padStart(64, '0')}` as `0x${string}`,
      value: BigInt(0), // Value to send with transaction
    }
  ] : [];

  // Debug log the transaction calls
  console.log('Transaction calls prepared:', {
    orderData,
    calls,
    usdcContract: USDC_CONTRACT,
    amount: orderData?.amount
  });

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

      {/* Enhanced Transaction Flow with OnchainKit */}
      {orderData && stage === 'order-ready' && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-white mb-2">Ready to Send</h3>
            <p className="text-gray-300 text-sm">
              Send ${parseFloat(orderData.amount || '0').toFixed(2)} USDC to PayCrest
            </p>
          </div>
          
          <Transaction
            chainId={base.id}
            calls={calls}
            onSuccess={(response) => {
              console.log('Transaction successful:', response);
              
              // Clear timeout
              if (transactionTimeout) {
                clearTimeout(transactionTimeout);
                setTransactionTimeout(null);
              }
              
              const txHash = response.transactionReceipts[0]?.transactionHash;
              if (txHash) {
                handleTransactionSuccess(txHash);
              }
            }}
            onStatus={(status) => {
              console.log('Transaction status:', status);
              
              // Handle different transaction states with proper progress flow
              switch (status.statusName) {
                case 'init':
                  setProgress(30);
                  break;
                case 'buildingTransaction':
                  setStage('transaction-pending');
                  setProgress(50);
                  
                  // Set timeout to prevent getting stuck
                  const timeout = setTimeout(() => {
                    console.warn('Transaction timeout - checking if we should proceed to settlement');
                    if (orderId) {
                      console.log('Transaction timed out but orderId exists, starting settlement polling');
                      setStage('transaction-confirmed');
                      setProgress(70);
                      startSettlementPolling();
                    }
                  }, 60000); // 60 second timeout
                  
                  setTransactionTimeout(timeout);
                  break;
                case 'transactionPending':
                  handleTransactionPending();
                  
                  // Set a shorter timeout for pending state since transaction is confirmed
                  const pendingTimeout = setTimeout(() => {
                    console.warn('Transaction pending timeout - assuming success and proceeding');
                    setStage('transaction-confirmed');
                    setProgress(70);
                    // Try to start settlement polling even without transaction hash
                    setTimeout(() => {
                      startSettlementPolling();
                    }, 1000);
                  }, 30000); // 30 second timeout for pending state
                  
                  if (transactionTimeout) clearTimeout(transactionTimeout);
                  setTransactionTimeout(pendingTimeout);
                  break;
                case 'transactionLegacyExecuted':
                  setStage('transaction-confirmed');
                  setProgress(70);
                  break;
                case 'success':
                  // handleTransactionSuccess will be called via onSuccess
                  console.log('Transaction success status received');
                  break;
                case 'error':
                  console.error('Transaction error status:', status.statusData);
                  handleTransactionError(status.statusData);
                  break;
                default:
                  console.log('Unknown transaction status:', status.statusName);
              }
            }}
            onError={(error) => {
              console.error('Transaction error:', error);
              
              // Don't fail on Farcaster API errors - they're not critical for transaction
              if (error?.message?.includes('Farcaster API Error')) {
                console.warn('Ignoring Farcaster API error - transaction may still succeed');
                return;
              }
              
              handleTransactionError(error);
            }}
          >
            <TransactionButton
              text="Send USDC via Base Pay"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            />
            
            <TransactionStatus>
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </TransactionStatus>
            
            <TransactionToast>
              <TransactionToastIcon />
              <TransactionToastLabel />
              <TransactionToastAction />
            </TransactionToast>
          </Transaction>
        </div>
      )}

      {/* Transaction Processing States */}
      {(stage === 'transaction-pending' || stage === 'transaction-confirmed') && (
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-white font-medium">
            {stage === 'transaction-pending' ? 'Transaction confirmed! Processing...' : 'Processing settlement...'}
          </p>
          <p className="text-gray-400 text-sm">
            {stage === 'transaction-pending' 
              ? 'Your transaction has been confirmed with Base Pay' 
              : 'Waiting for PayCrest to process your payment'
            }
          </p>
          
          {/* Manual proceed button as fallback */}
          {stage === 'transaction-pending' && (
            <button
              onClick={() => {
                console.log('Manual proceed to settlement clicked');
                setStage('transaction-confirmed');
                setProgress(70);
                setTimeout(() => {
                  startSettlementPolling();
                }, 1000);
              }}
              className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
            >
              Proceed to Settlement
            </button>
          )}
        </div>
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