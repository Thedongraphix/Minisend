"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import Image from 'next/image';

// Pretium settlement address for KES/GHS/UGX
const PRETIUM_SETTLEMENT_ADDRESS = '0x8005ee53e57ab11e11eaa4efe07ee3835dc02f98';

interface BlockradarPaymentProcessorProps {
  amount: string;
  localAmount?: string;
  phoneNumber?: string;
  tillNumber?: string;
  accountNumber?: string;
  bankCode?: string;
  accountName: string;
  currency: 'KES' | 'NGN' | 'GHS' | 'UGX';
  blockradarAddressId: string;
  walletAddress: string;
  rate?: number | null;
  onSuccess: (orderId?: string) => void;
  onError: (error: string) => void;
}

export function BlockradarPaymentProcessor({
  amount,
  localAmount,
  phoneNumber,
  tillNumber,
  accountNumber,
  bankCode,
  accountName,
  currency,
  blockradarAddressId,
  walletAddress,
  rate,
  onSuccess,
  onError
}: BlockradarPaymentProcessorProps) {
  const { context } = useMiniKit();

  // Determine which provider to use based on currency
  const usePretium = currency === 'KES' || currency === 'GHS' || currency === 'UGX';
  const usePaycrest = currency === 'NGN';

  // Order state (for PayCrest NGN orders)
  const [paycrestOrder, setPaycrestOrder] = useState<{
    id: string;
    receiveAddress: string;
    amount: string;
    senderFee: string;
    transactionFee: string;
    validUntil: string;
  } | null>(null);

  const [status, setStatus] = useState<'idle' | 'creating-order' | 'ready-to-pay' | 'processing' | 'success' | 'error' | 'insufficient-funds'>('idle');
  const [processingStep, setProcessingStep] = useState<'withdrawing' | 'confirming' | 'disbursing'>('withdrawing');
  const [errorDetails, setErrorDetails] = useState<{
    currentBalance?: number;
    requiredAmount?: number;
    insufficientBy?: number;
  } | null>(null);
  const successTriggeredRef = useRef(false);

  // Swipe slider states
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create PayCrest order (for NGN)
  const createPaycrestOrder = useCallback(async () => {
    setStatus('creating-order');
    successTriggeredRef.current = false;

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
          provider: 'Bank Transfer',
          returnAddress: walletAddress, // User's wallet for transaction history tracking
          ...(rate && { rate }),
          ...(context?.user?.fid && {
            fid: context.user.fid,
            farcasterUsername: context.user.username,
            farcasterDisplayName: context.user.displayName,
            farcasterPfpUrl: context.user.pfpUrl,
            clientFid: context.client?.clientFid,
            platformType: context.client?.platformType,
            locationType: context.location?.type
          })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        if (response.status === 400 && errorData?.error === 'Insufficient funds') {
          setStatus('insufficient-funds');
          setErrorDetails(errorData.balanceInfo);
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

      } else {
        throw new Error('Invalid response from PayCrest API');
      }
    } catch (error) {
      setStatus('error');
      onError(error instanceof Error ? error.message : 'Failed to create order');
    }
  }, [amount, phoneNumber, tillNumber, accountNumber, bankCode, accountName, currency, walletAddress, rate, onError, context?.user?.fid, context?.user?.username, context?.user?.displayName, context?.user?.pfpUrl, context?.client?.clientFid, context?.client?.platformType, context?.location?.type]);

  // Execute Blockradar withdrawal to PayCrest (for NGN)
  const executeBlockradarWithdrawPaycrest = useCallback(async () => {
    if (!paycrestOrder) return;

    setStatus('processing');
    setProcessingStep('withdrawing');

    try {
      const baseAmount = parseFloat(paycrestOrder.amount) || 0;
      const senderFee = parseFloat(paycrestOrder.senderFee) || 0;
      const transactionFee = parseFloat(paycrestOrder.transactionFee) || 0;
      const totalAmount = baseAmount + senderFee + transactionFee;

      console.log('[BlockradarPaymentProcessor] Executing PayCrest withdrawal:', {
        addressId: blockradarAddressId,
        recipientAddress: paycrestOrder.receiveAddress,
        amount: totalAmount,
      });

      setProcessingStep('confirming');

      const response = await fetch('/api/blockradar/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId: blockradarAddressId,
          recipientAddress: paycrestOrder.receiveAddress,
          amount: totalAmount.toString(),
          reference: `paycrest-${paycrestOrder.id}`,
          note: `Cashout to ${currency} - ${accountName}`,
          metadata: {
            paycrestOrderId: paycrestOrder.id,
            currency,
            accountName,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Withdrawal failed');
      }

      const data = await response.json();

      if (data.success) {
        if (successTriggeredRef.current) return;
        successTriggeredRef.current = true;

        setProcessingStep('disbursing');
        setStatus('success');
        setTimeout(() => onSuccess(paycrestOrder.id), 2000);
      } else {
        throw new Error(data.error || 'Withdrawal failed');
      }
    } catch (error) {
      setStatus('error');
      onError(error instanceof Error ? error.message : 'Withdrawal failed');
    }
  }, [paycrestOrder, blockradarAddressId, currency, accountName, onSuccess, onError]);

  // Poll for withdrawal status until we get a transaction hash
  const pollForTransactionHash = useCallback(async (withdrawalId: string, maxAttempts = 30): Promise<string> => {
    console.log('[BlockradarPaymentProcessor] Polling for transaction hash, withdrawal ID:', withdrawalId);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const statusResponse = await fetch('/api/blockradar/withdraw/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ withdrawalId }),
        });

        const statusData = await statusResponse.json();

        console.log(`[BlockradarPaymentProcessor] Poll attempt ${attempt}:`, {
          status: statusData.data?.status,
          hash: statusData.data?.hash,
        });

        if (statusData.success && statusData.data?.hash) {
          return statusData.data.hash;
        }

        // If status is FAILED, throw an error
        if (statusData.data?.status === 'FAILED') {
          throw new Error('Withdrawal transaction failed');
        }

        // Wait before next poll (increasing delay)
        const delay = Math.min(2000 + (attempt * 500), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        console.error(`[BlockradarPaymentProcessor] Poll attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error('Transaction hash not available after maximum polling attempts');
  }, []);

  // Execute Blockradar withdrawal to Pretium (for KES/GHS/UGX)
  const executeBlockradarWithdrawPretium = useCallback(async () => {
    setStatus('processing');
    setProcessingStep('withdrawing');

    try {
      // Calculate amount with 1% fee
      const baseAmount = parseFloat(amount);
      const feeAmount = baseAmount * 0.01;
      const totalAmount = baseAmount + feeAmount;

      console.log('[BlockradarPaymentProcessor] Executing Pretium withdrawal:', {
        addressId: blockradarAddressId,
        recipientAddress: PRETIUM_SETTLEMENT_ADDRESS,
        amount: totalAmount,
        currency,
      });

      // Step 1: Withdraw USDC to Pretium settlement address
      const withdrawResponse = await fetch('/api/blockradar/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId: blockradarAddressId,
          recipientAddress: PRETIUM_SETTLEMENT_ADDRESS,
          amount: totalAmount.toString(),
          reference: `pretium-${Date.now()}`,
          note: `Cashout to ${currency} - ${accountName}`,
          metadata: {
            currency,
            accountName,
            phoneNumber,
            provider: 'pretium',
          }
        }),
      });

      if (!withdrawResponse.ok) {
        const errorData = await withdrawResponse.json().catch(() => null);
        throw new Error(errorData?.error || 'Withdrawal failed');
      }

      const withdrawData = await withdrawResponse.json();

      if (!withdrawData.success) {
        throw new Error(withdrawData.error || 'Withdrawal failed');
      }

      const withdrawalId = withdrawData.data?.id;
      let transactionHash = withdrawData.data?.hash;

      console.log('[BlockradarPaymentProcessor] Withdrawal initiated:', {
        withdrawalId,
        hash: transactionHash,
        status: withdrawData.data?.status,
      });

      // If hash is not available immediately, poll for it
      setProcessingStep('confirming');
      if (!transactionHash && withdrawalId) {
        console.log('[BlockradarPaymentProcessor] Hash not available, polling for status...');
        transactionHash = await pollForTransactionHash(withdrawalId);
      }

      if (!transactionHash) {
        throw new Error('Could not get transaction hash from withdrawal');
      }

      console.log('[BlockradarPaymentProcessor] Got transaction hash, calling Pretium disburse:', {
        transactionHash,
        amount: baseAmount,
      });

      // Step 2: Call Pretium disburse API with the transaction hash
      setProcessingStep('disbursing');
      const disburseResponse = await fetch('/api/pretium/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: baseAmount.toString(),
          localAmount,
          phoneNumber,
          tillNumber,
          accountName,
          transactionHash,
          returnAddress: walletAddress, // User's wallet for transaction history tracking
          currency,
          ...(context?.user?.fid && { fid: context.user.fid })
        }),
      });

      if (!disburseResponse.ok) {
        const errorData = await disburseResponse.json().catch(() => null);
        throw new Error(errorData?.error || 'Disbursement failed');
      }

      const disburseData = await disburseResponse.json();

      if (!disburseData.success) {
        throw new Error(disburseData.error || 'Disbursement failed');
      }

      if (successTriggeredRef.current) return;
      successTriggeredRef.current = true;

      setStatus('success');
      // Return the transaction code for the receipt
      setTimeout(() => onSuccess(disburseData.transactionCode || disburseData.transaction_code), 2000);

    } catch (error) {
      console.error('[BlockradarPaymentProcessor] Pretium flow error:', error);
      setStatus('error');
      onError(error instanceof Error ? error.message : 'Transaction failed');
    }
  }, [amount, blockradarAddressId, walletAddress, currency, accountName, phoneNumber, tillNumber, context?.user?.fid, onSuccess, onError, pollForTransactionHash, localAmount]);

  // Initiate order creation on swipe complete
  const initiatePayment = useCallback(async () => {
    if (usePaycrest) {
      // For NGN: Create PayCrest order first
      await createPaycrestOrder();
    } else if (usePretium) {
      // For KES/GHS/UGX: Go directly to ready-to-pay (no order creation needed)
      setStatus('ready-to-pay');
    }
  }, [usePaycrest, usePretium, createPaycrestOrder]);

  // Execute withdrawal based on provider
  const executeWithdrawal = useCallback(async () => {
    if (usePaycrest) {
      await executeBlockradarWithdrawPaycrest();
    } else if (usePretium) {
      await executeBlockradarWithdrawPretium();
    }
  }, [usePaycrest, usePretium, executeBlockradarWithdrawPaycrest, executeBlockradarWithdrawPretium]);

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

      initiatePayment();
    }
  }, [isDragging, isSwipeComplete, status, initiatePayment]);

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

  // Calculate display amount
  const displayAmount = usePretium
    ? (parseFloat(amount) * 1.01).toFixed(2) // Pretium: base + 1% fee
    : paycrestOrder
      ? parseFloat(paycrestOrder.amount).toFixed(2)
      : parseFloat(amount).toFixed(2);

  // Processing steps config
  const processingSteps = [
    { key: 'withdrawing', label: 'Sending USDC', description: 'Initiating transfer' },
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

      {/* ─── CREATING ORDER ─── */}
      {status === 'creating-order' && (
        <div className="ios-card rounded-2xl p-6 animate-ios-reveal">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-[2.5px] border-white/10 border-t-[#007AFF] animate-spin" />
              <div className="absolute inset-0 w-12 h-12 rounded-full bg-[#007AFF]/10 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-white text-[17px] font-semibold">Preparing your transfer</p>
              <p className="text-[#98989F] text-[13px]">Setting up secure payment channel</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── READY TO PAY ─── */}
      {status === 'ready-to-pay' && (
        <div className="space-y-3 animate-ios-reveal">
          {/* Amount confirmation badge */}
          <div className="ios-card rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
                  <Image src="/usdc.svg" alt="USDC" width={36} height={36} className="rounded-full" />
                </div>
                <div>
                  <p className="text-[11px] text-[#98989F] font-medium uppercase tracking-wider">Total amount</p>
                  <p className="text-white text-[17px] font-bold">{displayAmount} USDC</p>
                </div>
              </div>
              <div className="w-8 h-8 bg-[#34C759]/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#34C759]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Approve button */}
          <button
            onClick={executeWithdrawal}
            className="w-full bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#0064CC] text-white font-semibold text-[17px] py-[14px] px-6 rounded-[14px] transition-all duration-200 active:scale-[0.98]"
          >
            Approve & Send
          </button>
        </div>
      )}

      {/* ─── PROCESSING ─── */}
      {status === 'processing' && (
        <div className="ios-card rounded-2xl p-5 animate-ios-reveal">
          {/* Main spinner */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="relative mb-3">
              <div className="w-12 h-12 rounded-full border-[2.5px] border-white/10 border-t-[#007AFF] animate-spin" />
              <div className="absolute inset-0 w-12 h-12 rounded-full bg-[#007AFF]/10 animate-pulse" />
            </div>
            <p className="text-white text-[17px] font-semibold">Processing withdrawal</p>
            <p className="text-[#98989F] text-[13px] mt-0.5">
              {processingSteps[currentStepIndex]?.description}
            </p>
          </div>

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

      {/* ─── INSUFFICIENT FUNDS ─── */}
      {status === 'insufficient-funds' && (
        <div className="space-y-3 animate-ios-reveal">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2 py-2">
            <div className="w-14 h-14 bg-[#FF3B30]/10 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-[#FF3B30]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-[20px] tracking-tight">Insufficient Balance</h3>
            <p className="text-[#98989F] text-[13px]">You need a little more USDC to complete this</p>
          </div>

          {/* Balance breakdown - iOS grouped list */}
          {errorDetails && (
            <div className="ios-card rounded-2xl overflow-hidden">
              {/* Your balance */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white/[0.06] rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#98989F]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-[#98989F]">Your balance</span>
                </div>
                <span className="text-[15px] text-white font-semibold">${errorDetails.currentBalance?.toFixed(4) || '0.00'}</span>
              </div>

              <div className="h-px bg-white/[0.04] ml-14" />

              {/* Required */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white/[0.06] rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#98989F]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-[#98989F]">Required</span>
                </div>
                <span className="text-[15px] text-white font-semibold">${errorDetails.requiredAmount?.toFixed(4) || '0.00'}</span>
              </div>

              <div className="h-px bg-white/[0.04] ml-14" />

              {/* Shortfall */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-[#FF3B30]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#FF3B30]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-[#FF3B30] font-medium">Need more</span>
                </div>
                <span className="text-[15px] text-[#FF3B30] font-bold">${errorDetails.insufficientBy?.toFixed(4) || '0.00'}</span>
              </div>
            </div>
          )}

          {/* Try again button */}
          <button
            onClick={() => {
              setStatus('idle');
              setErrorDetails(null);
              setSwipeProgress(0);
              setIsSwipeComplete(false);
            }}
            className="w-full bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#0064CC] text-white font-semibold text-[17px] py-[14px] px-6 rounded-[14px] transition-all duration-200 active:scale-[0.98]"
          >
            Try Again
          </button>
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

          <button
            onClick={() => {
              setStatus('idle');
              setSwipeProgress(0);
              setIsSwipeComplete(false);
              setPaycrestOrder(null);
              setProcessingStep('withdrawing');
            }}
            className="w-full bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#0064CC] text-white font-semibold text-[17px] py-[14px] px-6 rounded-[14px] transition-all duration-200 active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
