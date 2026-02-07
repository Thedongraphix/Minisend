"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { PaymentProcessor } from './PaymentProcessor';
import { PretiumPaymentProcessor } from './PretiumPaymentProcessor';
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
  const { minisendWallet } = useMinisendAuth();

  // User can proceed if they have a wagmi wallet OR a minisend wallet (email auth)
  const hasWallet = isConnected || !!minisendWallet;

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
          className="w-10 h-10 rounded-full bg-[#1d1e22] hover:bg-[#252629] border border-white/[0.08] flex items-center justify-center transition-all duration-200 mb-6"
          title="Go back"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Spend USDC</h1>
          <p className="text-gray-400 text-sm mb-6">Pay till numbers and paybills with USDC</p>
          <p className="text-gray-500 text-xs">Connect your wallet to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Back Button and Profile Button */}
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
        <h2 className="text-2xl font-bold text-white mb-2">Spend USDC</h2>
        <p className="text-gray-300 text-sm mb-4">Pay till numbers and paybills with USDC</p>
        
        <div className="inline-flex items-center space-x-2 text-xs text-purple-300 bg-purple-500/10 px-3 py-1 rounded-xl mt-2 border border-purple-400/20">
          <Image src="/Base_Network_Logo.svg" alt="Base Network" width={12} height={12} />
          <span className="font-medium">Powered by Base</span>
        </div>
        
        {/* Step Progress Indicator */}
        <div className="flex items-center justify-center space-x-2 mt-4">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === 'swap' ? 'bg-purple-500 scale-125' : 'bg-purple-500'}`}></div>
          <div className={`w-6 h-0.5 transition-all duration-300 ${step === 'details' || step === 'payment' || step === 'success' ? 'bg-purple-500' : 'bg-gray-600'}`}></div>
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === 'details' ? 'bg-purple-500 scale-125' : step === 'payment' || step === 'success' ? 'bg-purple-500' : 'bg-gray-600'}`}></div>
          <div className={`w-6 h-0.5 transition-all duration-300 ${step === 'payment' || step === 'success' ? 'bg-purple-500' : 'bg-gray-600'}`}></div>
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === 'payment' ? 'bg-purple-500 scale-125' : step === 'success' ? 'bg-purple-500' : 'bg-gray-600'}`}></div>
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

      {/* USDC Balance */}
      <BalanceView />

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
          {/* Conversion Summary Card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden mb-6">
            {/* You pay */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest mb-1">You pay</p>
                  <p className="text-white text-2xl font-bold tracking-tight">${parseFloat(swapData.usdcAmount).toFixed(4)}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                  <Image src="/usdc.svg" alt="USDC" width={18} height={18} />
                  <span className="text-white text-xs font-semibold">USDC</span>
                </div>
              </div>
            </div>

            {/* Divider with arrow */}
            <div className="relative px-5">
              <div className="h-px bg-white/[0.06]" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#1d1e22] border border-white/[0.08] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>

            {/* Recipient gets */}
            <div className="px-5 pt-3 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest mb-1">Recipient gets</p>
                  <p className="text-white text-2xl font-bold tracking-tight">
                    {swapData.currency === 'KES' ? 'KSh' : swapData.currency === 'NGN' ? '₦' : swapData.currency === 'GHS' ? 'GH₵' : 'USh'} {parseFloat(swapData.localAmount).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                  <span className="text-sm">{swapData.currency === 'KES' ? '🇰🇪' : swapData.currency === 'NGN' ? '🇳🇬' : swapData.currency === 'GHS' ? '🇬🇭' : '🇺🇬'}</span>
                  <span className="text-white text-xs font-semibold">{swapData.currency}</span>
                </div>
              </div>
            </div>

            {/* Rate + Edit footer */}
            <div className="px-5 py-3 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between">
              <p className="text-gray-500 text-[11px] font-medium">1 USDC = {swapData.rate.toFixed(2)} {swapData.currency}</p>
              <button
                onClick={() => setStep('swap')}
                className="text-[#8b53ff] text-[11px] font-semibold hover:text-[#a370ff] transition-colors"
              >
                Edit
              </button>
            </div>
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
              className="w-full bg-[#8b53ff] hover:bg-[#7a47e6] disabled:bg-white/[0.06] disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 active:scale-[0.98]"
            >
              Continue to Payment
            </button>
          </div>
        </>
      )}

      {/* Payment Step */}
      {step === 'payment' && paymentMethod && swapData && (
        <div>
          {/* Payment Summary */}
          <div className="space-y-3 mb-6">
            {/* Conversion card */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* You pay */}
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest mb-1">You pay</p>
                    <p className="text-white text-2xl font-bold tracking-tight">${parseFloat(swapData.usdcAmount).toFixed(4)}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                    <Image src="/usdc.svg" alt="USDC" width={18} height={18} />
                    <span className="text-white text-xs font-semibold">USDC</span>
                  </div>
                </div>
              </div>

              {/* Divider with arrow */}
              <div className="relative px-5">
                <div className="h-px bg-white/[0.06]" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#1d1e22] border border-white/[0.08] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* Recipient gets */}
              <div className="px-5 pt-3 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest mb-1">Recipient gets</p>
                    <p className="text-white text-2xl font-bold tracking-tight">
                      {swapData.currency === 'KES' ? 'KSh' : swapData.currency === 'NGN' ? '₦' : swapData.currency === 'GHS' ? 'GH₵' : 'USh'} {parseFloat(swapData.localAmount).toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs mt-1 truncate">
                      {paymentMethod.type === 'till'
                        ? `Till ${paymentMethod.formatted}`
                        : paymentMethod.type === 'paybill'
                          ? `Paybill ${paymentMethod.formatted}${formData.paybillAccount ? ` · ${formData.paybillAccount}` : ''}`
                          : paymentMethod.formatted}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                    <span className="text-sm">{swapData.currency === 'KES' ? '🇰🇪' : swapData.currency === 'NGN' ? '🇳🇬' : swapData.currency === 'GHS' ? '🇬🇭' : '🇺🇬'}</span>
                    <span className="text-white text-xs font-semibold">{swapData.currency}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-5 py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Exchange rate</span>
                  <span className="text-white text-xs font-medium">1 USDC = {swapData.rate.toFixed(2)} {swapData.currency}</span>
                </div>
                <div className="h-px bg-white/[0.05]" />
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Service fee (1%)</span>
                  <span className="text-white text-xs font-medium">${(parseFloat(swapData.usdcAmount) * 0.01).toFixed(4)}</span>
                </div>
                <div className="h-px bg-white/[0.05]" />
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Network fee</span>
                  <span className="text-green-400 text-xs font-medium">Free</span>
                </div>
              </div>
            </div>
          </div>

          {swapData.currency === 'KES' ? (
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
              returnAddress={address || ''}
              rate={swapData.rate}
              currency={swapData.currency}
              onSuccess={(transactionCode, txHash) => {
                setTransactionData({ transactionCode, txHash });
                setStep('success');
                // Receipt readiness polling is now handled by useReceiptReadiness hook
              }}
              onError={() => {
                // Error handling managed by PretiumPaymentProcessor
              }}
            />
          ) : (
            <PaymentProcessor
              amount={swapData.usdcAmount}
              phoneNumber={paymentMethod.type === 'phone' ? paymentMethod.formatted : undefined}
              tillNumber={paymentMethod.type === 'till' ? paymentMethod.formatted : undefined}
              accountName={formData.accountName}
              currency={swapData.currency}
              returnAddress={address || ''}
              rate={swapData.rate}
              onSuccess={() => setStep('success')}
              onError={() => {
                // Error handled by PaymentProcessor
              }}
            />
          )}

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

          <div className="space-y-3">
            <button
              onClick={() => {
                setStep('swap');
                setSwapData(null);
                setFormData({ accountName: '', paybillAccount: '' });
                setPaymentMethod(null);
                setTransactionData({});
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
            >
              Make Another Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}