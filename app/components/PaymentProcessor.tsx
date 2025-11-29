"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { base } from 'wagmi/chains';
import { parseUnits } from 'viem';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { TransactionHandler } from './TransactionHandler';
import { USDC_CONTRACTS } from '@/lib/paymaster-config';
import { trackDuneTransaction, trackDuneOrder } from '@/lib/dune-analytics';

interface PaymentProcessorProps {
  amount: string;
  phoneNumber?: string;
  tillNumber?: string;
  accountNumber?: string;
  bankCode?: string;
  accountName: string;
  currency: 'KES' | 'NGN';
  returnAddress: string;
  rate?: number | null;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentProcessor({
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
}: PaymentProcessorProps) {
  // Get Farcaster context for notifications (undefined on web, safe to use)
  const { context } = useMiniKit();
  const [paycrestOrder, setPaycrestOrder] = useState<{
    id: string;
    receiveAddress: string;
    amount: string;
    senderFee: string;
    transactionFee: string;
    validUntil: string;
  } | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating-order' | 'ready-to-pay' | 'processing' | 'success' | 'error' | 'insufficient-funds'>('idle');
  const [errorDetails, setErrorDetails] = useState<{
    currentBalance?: number;
    requiredAmount?: number;
    insufficientBy?: number;
  } | null>(null);
  const pollingStartedRef = useRef(false);
  const successTriggeredRef = useRef(false);

  // Swipe slider states
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // USDC contract on Base
  const USDC_CONTRACT = USDC_CONTRACTS.mainnet;

  // Optimized polling that works alongside webhooks for maximum speed
  const startPolling = useCallback((orderId: string) => {
    if (pollingStartedRef.current) {
      return;
    }
    pollingStartedRef.current = true;

    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      try {
        const response = await fetch(`/api/paycrest/status/${orderId}`);

        if (!response.ok) {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000);
          }
          return;
        }

        const result = await response.json();
        const order = result.order;

        switch (order?.status) {
          case 'pending':
            break;
          case 'validated':
          case 'settled':
            return;
        }

        if (order?.status === 'refunded') {
          setStatus('error');
          onError('Payment was refunded. Please try again.');
          return;
        }

        if (order?.status === 'expired') {
          setStatus('error');
          onError('Payment expired. Please try again.');
          return;
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

    setTimeout(poll, 5000);
  }, [onError]);

  // Create PayCrest order
  const createPaycrestOrder = useCallback(async () => {
    setStatus('creating-order');
    pollingStartedRef.current = false;
    successTriggeredRef.current = false;

    // Track order creation started (P1)
    trackDuneOrder('creation_started', {
      orderId: '', // Will be set after creation
      walletAddress: returnAddress,
      usdcAmount: amount,
      localCurrency: currency,
      localAmount: amount,
      paymentMethod: phoneNumber ? 'mpesa' : tillNumber ? 'till' : accountNumber ? 'bank' : undefined,
    });

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
          ...(rate && { rate }),
          // Include FID only if user is on Farcaster (for notifications)
          // Web users won't have this field, ensuring backward compatibility
          ...(context?.user?.fid && { fid: context.user.fid })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        if (response.status === 400 && errorData?.error === 'Insufficient funds') {
          setStatus('insufficient-funds');
          setErrorDetails(errorData.balanceInfo);

          // Track insufficient funds (P1)
          trackDuneOrder('insufficient_funds', {
            orderId: '',
            walletAddress: returnAddress,
            usdcAmount: errorData?.balanceInfo?.requiredAmount || amount,
            localCurrency: currency,
            localAmount: amount,
            success: false,
            error: 'Insufficient USDC balance',
          });

          return;
        }

        throw new Error(errorData?.error || 'Failed to create PayCrest order');
      }

      const data = await response.json();

      if (data.success && data.order) {
        let orderData;

        if (data.order.data) {
          orderData = data.order.data;
        } else if (data.order.id || data.order.receiveAddress) {
          orderData = data.order;
        } else {
          throw new Error('Unexpected PayCrest response structure');
        }

        const paycrestOrderObj = {
          id: orderData.id,
          receiveAddress: orderData.receiveAddress,
          amount: orderData.amount,
          senderFee: orderData.senderFee || '0',
          transactionFee: orderData.transactionFee || '0',
          validUntil: orderData.validUntil
        };

        setPaycrestOrder(paycrestOrderObj);
        setStatus('ready-to-pay');

        // Track order creation success (P1)
        trackDuneOrder('created', {
          orderId: paycrestOrderObj.id,
          walletAddress: returnAddress,
          usdcAmount: paycrestOrderObj.amount,
          localCurrency: currency,
          localAmount: amount,
          receiveAddress: paycrestOrderObj.receiveAddress,
          paymentMethod: phoneNumber ? 'mpesa' : tillNumber ? 'till' : accountNumber ? 'bank' : undefined,
          success: true,
        });

      } else {
        throw new Error('Invalid response from PayCrest API');
      }
    } catch (error) {
      setStatus('error');
      onError(error instanceof Error ? error.message : 'Failed to create order');

      // Track order creation error (P1)
      trackDuneOrder('creation_failed', {
        orderId: '',
        walletAddress: returnAddress,
        usdcAmount: amount,
        localCurrency: currency,
        localAmount: amount,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [amount, phoneNumber, tillNumber, accountNumber, bankCode, accountName, currency, returnAddress, rate, onError, context?.user?.fid]);

  // USDC transfer using OnchainKit standard format
  const calls = paycrestOrder && paycrestOrder.receiveAddress && paycrestOrder.amount ? (() => {
    const baseAmount = parseFloat(paycrestOrder.amount) || 0;
    const senderFee = parseFloat(paycrestOrder.senderFee) || 0;
    const transactionFee = parseFloat(paycrestOrder.transactionFee) || 0;

    const totalAmountToSend = baseAmount + senderFee + transactionFee;
    const totalAmountWei = parseUnits(totalAmountToSend.toString(), 6);

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

  const handleTransactionStatus = useCallback((status: LifecycleStatus) => {
    switch (status.statusName) {
      case 'transactionPending':
        setStatus('processing');

        // Track transaction pending (P1)
        if (paycrestOrder) {
          trackDuneTransaction('pending', {
            walletAddress: returnAddress,
            orderId: paycrestOrder.id,
            amount: paycrestOrder.amount,
            currency: currency,
            receiveAddress: paycrestOrder.receiveAddress,
            chainId: base.id,
          });
        }
        break;
      case 'success':
        if (successTriggeredRef.current) return;
        successTriggeredRef.current = true;

        setStatus('success');

        // Track transaction success (P1)
        if (paycrestOrder) {
          trackDuneTransaction('confirmed', {
            walletAddress: returnAddress,
            orderId: paycrestOrder.id,
            transactionHash: (status as { statusData?: { transactionReceipts?: Array<{ transactionHash: string }> } }).statusData?.transactionReceipts?.[0]?.transactionHash,
            amount: paycrestOrder.amount,
            currency: currency,
            receiveAddress: paycrestOrder.receiveAddress,
            chainId: base.id,
            success: true,
          });
        }

        if (paycrestOrder?.id) {
          startPolling(paycrestOrder.id);
        }

        setTimeout(() => onSuccess(), 2000);
        break;
      case 'error':
        setStatus('error');
        onError('Transaction failed');

        // Track transaction error (P1)
        if (paycrestOrder) {
          trackDuneTransaction('failed', {
            walletAddress: returnAddress,
            orderId: paycrestOrder.id,
            amount: paycrestOrder.amount,
            currency: currency,
            receiveAddress: paycrestOrder.receiveAddress,
            chainId: base.id,
            success: false,
            error: 'Transaction failed',
          });
        }
        break;
    }
  }, [paycrestOrder, returnAddress, currency, startPolling, onError, onSuccess]);

  // Swipe slider handlers
  const handleSwipeStart = useCallback(() => {
    if (isSwipeComplete || status === 'creating-order') return;
    setIsDragging(true);
  }, [isSwipeComplete, status]);

  const handleSwipeMove = useCallback((clientX: number) => {
    if (!isDragging || isSwipeComplete || status === 'creating-order') return;

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

      // Track swipe confirmation (P3)
      trackDuneOrder('swipe_confirmed', {
        orderId: '',
        walletAddress: returnAddress,
        usdcAmount: amount,
        localCurrency: currency,
        localAmount: amount,
      });

      createPaycrestOrder();
    }
  }, [isDragging, isSwipeComplete, status, createPaycrestOrder]);

  const handleSwipeEnd = useCallback(() => {
    if (isSwipeComplete || status === 'creating-order') return;

    setIsDragging(false);

    if (swipeProgress < 90) {
      setSwipeProgress(0);
    }
  }, [isSwipeComplete, status, swipeProgress]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSwipeStart();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleSwipeMove(e.clientX);
  }, [handleSwipeMove]);

  const handleMouseUp = useCallback(() => {
    handleSwipeEnd();
  }, [handleSwipeEnd]);

  // Touch events
  const handleTouchStart = () => {
    handleSwipeStart();
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    handleSwipeMove(e.touches[0].clientX);
  }, [handleSwipeMove]);

  const handleTouchEnd = useCallback(() => {
    handleSwipeEnd();
  }, [handleSwipeEnd]);

  // Effect for swipe event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className="space-y-6">
      {/* Swipe to Confirm - Mobile Optimized */}
      {status === 'idle' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-end px-1">
              <span className="text-[#8e8e93] text-xs sm:text-xs">{Math.round(swipeProgress)}%</span>
            </div>
            <div
              ref={containerRef}
              className="relative h-14 sm:h-14 bg-[#1c1c1e] border-2 border-[#3a3a3c] rounded-xl sm:rounded-2xl overflow-hidden touch-none"
              style={{ touchAction: 'none' }}
            >
              {/* Progress background */}
              <div
                className="absolute inset-0 bg-[#0066FF] transition-all duration-200"
                style={{
                  width: `${swipeProgress}%`,
                  opacity: swipeProgress > 0 ? 0.15 : 0
                }}
              />

              {/* Text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
                <span className={`font-semibold text-xs sm:text-sm transition-all duration-200 text-white ${swipeProgress > 50 ? 'opacity-0' : 'opacity-100'}`}>
                  {isSwipeComplete ? 'Confirming...' : 'Slide to confirm'}
                </span>
              </div>

              {/* Slider button */}
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

              {/* Arrow hints - Hidden on mobile for cleaner look */}
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

      {/* Creating Order */}
      {status === 'creating-order' && (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-white/20 border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-white font-medium">Creating order...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait</p>
        </div>
      )}

      {/* Ready to Pay - Transaction Component */}
      {(status === 'ready-to-pay' || status === 'processing') && paycrestOrder && (
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
              Processing your {currency} transfer...
            </p>
          </div>

          <div className="flex items-center justify-center space-x-2 text-gray-400 text-sm">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      )}

      {/* Insufficient Funds */}
      {status === 'insufficient-funds' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-xl">Insufficient Funds</h3>
          <div className="bg-black/95 border border-red-600/60 rounded-2xl p-5 backdrop-blur-sm shadow-xl shadow-red-900/60">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-red-300 font-semibold">
                Need more USDC to complete this transaction
              </p>
            </div>
            {errorDetails && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-red-200 font-medium">Your Balance</span>
                  <span className="text-white font-semibold">${errorDetails.currentBalance?.toFixed(4) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-red-200 font-medium">Required</span>
                  <span className="text-red-100 font-semibold">${errorDetails.requiredAmount?.toFixed(4) || '0.00'}</span>
                </div>
                <div className="border-t border-red-500/30 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-red-300 font-semibold">Need</span>
                    <span className="text-red-300 font-bold text-lg">${errorDetails.insufficientBy?.toFixed(4) || '0.00'} more</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setStatus('idle');
              setErrorDetails(null);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
