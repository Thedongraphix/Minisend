"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

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

  return (
    <div className="space-y-6">
      {/* Swipe to Confirm */}
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

      {/* Creating Order */}
      {status === 'creating-order' && (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-white/20 border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-white font-medium">Creating order...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait</p>
        </div>
      )}

      {/* Ready to Pay - Show Approve Button */}
      {status === 'ready-to-pay' && (
        <div className="space-y-4">
          <button
            onClick={executeWithdrawal}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg"
          >
            Approve & Send
          </button>
          <p className="text-center text-gray-400 text-sm">
            Sending {displayAmount} USDC
          </p>
        </div>
      )}

      {/* Processing */}
      {status === 'processing' && (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-white/20 border-t-purple-400 mx-auto mb-4"></div>
          <p className="text-white font-medium">Processing withdrawal...</p>
          <p className="text-gray-400 text-sm mt-2">This may take a moment</p>
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
              setSwipeProgress(0);
              setIsSwipeComplete(false);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-xl">Transaction Failed</h3>
          <p className="text-gray-400">Something went wrong. Please try again.</p>
          <button
            onClick={() => {
              setStatus('idle');
              setSwipeProgress(0);
              setIsSwipeComplete(false);
              setPaycrestOrder(null);
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
