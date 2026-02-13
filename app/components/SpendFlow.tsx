"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { PaymentProcessor } from './PaymentProcessor';
import { PretiumPaymentProcessor } from './PretiumPaymentProcessor';
import { BlockradarPaymentProcessor } from './BlockradarPaymentProcessor';
import { BalanceView } from './BalanceView';
import { AdvancedSelector } from './AdvancedSelector';
import { Button } from './BaseComponents';
import Image from 'next/image';
import { CurrencySwapInterface } from './CurrencySwapInterface';
import { FormInput } from './FormInput';
import { PretiumReceipt } from './PretiumReceipt';
import { useMinisendAuth } from '@/lib/hooks/useMinisendAuth';

interface SpendFlowProps {
  setActiveTab: (tab: string) => void;
}

export function SpendFlow({ setActiveTab }: SpendFlowProps) {
  const { address, isConnected } = useAccount();
  const { minisendWallet, user } = useMinisendAuth();

  // User can proceed if they have a wagmi wallet OR a minisend wallet (email auth)
  const hasWallet = isConnected || !!minisendWallet;
  const walletAddress = address || minisendWallet;

  // Determine if user should use Blockradar for payments
  // Use Blockradar if: has minisendWallet AND no wagmi wallet connected
  const useBlockradarPayment = !isConnected && !!minisendWallet;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form state with new swap step
  const [step, setStep] = useState<'swap' | 'details' | 'payment' | 'success'>('swap');
  const [swapData, setSwapData] = useState<{
    usdcAmount: string;
    localAmount: string;
    currency: 'KES' | 'NGN' | 'GHS' | 'UGX';
    rate: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    accountName: '',
    paybillAccount: '', // For paybill account number
  });
  const [paymentMethod, setPaymentMethod] = useState<{
    type: 'phone' | 'till' | 'paybill';
    value: string;
    formatted: string;
    paybillAccount?: string; // For paybill payments
  } | null>(null);
  const [transactionData, setTransactionData] = useState<{
    transactionCode?: string;
    txHash?: string;
  }>({});


  // Show loading skeleton while mounting
  if (!mounted) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
          <div className="h-8 bg-gray-700 rounded w-3/4 mx-auto"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Show connect prompt if no wallet available
  if (!hasWallet) {
    return (
      <div className="max-w-md mx-auto p-6">
        <button
          onClick={() => setActiveTab('home')}
          className="w-10 h-10 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-[#3a3a3c] flex items-center justify-center transition-all duration-200 mb-6"
          title="Go back"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Spend USDC</h1>
          <p className="text-[#8e8e93] text-sm mb-6">Pay till numbers and paybills with USDC</p>
          <p className="text-[#8e8e93] text-xs">Connect your wallet to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 overflow-visible">
      {/* Back and Profile Buttons */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setActiveTab('home')}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all duration-200"
          title="Go back"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Button
          onClick={() => setActiveTab("profile")}
          variant="ghost"
          size="medium"
          iconName="user"
          className="!p-2"
        >
          Profile
        </Button>
      </div>

      {/* Header with Step Indicator */}
      <div className="text-center">

        <div className="inline-flex items-center space-x-2 text-xs text-blue-300 bg-blue-500/10 px-3 py-1 rounded-xl mt-2 border border-blue-400/20">
          <Image src="/Base_Network_Logo.svg" alt="Base Network" width={12} height={12} />
          <span className="font-medium">Powered by Base</span>
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-center space-x-2 mt-4">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === 'swap' ? 'bg-blue-500 scale-125' : 'bg-blue-500'}`}></div>
          <div className={`w-6 h-0.5 transition-all duration-300 ${step === 'details' || step === 'payment' || step === 'success' ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === 'details' ? 'bg-blue-500 scale-125' : step === 'payment' || step === 'success' ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
          <div className={`w-6 h-0.5 transition-all duration-300 ${step === 'payment' || step === 'success' ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === 'payment' ? 'bg-blue-500 scale-125' : step === 'success' ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
          <div className={`w-6 h-0.5 transition-all duration-300 ${step === 'success' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === 'success' ? 'bg-green-500 scale-125' : 'bg-gray-600'}`}></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
          <span>Amount</span>
          <span>Recipient</span>
          <span>Payment</span>
          <span>Done</span>
        </div>
      </div>

      {/* USDC Balance - Hide on payment step */}
      {step !== 'payment' && <BalanceView />}

      {/* Swap Step - New Premium Interface */}
      {step === 'swap' && (
        <div className="overflow-visible">
          <CurrencySwapInterface
            onContinue={(data) => {
              setSwapData(data);
              setStep('details');
            }}
            className="mb-6"
          />
        </div>
      )}

      {/* Details Step - Recipient Information */}
      {step === 'details' && swapData && (
        <>
          {/* Compact Amount Summary */}
          <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-[#8e8e93] mb-1">Recipient gets</div>
              <div className="text-white font-bold text-lg">
                {swapData.currency === 'KES' ? 'KSh' : swapData.currency === 'NGN' ? '₦' : swapData.currency === 'GHS' ? 'GH₵' : 'USh'} {parseFloat(swapData.localAmount).toLocaleString()}
              </div>
              <div className="text-[#8e8e93] text-xs mt-0.5">
                ${parseFloat(swapData.usdcAmount).toFixed(4)} USDC
              </div>
            </div>
            <button
              onClick={() => setStep('swap')}
              className="px-3 py-1.5 bg-[#2c2c2e] hover:bg-[#3a3a3c] border border-[#3a3a3c] rounded-lg transition-all text-[#8e8e93] hover:text-white text-xs font-medium"
              title="Edit amount"
            >
              Edit
            </button>
          </div>

          <div className="space-y-4">
            {/* Enhanced Payment Method Selector - Phone, Till, and Paybill numbers */}
            <AdvancedSelector
              currency={swapData.currency}
              onPaymentMethodChange={setPaymentMethod}
              className="mb-4"
            />

            {/* Only show recipient name input for phone payments (not till or paybill) */}
            {paymentMethod?.type === 'phone' && (
              <FormInput
                label="Recipient Name"
                type="text"
                value={formData.accountName}
                onChange={(value) => setFormData(prev => ({ ...prev, accountName: value }))}
                placeholder="Business or person name"
                success={formData.accountName.length > 0}
              />
            )}

            <button
              onClick={() => setStep('payment')}
              disabled={
                (paymentMethod?.type === 'phone' && !formData.accountName) ||
                !paymentMethod ||
                !paymentMethod.formatted
              }
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 border border-blue-500 hover:border-blue-400 disabled:border-gray-600"
            >
              Continue to Payment
            </button>
          </div>
        </>
      )}

      {/* Payment Step */}
      {step === 'payment' && paymentMethod && swapData && (
        <div>
          {/* Payment Summary - Mobile Optimized */}
          <div className="space-y-3 mb-6">
            {/* Main Amount Card */}
            <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[#8e8e93] text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2 uppercase tracking-wider">Recipient receives</div>
                  <div className="text-white font-bold text-2xl sm:text-3xl tracking-tight break-words">
                    {swapData.currency === 'KES' ? 'KSh' : swapData.currency === 'NGN' ? '₦' : swapData.currency === 'GHS' ? 'GH₵' : 'USh'}{parseFloat(swapData.localAmount).toLocaleString()}
                  </div>
                  <div className="text-[#8e8e93] text-xs sm:text-sm mt-1 sm:mt-1.5 font-medium truncate">
                    {paymentMethod.type === 'till'
                      ? `Till ${paymentMethod.formatted}`
                      : paymentMethod.type === 'paybill'
                        ? `Paybill ${paymentMethod.formatted}${formData.paybillAccount ? ` · ${formData.paybillAccount}` : ''}`
                        : paymentMethod.formatted}
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-lg sm:text-xl">{swapData.currency === 'KES' ? '🇰🇪' : swapData.currency === 'NGN' ? '🇳🇬' : swapData.currency === 'GHS' ? '🇬🇭' : '🇺🇬'}</span>
                </div>
              </div>
            </div>

            {/* Transaction Breakdown */}
            <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-2xl p-3.5 sm:p-4">
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#2c2c2e] rounded-md flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#8e8e93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                    </div>
                    <span className="text-[#8e8e93] text-xs sm:text-sm truncate">You send</span>
                  </div>
                  <span className="text-white font-semibold text-xs sm:text-sm flex-shrink-0">${parseFloat(swapData.usdcAmount).toFixed(4)}</span>
                </div>

                <div className="h-px bg-[#3a3a3c]"></div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#2c2c2e] rounded-md flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#8e8e93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="text-[#8e8e93] text-xs sm:text-sm truncate">Rate</span>
                  </div>
                  <span className="text-white font-semibold text-xs sm:text-sm flex-shrink-0">1 USDC = {swapData.rate.toFixed(2)}</span>
                </div>

                <div className="h-px bg-[#3a3a3c]"></div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#2c2c2e] rounded-md flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#8e8e93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-[#8e8e93] text-xs sm:text-sm truncate">Service fee</span>
                  </div>
                  <span className="text-white font-semibold text-xs sm:text-sm flex-shrink-0">${(parseFloat(swapData.usdcAmount) * 0.01).toFixed(4)}</span>
                </div>

                <div className="h-px bg-[#3a3a3c]"></div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500/10 rounded-md flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-[#8e8e93] text-xs sm:text-sm truncate">Gas fee</span>
                  </div>
                  <span className="text-green-500 font-semibold text-xs sm:text-sm flex-shrink-0">Free (saves ~$0.08)</span>
                </div>
              </div>
            </div>
          </div>

          {/* KES/GHS/UGX - Pretium provider */}
          {(swapData.currency === 'KES' || swapData.currency === 'GHS' || swapData.currency === 'UGX') ? (
            useBlockradarPayment && user?.blockradarAddressId ? (
              <BlockradarPaymentProcessor
                amount={swapData.usdcAmount}
                phoneNumber={paymentMethod.type === 'phone' ? paymentMethod.formatted : undefined}
                tillNumber={paymentMethod.type === 'till' ? paymentMethod.formatted : undefined}
                accountName={
                  paymentMethod.type === 'paybill'
                    ? `Paybill ${paymentMethod.formatted}`
                    : paymentMethod.type === 'till'
                    ? `Till ${paymentMethod.formatted}`
                    : formData.accountName
                }
                currency={swapData.currency}
                blockradarAddressId={user.blockradarAddressId}
                rate={swapData.rate}
                onSuccess={(txCode) => {
                  setTransactionData({ transactionCode: txCode });
                  setStep('success');
                }}
                onError={() => {
                  // Error handling managed by BlockradarPaymentProcessor
                }}
              />
            ) : (
              <PretiumPaymentProcessor
                amount={swapData.usdcAmount}
                phoneNumber={paymentMethod.type === 'phone' ? paymentMethod.formatted : undefined}
                tillNumber={paymentMethod.type === 'till' ? paymentMethod.formatted : undefined}
                paybillNumber={paymentMethod.type === 'paybill' ? paymentMethod.formatted : undefined}
                paybillAccount={paymentMethod.type === 'paybill' ? paymentMethod.paybillAccount : undefined}
                accountName={
                  paymentMethod.type === 'paybill'
                    ? `Paybill ${paymentMethod.formatted}`
                    : paymentMethod.type === 'till'
                    ? `Till ${paymentMethod.formatted}`
                    : formData.accountName
                }
                returnAddress={walletAddress || ''}
                rate={swapData.rate}
                currency={swapData.currency}
                onSuccess={(transactionCode, txHash) => {
                  setTransactionData({ transactionCode, txHash });
                  setStep('success');
                }}
                onError={() => {
                  // Error handling managed by PretiumPaymentProcessor
                }}
              />
            )
          ) : swapData.currency === 'NGN' ? (
            /* NGN - PayCrest provider */
            useBlockradarPayment && user?.blockradarAddressId ? (
              <BlockradarPaymentProcessor
                amount={swapData.usdcAmount}
                phoneNumber={paymentMethod.type === 'phone' ? paymentMethod.formatted : undefined}
                accountName={formData.accountName}
                currency={swapData.currency}
                blockradarAddressId={user.blockradarAddressId}
                rate={swapData.rate}
                onSuccess={() => setStep('success')}
                onError={() => {
                  // Error handling managed by BlockradarPaymentProcessor
                }}
              />
            ) : (
              <PaymentProcessor
                amount={swapData.usdcAmount}
                phoneNumber={paymentMethod.type === 'phone' ? paymentMethod.formatted : undefined}
                tillNumber={paymentMethod.type === 'till' ? paymentMethod.formatted : undefined}
                accountName={formData.accountName}
                currency={swapData.currency}
                returnAddress={walletAddress || ''}
                rate={swapData.rate}
                onSuccess={() => setStep('success')}
                onError={() => {
                  // Error handled by PaymentProcessor
                }}
              />
            )
          ) : null}

          <button
            onClick={() => setStep('details')}
            className="w-full mt-4 text-gray-400 hover:text-white py-2 transition-colors flex items-center justify-center gap-2 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Details
          </button>
        </div>
      )}

      {/* Success Step */}
      {step === 'success' && paymentMethod && swapData && (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>

          <p className="text-gray-300 text-sm">
            Your {swapData.currency} has been sent to {
              paymentMethod.type === 'till'
                ? `Till ${paymentMethod.formatted}`
                : paymentMethod.type === 'paybill'
                  ? `Paybill ${paymentMethod.formatted}${formData.paybillAccount ? ` - ${formData.paybillAccount}` : ''}`
                  : paymentMethod.formatted
            }
          </p>

          {/* Modern Receipt Component - Direct DB Integration */}
          {transactionData.transactionCode && (
            <div className="pt-4">
              <PretiumReceipt transactionCode={transactionData.transactionCode} />
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => {
                setStep('swap');
                setSwapData(null);
                setFormData({ accountName: '', paybillAccount: '' });
                setPaymentMethod(null);
                setTransactionData({});
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors border border-blue-500 hover:border-blue-400"
            >
              Make Another Payment
            </button>

            {/* Social Icons */}
            <div className="flex space-x-4 justify-center pt-2">
              <a
                href="https://x.com/_Minisend"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-black text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>

              <a
                href="https://t.me/minisendapp"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.47-1.82-1.19 1.14c-.13.13-.24.24-.5.24l.18-2.51 4.56-4.12c.2-.18-.04-.28-.31-.1L9.39 13.17l-2.43-.76c-.53-.17-.54-.53.11-.78l9.49-3.66c.44-.17.83.11.68.78z"/>
                </svg>
              </a>

              <a
                href="https://farcaster.xyz/miniapps/ZflAoR5O08hC/minisend"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 1000 1000">
                  <path d="M257.778 155.556H742.222V844.445H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.445H257.778V155.556Z"/>
                  <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.445H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"/>
                  <path d="M675.556 746.667C663.283 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.445H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}