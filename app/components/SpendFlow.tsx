"use client";

import { useState, useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import { PaymentProcessor } from './PaymentProcessor';
import { BalanceView } from './BalanceView';
import { ConnectionHandler } from './ConnectionHandler';
import { AdvancedSelector } from './AdvancedSelector';
import { Button } from './BaseComponents';
import Image from 'next/image';
import { CurrencySwapInterface } from './CurrencySwapInterface';

interface SpendFlowProps {
  setActiveTab: (tab: string) => void;
}

export function SpendFlow({ setActiveTab }: SpendFlowProps) {
  const { context } = useMiniKit();
  const { address, isConnected } = useAccount();
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Log environment information for debugging
  useEffect(() => {
    if (mounted && context) {
      console.log('Spend USDC MiniKit Environment:', {
        clientFid: context.user?.fid,
        location: context.location,
        address,
        isConnected
      });
    }
  }, [mounted, context, address, isConnected]);

  // Form state with new swap step
  const [step, setStep] = useState<'swap' | 'details' | 'payment' | 'success'>('swap');
  const [swapData, setSwapData] = useState<{
    usdcAmount: string;
    localAmount: string;
    currency: 'KES' | 'NGN';
    rate: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    accountName: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<{
    type: 'phone' | 'till';
    value: string;
    formatted: string;
  } | null>(null);

  console.log('Spend USDC wallet connection state:', {
    address,
    isConnected,
    paymentMethod
  });

  // Show wallet connection if not connected or not mounted
  if (!mounted || !isConnected) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Spend USDC</h1>
          <p className="text-gray-300">Pay businesses with till numbers</p>
        </div>

        <ConnectionHandler showBalance={false} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Back Button and Profile Button */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setActiveTab('home')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to Home</span>
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
        <p className="text-gray-300 text-sm mb-4">Pay till numbers with USDC</p>
        
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
          {/* Amount Summary Banner */}
          <div className="bg-purple-600/10 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-5 shadow-xl mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-purple-600 border border-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">{swapData.currency === 'KES' ? 'KSh' : '₦'}</span>
                </div>
                <div>
                  <div className="text-white font-bold text-2xl">
                    {parseFloat(swapData.localAmount).toLocaleString()} {swapData.currency}
                  </div>
                  <div className="text-purple-300 text-sm font-semibold">
                    ≈ ${parseFloat(swapData.usdcAmount).toFixed(4)} USDC
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStep('swap')}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                title="Edit amount"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
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

            <div>
              <label className="block text-white text-sm font-medium mb-2">Recipient Name</label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                placeholder="Business or person name"
                className="w-full px-4 py-3 bg-gray-800/80 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm"
              />
            </div>

            <button
              onClick={() => setStep('payment')}
              disabled={!formData.accountName || !paymentMethod || !paymentMethod.formatted}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 border border-purple-500 hover:border-purple-400 disabled:border-gray-600"
            >
              Continue to Payment
            </button>
          </div>
        </>
      )}

      {/* Payment Step */}
      {step === 'payment' && paymentMethod && swapData && (
        <div>
          <div className="mb-6 p-6 bg-black/95 backdrop-blur-xl rounded-2xl border border-gray-700 shadow-2xl">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-purple-600 border border-purple-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-white font-bold text-lg">Payment Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-700/40">
                <span className="text-gray-300 font-medium">You&apos;ll pay</span>
                <span className="text-white font-bold text-lg">{parseFloat(swapData.localAmount).toLocaleString()} {swapData.currency}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-700/40">
                <span className="text-gray-300 font-medium">USDC cost</span>
                <span className="text-purple-300 font-bold text-lg">${parseFloat(swapData.usdcAmount).toFixed(4)} USDC</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-300 font-medium">To</span>
                <span className="text-white font-semibold">
                  {paymentMethod.type === 'till' && `Till ${paymentMethod.formatted}`}
                  {paymentMethod.type === 'phone' && paymentMethod.formatted}
                </span>
              </div>
            </div>
          </div>

          <PaymentProcessor
            amount={swapData.usdcAmount}
            phoneNumber={paymentMethod.type === 'phone' ? paymentMethod.formatted : undefined}
            tillNumber={paymentMethod.type === 'till' ? paymentMethod.formatted : undefined}
            accountName={formData.accountName}
            currency={swapData.currency}
            returnAddress={address || ''}
            rate={swapData.rate}
            onSuccess={() => setStep('success')}
            onError={(error) => {
              console.error('Payment error:', error);
            }}
          />

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
            Your {swapData.currency} has been sent to {paymentMethod.type === 'till' ? `Till ${paymentMethod.formatted}` : paymentMethod.formatted}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setStep('swap');
                setSwapData(null);
                setFormData({ accountName: '' });
                setPaymentMethod(null);
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