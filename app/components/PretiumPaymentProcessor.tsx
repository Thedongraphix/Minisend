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
  localAmount?: string;
  phoneNumber?: string;
  tillNumber?: string;
  paybillNumber?: string;
  paybillAccount?: string;
  accountName: string;
  accountNumber?: string; // For NGN bank transfers
  bankCode?: string; // For NGN bank transfers
  bankName?: string; // For NGN bank transfers
  returnAddress: string;
  rate: number;
  currency: 'KES' | 'GHS' | 'NGN' | 'UGX';
  onSuccess: (transactionCode?: string, txHash?: string) => void;
  onError: (error: string) => void;
}

export function PretiumPaymentProcessor({
  amount,
  localAmount,
  phoneNumber,
  tillNumber,
  paybillNumber,
  paybillAccount,
  accountName,
  accountNumber,
  bankCode,
  bankName,
  returnAddress,
  currency,
  onSuccess,
  onError
}: PretiumPaymentProcessorProps) {
  const { context } = useMiniKit();
  const [status, setStatus] = useState<'idle' | 'ready-to-pay' | 'processing' | 'success' | 'error'>('idle');
  const [processingStep, setProcessingStep] = useState<'approving' | 'confirming' | 'disbursing'>('approving');
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

    setProcessingStep('disbursing');

    try {
      const response = await fetch('/api/pretium/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: normalizedAmount,
          localAmount,
          phoneNumber,
          tillNumber,
          paybillNumber,
          paybillAccount,
          accountName,
          accountNumber, // For NGN
          bankCode, // For NGN
          bankName, // For NGN
          transactionHash: txHash,
          returnAddress,
          fid: context?.user?.fid,
          currency,
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
      if (error instanceof Error) {
        onError(error.message);
      }
    }
  }, [amount, localAmount, phoneNumber, tillNumber, paybillNumber, paybillAccount, accountName, accountNumber, bankCode, bankName, returnAddress, currency, context, startPolling, onError]);

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
        setProcessingStep('confirming');
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
            onSuccess(transactionDataRef.current.transactionCode, transactionDataRef.current.txHash);
          }).catch(() => {
            // Still call onSuccess even if order creation fails - transaction was successful on-chain
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
      setProcessingStep('approving');
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

  // Processing steps config
  const processingSteps = [
    { key: 'approving', label: 'Approve transaction', description: 'Confirm in your wallet' },
    { key: 'confirming', label: 'Confirming on-chain', description: 'Waiting for confirmation' },
    { key: 'disbursing', label: 'Initiating transfer', description: `Processing ${currency} payout` },
  ];

  const currentStepIndex = processingSteps.findIndex(s => s.key === processingStep);

  return (
    <div className="space-y-4">
      {/* ─── SWIPE TO CONFIRM ─── */}
      {status === 'idle' && (
        <div className="space-y-3 animate-ios-reveal">
          {/* Swipe Track */}
          <div
            ref={containerRef}
            className="relative h-[58px] ios-card rounded-2xl overflow-hidden touch-none"
            style={{ touchAction: 'none' }}
          >
            {/* Progress fill */}
            <div
              className="absolute inset-0 bg-[#007AFF]/10 transition-all duration-150"
              style={{ width: `${swipeProgress}%` }}
            />

            {/* Shimmer hint */}
            {swipeProgress === 0 && !isSwipeComplete && (
              <div className="absolute inset-0 animate-shimmer rounded-2xl" />
            )}

            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-[15px] font-semibold text-[#98989F] transition-opacity duration-200"
                style={{ opacity: swipeProgress > 40 ? 0 : 1 }}
              >
                {isSwipeComplete ? 'Confirming...' : 'Slide to confirm'}
              </span>
            </div>

            {/* Slider thumb */}
            <div
              ref={sliderRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className={`absolute left-1.5 top-1.5 bottom-1.5 w-12 bg-[#007AFF] rounded-[14px] flex items-center justify-center transition-all duration-150 ${
                isDragging ? 'cursor-grabbing shadow-[0_0_16px_rgba(0,122,255,0.5)]' : 'cursor-grab shadow-[0_0_12px_rgba(0,122,255,0.3)]'
              }`}
              style={{
                transform: `translateX(${(swipeProgress / 100) * (containerRef.current ? containerRef.current.offsetWidth - 54 : 0)}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {isSwipeComplete ? (
                <svg className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7" />
                </svg>
              )}
            </div>

            {/* Right chevrons hint */}
            {!isSwipeComplete && swipeProgress < 80 && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
                <svg
                  className="w-3.5 h-3.5 text-[#98989F]/30"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  style={{ opacity: Math.max(0, 0.3 - swipeProgress / 200) }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
                <svg
                  className="w-3.5 h-3.5 text-[#98989F]/50"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  style={{ opacity: Math.max(0, 0.5 - swipeProgress / 150) }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-1.5 text-[#98989F] text-[11px]">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Protected by Minisend</span>
          </div>
        </div>
      )}

      {/* ─── WALLET APPROVAL ─── */}
      {status === 'ready-to-pay' && (
        <div className="animate-ios-reveal">
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

      {/* ─── PROCESSING PROGRESS ─── */}
      {status === 'processing' && (
        <div className="space-y-3 animate-ios-reveal">
          {/* Horizontal multi-step progress */}
          <div className="ios-card rounded-2xl p-5">
            {/* Active step description */}
            <p className="text-center text-[#98989F] text-[13px] mb-4">
              {processingSteps[currentStepIndex]?.description}
            </p>

            {/* Horizontal step indicators */}
            <div className="flex items-center justify-center gap-0">
              {processingSteps.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;

                return (
                  <div key={step.key} className="flex items-center">
                    {/* Step node */}
                    <div className="flex flex-col items-center gap-2">
                      {isCompleted ? (
                        <div className="w-8 h-8 bg-[#34C759]/15 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-[#34C759]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : isActive ? (
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full border-[2px] border-white/10 border-t-[#007AFF] animate-spin" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-white/[0.04] rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white/20 rounded-full" />
                        </div>
                      )}
                      <p className={`text-[11px] font-medium text-center w-20 leading-tight transition-colors duration-300 ${
                        isCompleted ? 'text-[#34C759]' : isActive ? 'text-white' : 'text-[#48484A]'
                      }`}>
                        {step.label}
                      </p>
                    </div>

                    {/* Connector line */}
                    {index < processingSteps.length - 1 && (
                      <div className={`w-8 h-px mb-6 ${
                        isCompleted ? 'bg-[#34C759]/40' : 'bg-white/[0.08]'
                      } transition-colors duration-300`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── SUCCESS ─── */}
      {status === 'success' && (
        <div className="text-center space-y-5 py-6 animate-ios-reveal">
          {/* iOS-style success checkmark */}
          <div className="w-20 h-20 mx-auto bg-[#34C759] rounded-full flex items-center justify-center animate-ios-spring">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" strokeDasharray="24" strokeDashoffset="0" className="animate-checkmark" />
            </svg>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-white font-bold text-[22px] tracking-tight">Payment Sent</h3>
            <p className="text-[#98989F] text-[15px]">
              Your {currency} transfer is being processed
            </p>
          </div>
        </div>
      )}

      {/* ─── ERROR ─── */}
      {status === 'error' && (
        <div className="space-y-4 animate-ios-reveal">
          <div className="ios-card rounded-2xl p-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-[#FF3B30]/10 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-[#FF3B30]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-white font-bold text-[20px] tracking-tight">Something went wrong</h3>
                <p className="text-[#98989F] text-[14px]">
                  Your transaction could not be completed. Please try again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
