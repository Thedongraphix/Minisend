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

  // Currency symbol helper
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'KES': return 'KSh';
      case 'NGN': return '₦';
      case 'GHS': return 'GH₵';
      case 'UGX': return 'USh';
      default: return '';
    }
  };

  const getCurrencyFlag = (currency: string) => {
    switch (currency) {
      case 'KES': return '🇰🇪';
      case 'NGN': return '🇳🇬';
      case 'GHS': return '🇬🇭';
      case 'UGX': return '🇺🇬';
      default: return '';
    }
  };

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

      {/* ─── SWAP STEP ─── */}
      {step === 'swap' && (
        <div className="overflow-visible mt-5">
          <CurrencySwapInterface
            onContinue={(data) => {
              setSwapData(data);
              setStep('details');
            }}
            className="mb-6"
          />
        </div>
      )}

      {/* ─── DETAILS STEP ─── */}
      {step === 'details' && swapData && (
        <div className="space-y-4 mt-5 animate-ios-reveal">
          {/* Conversion Summary */}
          <div className="bg-[#1c1c1e] rounded-2xl border border-[#2c2c2e]">
            {/* You send row */}
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/usdc.svg" alt="USDC" width={36} height={36} className="rounded-full" />
                <div>
                  <p className="text-[13px] text-[#8e8e93]">You send</p>
                  <p className="text-white text-[18px] font-semibold tracking-tight">
                    {parseFloat(swapData.usdcAmount).toFixed(2)} <span className="text-[#8e8e93] text-[15px] font-normal">USDC</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep('swap')}
                className="text-[#007AFF] text-[15px] font-medium active:opacity-50 transition-opacity"
              >
                Edit
              </button>
            </div>

            {/* Divider with arrow */}
            <div className="relative px-4">
              <div className="h-px bg-[#2c2c2e]" />
              <div className="absolute left-7 -top-2.5 w-5 h-5 bg-[#1c1c1e] border border-[#2c2c2e] rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-[#8e8e93]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>

            {/* They receive row */}
            <div className="px-4 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2c2c2e] flex items-center justify-center text-[20px] leading-none">
                {getCurrencyFlag(swapData.currency)}
              </div>
              <div>
                <p className="text-[13px] text-[#8e8e93]">Recipient gets</p>
                <p className="text-white text-[18px] font-semibold tracking-tight">
                  {getCurrencySymbol(swapData.currency)} {parseFloat(swapData.localAmount).toLocaleString()} <span className="text-[#8e8e93] text-[15px] font-normal">{swapData.currency}</span>
                </p>
              </div>
            </div>

            {/* Rate footer */}
            <div className="px-4 py-3 bg-[#161618] rounded-b-2xl flex items-center justify-between">
              <span className="text-[13px] text-[#636366]">1 USDC = {swapData.rate.toFixed(2)} {swapData.currency}</span>
              <span className="text-[13px] text-[#34C759]">No gas fees</span>
            </div>
          </div>

          {/* Recipient Form Section */}
          <div className="space-y-4">
            {/* Enhanced Payment Method Selector */}
            <AdvancedSelector
              currency={swapData.currency}
              onPaymentMethodChange={setPaymentMethod}
              className="mb-2"
            />

            {/* Recipient name input for phone payments */}
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

            {/* iOS-style primary action button */}
            <button
              onClick={() => setStep('payment')}
              disabled={
                (paymentMethod?.type === 'phone' && !formData.accountName) ||
                !paymentMethod ||
                !paymentMethod.formatted
              }
              className="w-full bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#0064CC] disabled:bg-white/[0.06] disabled:text-[#48484A] text-white font-semibold text-[17px] py-[14px] px-6 rounded-[14px] transition-all duration-200 active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ─── PAYMENT STEP ─── */}
      {step === 'payment' && paymentMethod && swapData && (
        <div className="animate-ios-reveal">
          {/* Payment Summary - iOS Grouped Style */}
          <div className="space-y-3 mb-6">
            {/* Hero Amount Card */}
            <div className="ios-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#98989F] font-medium uppercase tracking-wider mb-2">Recipient receives</p>
                  <p className="text-white font-bold text-[32px] tracking-tight leading-none mb-1.5">
                    {getCurrencySymbol(swapData.currency)}{parseFloat(swapData.localAmount).toLocaleString()}
                  </p>
                  <p className="text-[#98989F] text-[13px] font-medium truncate">
                    {paymentMethod.type === 'till'
                      ? `Till ${paymentMethod.formatted}`
                      : paymentMethod.type === 'paybill'
                        ? `Paybill ${paymentMethod.formatted}${formData.paybillAccount ? ` · ${formData.paybillAccount}` : ''}`
                        : paymentMethod.formatted}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/[0.06] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">{getCurrencyFlag(swapData.currency)}</span>
                </div>
              </div>
            </div>

            {/* Transaction Details Card - iOS Grouped List */}
            <div className="ios-card rounded-2xl overflow-hidden">
              {/* You send */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white/[0.06] rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#98989F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-[#98989F]">You send</span>
                </div>
                <span className="text-[15px] text-white font-semibold">${parseFloat(swapData.usdcAmount).toFixed(4)}</span>
              </div>

              <div className="h-px bg-white/[0.04] ml-14" />

              {/* Rate */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white/[0.06] rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#98989F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-[#98989F]">Rate</span>
                </div>
                <span className="text-[15px] text-white font-semibold">1 USDC = {swapData.rate.toFixed(2)}</span>
              </div>

              <div className="h-px bg-white/[0.04] ml-14" />

              {/* Service fee */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white/[0.06] rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#98989F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-[#98989F]">Service fee</span>
                </div>
                <span className="text-[15px] text-white font-semibold">${(parseFloat(swapData.usdcAmount) * 0.01).toFixed(4)}</span>
              </div>

              <div className="h-px bg-white/[0.04] ml-14" />

              {/* Gas fee */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-[#34C759]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#34C759]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-[#98989F]">Gas fee</span>
                </div>
                <span className="text-[15px] text-[#34C759] font-semibold">Free</span>
              </div>
            </div>
          </div>

          {/* KES/GHS/UGX - Pretium provider */}
          {(swapData.currency === 'KES' || swapData.currency === 'GHS' || swapData.currency === 'UGX') ? (
            useBlockradarPayment && user?.blockradarAddressId ? (
              <BlockradarPaymentProcessor
                amount={swapData.usdcAmount}
                localAmount={swapData.localAmount}
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
                walletAddress={walletAddress || ''}
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
                localAmount={swapData.localAmount}
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
                walletAddress={walletAddress || ''}
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

          {/* iOS-style back link */}
          <button
            onClick={() => setStep('details')}
            className="w-full mt-5 flex items-center justify-center gap-1 text-[#007AFF] text-[15px] font-medium py-2 active:opacity-60 transition-opacity group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Details
          </button>
        </div>
      )}

      {/* ─── SUCCESS STEP ─── */}
      {step === 'success' && paymentMethod && swapData && (
        <div className="text-center pt-6 animate-ios-reveal">
          {/* iOS-style success checkmark */}
          <div className="relative w-20 h-20 mx-auto mb-6 animate-ios-spring">
            <div className="absolute inset-0 rounded-full bg-[#34C759]" />
            <svg className="absolute inset-0 w-20 h-20" viewBox="0 0 80 80" fill="none">
              <path
                d="M24 42L35 53L56 28"
                stroke="white"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-checkmark"
                style={{ strokeDasharray: 48, strokeDashoffset: 0 }}
              />
            </svg>
          </div>

          <h2 className="text-[24px] font-bold text-white tracking-tight mb-2">Payment Successful</h2>

          <p className="text-[#98989F] text-[15px] leading-relaxed mb-6 px-4">
            {getCurrencySymbol(swapData.currency)} {parseFloat(swapData.localAmount).toLocaleString()} sent to{' '}
            {paymentMethod.type === 'till'
              ? `Till ${paymentMethod.formatted}`
              : paymentMethod.type === 'paybill'
                ? `Paybill ${paymentMethod.formatted}${formData.paybillAccount ? ` · ${formData.paybillAccount}` : ''}`
                : paymentMethod.formatted}
          </p>

          {/* Receipt Component */}
          {transactionData.transactionCode && (
            <div className="mb-6">
              <PretiumReceipt transactionCode={transactionData.transactionCode} />
            </div>
          )}

          <div className="space-y-3">
            {/* Primary action */}
            <button
              onClick={() => {
                setStep('swap');
                setSwapData(null);
                setFormData({ accountName: '', paybillAccount: '' });
                setPaymentMethod(null);
                setTransactionData({});
              }}
              className="w-full bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#0064CC] text-white font-semibold text-[17px] py-[14px] px-6 rounded-[14px] transition-all duration-200 active:scale-[0.98]"
            >
              Make Another Payment
            </button>

            {/* Social Icons - iOS style */}
            <div className="flex items-center justify-center gap-3 pt-3">
              <a
                href="https://x.com/_Minisend"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.10] active:bg-white/[0.04] rounded-full transition-colors"
              >
                <svg className="w-[18px] h-[18px] text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>

              <a
                href="https://t.me/minisendapp"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.10] active:bg-white/[0.04] rounded-full transition-colors"
              >
                <svg className="w-[18px] h-[18px] text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.47-1.82-1.19 1.14c-.13.13-.24.24-.5.24l.18-2.51 4.56-4.12c.2-.18-.04-.28-.31-.1L9.39 13.17l-2.43-.76c-.53-.17-.54-.53.11-.78l9.49-3.66c.44-.17.83.11.68.78z"/>
                </svg>
              </a>

              <a
                href="https://farcaster.xyz/miniapps/ZflAoR5O08hC/minisend"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.10] active:bg-white/[0.04] rounded-full transition-colors"
              >
                <svg className="w-[18px] h-[18px] text-white" fill="currentColor" viewBox="0 0 1000 1000">
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
