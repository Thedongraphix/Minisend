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

  // Form state
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [formData, setFormData] = useState({
    amount: '',
    accountName: '',
    currency: 'KES' as 'KES' | 'NGN'
  });
  const [paymentMethod, setPaymentMethod] = useState<{
    type: 'phone' | 'till';
    value: string;
    formatted: string;
  } | null>(null);
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  console.log('Spend USDC wallet connection state:', { 
    address,
    isConnected,
    paymentMethod
  });

  // Fetch exchange rates (using 1 USDC to get the base rate)
  const fetchRate = async (fiatAmount: string, currency: string) => {
    if (!fiatAmount || parseFloat(fiatAmount) <= 0) {
      setCurrentRate(null);
      return;
    }
    
    setRateLoading(true);
    setRateError(null);
    
    try {
      // Use 1 USDC to get the base exchange rate
      const response = await fetch(`/api/paycrest/rates/USDC/1/${currency}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentRate(data.rate);
      } else {
        throw new Error(data.error || 'Failed to fetch rate');
      }
    } catch (error) {
      console.error('Rate fetch error:', error);
      setRateError(error instanceof Error ? error.message : 'Failed to fetch rate');
      // Set fallback rate for KES
      setCurrentRate(150.5);
    } finally {
      setRateLoading(false);
    }
  };

  // Auto-fetch rates when amount changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (formData.amount && formData.currency) {
        fetchRate(formData.amount, formData.currency);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(debounceTimer);
  }, [formData.amount, formData.currency]);

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
          <div className={`w-2 h-2 rounded-full ${step === 'form' ? 'bg-purple-500' : 'bg-purple-500'}`}></div>
          <div className={`w-8 h-0.5 ${step === 'payment' || step === 'success' ? 'bg-purple-500' : 'bg-gray-600'}`}></div>
          <div className={`w-2 h-2 rounded-full ${step === 'payment' ? 'bg-purple-500' : step === 'success' ? 'bg-purple-500' : 'bg-gray-600'}`}></div>
          <div className={`w-8 h-0.5 ${step === 'success' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
          <div className={`w-2 h-2 rounded-full ${step === 'success' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
          <span>Details</span>
          <span>Payment</span>
          <span>Complete</span>
        </div>
      </div>

      {/* USDC Balance */}
      <BalanceView />

      {/* Form Step */}
      {step === 'form' && (
        <>
          {/* Fiat Amount Banner */}
          {formData.amount && parseFloat(formData.amount) > 0 && (
            <div className="bg-black/95 backdrop-blur-sm border border-gray-600 rounded-2xl p-5 shadow-xl shadow-black/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-600/30 border border-purple-500/50 rounded-xl flex items-center justify-center">
                    <span className="text-purple-300 font-bold text-xl">{formData.currency === 'KES' ? 'KSh' : '₦'}</span>
                  </div>
                  <div>
                    <div className="text-white font-bold text-xl">
                      {parseFloat(formData.amount).toLocaleString()} {formData.currency}
                    </div>
                    <div className="text-gray-300 text-sm font-medium">
                      {rateLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Calculating USDC...</span>
                        </div>
                      ) : currentRate ? (
                        <span className="text-purple-300">≈ $${(parseFloat(formData.amount) / currentRate).toFixed(4)} USDC</span>
                      ) : rateError ? (
                        <span className="text-amber-300">Using fallback rate</span>
                      ) : (
                        <span className="text-gray-400">Rate unavailable</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Amount ({formData.currency})
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm"
              min="50"
              max="1000000"
              step="1"
            />
            
          </div>


          {/* Enhanced Payment Method Selector - Phone, Till, and Paybill numbers */}
          <AdvancedSelector
            currency={formData.currency}
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
            disabled={
              !formData.amount || 
              !formData.accountName ||
              !paymentMethod ||
              !paymentMethod.formatted
            }
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            Continue to Payment
          </button>
          </div>
        </>
      )}

      {/* Payment Step */}
      {step === 'payment' && paymentMethod && (
        <div>
          <div className="mb-6 p-6 bg-black/95 backdrop-blur-sm rounded-2xl border border-gray-600 shadow-xl shadow-black/60">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg">Payment Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-600/30">
                <span className="text-gray-300 font-medium">Paying</span>
                <span className="text-white font-semibold text-lg">{parseFloat(formData.amount).toLocaleString()} {formData.currency}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-600/30">
                <span className="text-gray-300 font-medium">USDC cost</span>
                <span className="text-purple-300 font-semibold">${currentRate ? (parseFloat(formData.amount) / currentRate).toFixed(4) : '...'} USDC</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-300 font-medium">To</span>
                <span className="text-white font-medium">
                  {paymentMethod.type === 'till' && `Till ${paymentMethod.formatted}`}
                  {paymentMethod.type === 'phone' && paymentMethod.formatted}
                </span>
              </div>
            </div>
          </div>

          <PaymentProcessor
            amount={currentRate ? (parseFloat(formData.amount) / currentRate).toFixed(4) : formData.amount}
            phoneNumber={paymentMethod.type === 'phone' ? paymentMethod.formatted : undefined}
            tillNumber={paymentMethod.type === 'till' ? paymentMethod.formatted : undefined}
            accountName={formData.accountName}
            currency={formData.currency}
            returnAddress={address || ''}
            rate={currentRate}
            onSuccess={() => setStep('success')}
            onError={(error) => {
              console.error('Payment error:', error);
              // Could show error message here
            }}
          />

          <button
            onClick={() => setStep('form')}
            className="w-full mt-4 text-gray-400 hover:text-white py-2 transition-colors"
          >
            ← Back to Form
          </button>
        </div>
      )}

      {/* Success Step */}
      {step === 'success' && paymentMethod && (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
          
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Your {formData.currency} has been sent to {paymentMethod.type === 'till' ? `Till ${paymentMethod.formatted}` : paymentMethod.formatted}
            </p>
            
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                setStep('form');
                setFormData({ amount: '', accountName: '', currency: 'KES' });
                setPaymentMethod(null);
                setCurrentRate(null);
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