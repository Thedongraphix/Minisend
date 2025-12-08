"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { base } from 'wagmi/chains';
import { parseUnits } from 'viem';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { TransactionHandler } from './TransactionHandler';
import { USDC_CONTRACTS } from '@/lib/paymaster-config';
import { PRETIUM_CONFIG } from '@/lib/pretium/config';

interface PretiumPaymentProcessorProps {
  amount: string;
  phoneNumber?: string;
  tillNumber?: string;
  paybillNumber?: string;
  paybillAccount?: string;
  accountName: string;
  returnAddress: string;
  rate: number;
  onSuccess: (transactionCode?: string, txHash?: string) => void;
  onError: (error: string) => void;
}

export function PretiumPaymentProcessor({
  amount,
  phoneNumber,
  tillNumber,
  paybillNumber,
  paybillAccount,
  accountName,
  returnAddress,
  onSuccess,
  onError
}: PretiumPaymentProcessorProps) {
  const { context } = useMiniKit();
  const [status, setStatus] = useState<'idle' | 'ready-to-pay' | 'processing' | 'success' | 'error'>('idle');
  const pollingStartedRef = useRef(false);
  const successTriggeredRef = useRef(false);
  const transactionDataRef = useRef<{ transactionCode?: string; txHash?: string }>({});

  // Swipe slider states
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const USDC_CONTRACT = USDC_CONTRACTS.mainnet;

  // Start polling for Pretium transaction status
  const startPolling = useCallback((transactionCode: string) => {
    if (pollingStartedRef.current) return;
    pollingStartedRef.current = true;

    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      try {
        const response = await fetch(`/api/pretium/status/${transactionCode}`);

        if (!response.ok) {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000);
          }
          return;
        }

        const result = await response.json();
        const transaction = result.transaction;

        if (transaction?.status === 'COMPLETE' || transaction?.status === 'FAILED') {
          return; // Stop polling
        }

        attempts++;
        if (attempts < maxAttempts) {
          const pollInterval = attempts < 20 ? 3000 : 10000;
          setTimeout(poll, pollInterval);
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    setTimeout(poll, 3000);
  }, []);

  // Create Pretium order (called after blockchain transaction succeeds)
  const createPretiumOrder = useCallback(async (txHash: string) => {
    // Normalize amount to 2 decimal places to match blockchain transaction
    const normalizedAmount = (Math.round(parseFloat(amount) * 100) / 100).toFixed(2);

    try {
      const response = await fetch('/api/pretium/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: normalizedAmount,
          phoneNumber,
          tillNumber,
          paybillNumber,
          paybillAccount,
          accountName,
          transactionHash: txHash,
          returnAddress,
          fid: context?.user?.fid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Failed to initiate disbursement';
        throw new Error(errorMsg);
      }

      const result = await response.json();

      if (result.transactionCode) {
        transactionDataRef.current.transactionCode = result.transactionCode;
        startPolling(result.transactionCode);
      }
    } catch (error) {
      // Don't set error status - user already sent USDC successfully
      // Just log the error for debugging
      if (error instanceof Error) {
        onError(error.message);
      }
    }
  }, [amount, phoneNumber, tillNumber, paybillNumber, paybillAccount, accountName, returnAddress, context, startPolling, onError]);

  // USDC transfer using OnchainKit standard format
  // Normalize amount to 2 decimal places to match what Pretium API expects
  const normalizedAmount = (Math.round(parseFloat(amount) * 100) / 100).toFixed(2);

  const calls = [{
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
    args: [
      PRETIUM_CONFIG.SETTLEMENT_ADDRESS as `0x${string}`,
      parseUnits(normalizedAmount, 6)
    ]
  }];

  const handleTransactionStatus = useCallback((lifecycleStatus: LifecycleStatus) => {
    switch (lifecycleStatus.statusName) {
      case 'transactionPending':
        setStatus('processing');
        break;
      case 'success':
        if (successTriggeredRef.current) return;
        successTriggeredRef.current = true;

        setStatus('success');

        // Get transaction hash and create Pretium order
        const txHash = lifecycleStatus.statusData?.transactionReceipts?.[0]?.transactionHash;
        if (txHash) {
          transactionDataRef.current.txHash = txHash;
          // Wait for createPretiumOrder to complete before calling onSuccess
          createPretiumOrder(txHash).then(() => {
            console.log('[PretiumPaymentProcessor] Order created, calling onSuccess with:', {
              transactionCode: transactionDataRef.current.transactionCode,
              txHash: transactionDataRef.current.txHash
            });
            onSuccess(transactionDataRef.current.transactionCode, transactionDataRef.current.txHash);
          }).catch((error) => {
            console.error('[PretiumPaymentProcessor] Order creation failed, but calling onSuccess anyway:', error);
            // Still call onSuccess even if order creation fails
            // The transaction was successful on-chain
            onSuccess(transactionDataRef.current.transactionCode, transactionDataRef.current.txHash);
          });
        } else {
          // No txHash, call onSuccess immediately
          onSuccess(transactionDataRef.current.transactionCode, transactionDataRef.current.txHash);
        }
        break;
      case 'error':
        setStatus('error');
        onError('Transaction failed');
        break;
    }
  }, [createPretiumOrder, onError, onSuccess]);

  // Swipe slider handlers
  const handleSwipeStart = useCallback(() => {
    if (isSwipeComplete) return;
    setIsDragging(true);
  }, [isSwipeComplete]);

  const handleSwipeMove = useCallback((clientX: number) => {
    if (!isDragging || isSwipeComplete) return;

    const container = containerRef.current;
    const slider = sliderRef.current;

    if (!container || !slider) return;

    const containerRect = container.getBoundingClientRect();
    const sliderWidth = slider.offsetWidth;
    const maxDistance = containerRect.width - sliderWidth;

    let newX = clientX - containerRect.left - sliderWidth / 2;
    newX = Math.max(0, Math.min(newX, maxDistance));

    const progress = (newX / maxDistance) * 100;
    setSwipeProgress(progress);

    if (progress > 90) {
      setSwipeProgress(100);
      setIsSwipeComplete(true);
      setIsDragging(false);
      setStatus('ready-to-pay');
    }
  }, [isDragging, isSwipeComplete]);

  const handleSwipeEnd = useCallback(() => {
    if (isSwipeComplete) return;

    setIsDragging(false);

    if (swipeProgress < 90) {
      setSwipeProgress(0);
    }
  }, [isSwipeComplete, swipeProgress]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSwipeStart();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    handleSwipeMove(e.clientX);
  }, [handleSwipeMove]);

  const handleMouseUp = useCallback(() => {
    handleSwipeEnd();
  }, [handleSwipeEnd]);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    handleSwipeStart();
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      handleSwipeMove(e.touches[0].clientX);
    }
  }, [handleSwipeMove]);

  const handleTouchEnd = useCallback(() => {
    handleSwipeEnd();
  }, [handleSwipeEnd]);

  // Add mouse listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as never);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as never);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Add touch listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove as never, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove as never);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  return (
    <div className="space-y-4">
      {/* Swipe to Confirm */}
      {status === 'idle' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <div
              ref={containerRef}
              className="relative h-14 sm:h-14 bg-[#1c1c1e] border-2 border-[#3a3a3c] rounded-xl sm:rounded-2xl overflow-hidden touch-none"
              style={{ touchAction: 'none' }}
            >
              <div
                className="absolute inset-0 bg-[#0066FF] transition-all duration-200"
                style={{
                  width: `${swipeProgress}%`,
                  opacity: swipeProgress > 0 ? 0.15 : 0
                }}
              />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
                <span className={`font-semibold text-xs sm:text-sm transition-all duration-200 text-white ${swipeProgress > 50 ? 'opacity-0' : 'opacity-100'}`}>
                  {isSwipeComplete ? 'Confirming...' : 'Slide to confirm'}
                </span>
              </div>

              <div
                ref={sliderRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={`absolute left-1 top-1 bottom-1 w-10 sm:w-12 bg-[#0066FF] rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab active:scale-105'
                }`}
                style={{
                  transform: `translateX(${(swipeProgress / 100) * (containerRef.current ? containerRef.current.offsetWidth - (containerRef.current.offsetWidth >= 640 ? 56 : 48) : 0)}px)`,
                  transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {isSwipeComplete ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7" />
                  </svg>
                )}
              </div>

              {!isSwipeComplete && swipeProgress < 90 && (
                <>
                  <div
                    className="absolute right-6 sm:right-8 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-200"
                    style={{ opacity: Math.max(0, 0.3 - swipeProgress / 100) }}
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#8e8e93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div
                    className="hidden sm:block absolute right-12 sm:right-14 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-200"
                    style={{ opacity: Math.max(0, 0.2 - swipeProgress / 100) }}
                  >
                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#8e8e93]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[#8e8e93] text-[10px] sm:text-xs px-2">
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-center">Slide to authorize transaction</span>
          </div>
        </div>
      )}

      {/* Transaction Component */}
      {(status === 'ready-to-pay' || status === 'processing') && (
        <div>
          <TransactionHandler
            chainId={base.id}
            calls={calls}
            buttonText="Approve & Send"
            onStatus={handleTransactionStatus}
            onError={() => {
              setStatus('error');
              onError('Transaction failed');
            }}
          />
        </div>
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="text-center space-y-6 py-8">
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-green-500/50">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-green-500 rounded-full animate-ping opacity-20"></div>
          </div>

          <div className="space-y-2">
            <h3 className="text-white font-bold text-2xl">Transaction Confirmed!</h3>
            <p className="text-green-300 text-base font-medium">
              Your USDC payment was sent successfully
            </p>
            <p className="text-gray-400 text-sm">
              Processing your M-Pesa transfer...
            </p>
          </div>

          <div className="flex items-center justify-center space-x-2 text-gray-400 text-sm">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="text-center space-y-4 py-8">
          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold text-xl">Transaction Failed</h3>
            <p className="text-red-400 text-sm">Please try again</p>
          </div>
        </div>
      )}
    </div>
  );
}
