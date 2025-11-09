"use client";

import { useState, useEffect, useCallback } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import { PaymentProcessor } from './PaymentProcessor';
import { BalanceView } from './BalanceView';
import { ConnectionHandler } from './ConnectionHandler';
import { Button } from './BaseComponents';
import Image from 'next/image';
import { trackOffRampEvent, trackWalletEvent } from '@/lib/analytics';
import { ReceiptSection } from './DownloadButton';
import { CurrencySwapInterface } from './CurrencySwapInterface';

interface ExchangeFlowProps {
  setActiveTab: (tab: string) => void;
}

export function ExchangeFlow({ setActiveTab }: ExchangeFlowProps) {
  const { context } = useMiniKit();
  const { address, isConnected } = useAccount();

  // MiniKit should work through wagmi automatically
  const hasWallet = isConnected && address;
  const walletAddress = address;
  const isMiniKitEnvironment = !!context?.user;
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track component mount
  useEffect(() => {
    if (mounted && context) {
      // Track offramp flow start
      trackOffRampEvent('flow_started', {
        step: 1,
        success: true,
      }, context || undefined);

      // Track wallet connection status for both MiniKit and manual connections
      if (hasWallet && walletAddress) {
        trackWalletEvent('wallet_connected_offramp', {
          address: walletAddress,
          success: true,
        }, context || undefined);
      }
    }
  }, [mounted, context, address, isConnected, hasWallet, walletAddress, isMiniKitEnvironment]);

  // Form state with new swap step
  const [step, setStep] = useState<'swap' | 'details' | 'payment' | 'success'>('swap');
  const [swapData, setSwapData] = useState<{
    usdcAmount: string;
    localAmount: string;
    currency: 'KES' | 'NGN';
    rate: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    accountNumber: '',
    bankCode: '',
    accountName: '',
  });
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [accountVerified, setAccountVerified] = useState(false);
  const [institutions, setInstitutions] = useState<{code: string, name: string, type: string}[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  // Fetch institutions for NGN
  const fetchInstitutions = async (currency: string) => {
    setLoadingInstitutions(true);
    try {
      const response = await fetch(`/api/paycrest/institutions/${currency}`);
      const data = await response.json();
      
      if (data.success) {
        setInstitutions(data.institutions || []);
      }
    } catch {
      // Error fetching institutions - will show empty list
    } finally {
      setLoadingInstitutions(false);
    }
  };

  // Verify account for NGN
  const verifyAccount = useCallback(async (accountNumber: string, bankCode: string) => {
    if (!accountNumber || !bankCode) return;
    
    setVerifyingAccount(true);
    try {
      const response = await fetch('/api/paycrest/verify-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountNumber,
          bankCode
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Set the account name from PayCrest's response if user hasn't entered one
        if (!formData.accountName && data.accountName && data.accountName !== 'OK') {
          setFormData(prev => ({ ...prev, accountName: data.accountName }));
        }
        setAccountVerified(true);
      } else {
        setAccountVerified(false);
        throw new Error(data.error || 'Account verification failed');
      }
    } catch {
      setAccountVerified(false);
    } finally {
      setVerifyingAccount(false);
    }
  }, [formData.accountName]);

  // Check if account number format is valid (10+ digits for Nigerian banks)
  const isAccountNumberValid = formData.accountNumber.length >= 10 && 
    formData.accountNumber.length <= 12 && 
    /^\d+$/.test(formData.accountNumber);
  

  // Auto-verify account when account number and bank code are provided and format is valid
  useEffect(() => {
    if (swapData && swapData.currency === 'NGN' && formData.bankCode && isAccountNumberValid && !accountVerified) {
      const debounceTimer = setTimeout(() => {
        verifyAccount(formData.accountNumber, formData.bankCode);
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(debounceTimer);
    } else if (swapData && swapData.currency === 'NGN' && formData.accountNumber && !isAccountNumberValid) {
      // Reset verification state if account number becomes invalid
      setAccountVerified(false);
      setFormData(prev => ({ ...prev, accountName: '' }));
    }
  }, [formData.accountNumber, formData.bankCode, swapData, isAccountNumberValid, accountVerified, verifyAccount]);

  // Fetch institutions when step changes to details with NGN
  useEffect(() => {
    if (step === 'details' && swapData && swapData.currency === 'NGN') {
      fetchInstitutions('NGN');
    }
  }, [step, swapData]);

  // Track step changes
  useEffect(() => {
    if (!swapData) return;

    trackOffRampEvent('step_changed', {
      step: step === 'swap' ? 1 : step === 'details' ? 2 : step === 'payment' ? 3 : 4,
      currency: swapData.currency,
      amount: parseFloat(swapData.localAmount) || 0,
    }, context || undefined);
  }, [step, swapData, context]);

  // Show wallet connection if not connected or not mounted
  // For MiniKit users, auto-detect wallet from context
  if (!mounted || !hasWallet) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-blue-600 border border-blue-500 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MiniSend</h1>
          <p className="text-gray-300">Send money to mobile wallets</p>
        </div>

        <ConnectionHandler showBalance={false} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 overflow-visible">
      {/* Profile Button - Top Right */}
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

      {/* USDC Balance - Hide only on payment step */}
      {step !== 'payment' && <BalanceView />}

      {/* Swap Step - New Premium Interface */}
      {step === 'swap' && (
        <div className="overflow-visible">
          <CurrencySwapInterface
            onContinue={(data) => {
              setSwapData(data);

              trackOffRampEvent('swap_completed', {
                currency: data.currency,
                amount: parseFloat(data.localAmount),
                usdcAmount: parseFloat(data.usdcAmount),
                rate: data.rate,
                step: 1,
                success: true,
              }, context || undefined);

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
          <div className="bg-blue-600/10 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-5 shadow-xl mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-blue-600 border border-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">{swapData.currency === 'KES' ? 'KSh' : '₦'}</span>
                </div>
                <div>
                  <div className="text-white font-bold text-2xl">
                    {parseFloat(swapData.localAmount).toLocaleString()} {swapData.currency}
                  </div>
                  <div className="text-blue-300 text-sm font-semibold">
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
          {/* Conditional input fields based on currency */}
          {swapData.currency === 'KES' ? (
            <>
              <div>
                <label className="block text-white text-sm font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+254712345678"
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Account Name</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                  placeholder="Your legal name"
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-white text-sm font-medium mb-2">Bank</label>
                <div className="relative">
                  <select
                    value={formData.bankCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankCode: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800/80 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none cursor-pointer hover:bg-gray-800 backdrop-blur-sm"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '16px'
                    }}
                    disabled={loadingInstitutions}
                  >
                    <option value="" className="bg-gray-800 text-gray-300">
                      {loadingInstitutions ? "Loading banks..." : "Select Bank"}
                    </option>
                    {institutions.map((institution) => (
                      <option 
                        key={institution.code} 
                        value={institution.code}
                        className="bg-gray-800 text-white hover:bg-gray-700 py-2 px-4"
                      >
                        {institution.name}
                      </option>
                    ))}
                  </select>
                  {loadingInstitutions && (
                    <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {loadingInstitutions && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-400">Loading Nigerian banks...</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Account Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="1234567890 (minimum 10 digits)"
                    className={`w-full px-4 py-3 pr-12 bg-gray-800/80 border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-blue-500 transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm ${
                      formData.accountNumber && isAccountNumberValid 
                        ? 'border-green-500 focus:ring-green-500' 
                        : formData.accountNumber && !isAccountNumberValid
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-600 focus:ring-blue-500'
                    }`}
                    disabled={verifyingAccount}
                  />
                  {/* Status indicators */}
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    {verifyingAccount ? (
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : isAccountNumberValid && formData.accountNumber ? (
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : formData.accountNumber && formData.accountNumber.length > 0 && !isAccountNumberValid ? (
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : null}
                  </div>
                </div>
                {/* Validation helper text */}
                {formData.accountNumber && formData.accountNumber.length > 0 && formData.accountNumber.length < 10 && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">!</span>
                    </div>
                    <span className="text-xs text-amber-400">Account number must be at least 10 digits</span>
                  </div>
                )}
                
                {verifyingAccount && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-400">Verifying account with bank...</span>
                  </div>
                )}
                
                {accountVerified && formData.accountName && !verifyingAccount && (
                  <div className="mt-2 p-4 bg-black/95 border border-green-600/60 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-green-300 font-semibold text-sm">Account Verified</div>
                        <div className="text-white font-medium text-sm">{formData.accountName}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => {
              // Track details completion
              trackOffRampEvent('details_completed', {
                currency: swapData.currency,
                amount: parseFloat(swapData.localAmount),
                usdcAmount: parseFloat(swapData.usdcAmount),
                rate: swapData.rate,
                step: 2,
                success: true,
              }, context || undefined);

              setStep('payment');
            }}
            disabled={
              !formData.accountName ||
              (swapData.currency === 'KES' && !formData.phoneNumber) ||
              (swapData.currency === 'NGN' && (!formData.accountNumber || !formData.bankCode || !accountVerified))
            }
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 border border-blue-500 hover:border-blue-400 disabled:border-gray-600"
          >
            Continue to Payment
          </button>
          </div>
        </>
      )}

      {/* Payment Step */}
      {step === 'payment' && swapData && (
        <div>
          <div className="mb-6 p-6 bg-black/95 backdrop-blur-xl rounded-2xl border border-gray-700 shadow-2xl">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 border border-blue-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-white font-bold text-lg">Payment Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-700/40">
                <span className="text-gray-300 font-medium">You&apos;ll receive</span>
                <span className="text-white font-bold text-lg">{parseFloat(swapData.localAmount).toLocaleString()} {swapData.currency}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-700/40">
                <span className="text-gray-300 font-medium">USDC cost</span>
                <span className="text-blue-300 font-bold text-lg">${parseFloat(swapData.usdcAmount).toFixed(4)} USDC</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-300 font-medium">To</span>
                <span className="text-white font-semibold">
                  {swapData.currency === 'KES' ? formData.phoneNumber : formData.accountName}
                </span>
              </div>
            </div>
          </div>

          <PaymentProcessor
            amount={swapData.usdcAmount}
            phoneNumber={formData.phoneNumber}
            accountNumber={formData.accountNumber}
            bankCode={formData.bankCode}
            accountName={formData.accountName}
            currency={swapData.currency}
            returnAddress={walletAddress || ''}
            rate={swapData.rate}
            onSuccess={() => {
              trackOffRampEvent('payment_completed', {
                currency: swapData.currency,
                amount: parseFloat(swapData.localAmount),
                usdcAmount: parseFloat(swapData.usdcAmount),
                rate: swapData.rate,
                phoneNumber: formData.phoneNumber,
                accountNumber: formData.accountNumber,
                bankCode: formData.bankCode,
                step: 3,
                success: true,
              }, context || undefined);

              setStep('success');
            }}
            onError={(error) => {
              trackOffRampEvent('payment_error', {
                currency: swapData.currency,
                amount: parseFloat(swapData.localAmount),
                usdcAmount: parseFloat(swapData.usdcAmount),
                rate: swapData.rate,
                error: error,
                step: 3,
                success: false,
              }, context || undefined);
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
      {step === 'success' && swapData && (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>

          <p className="text-gray-300 text-sm">
            Your {swapData.currency} has been sent to {swapData.currency === 'KES' ? formData.phoneNumber : formData.accountName}
          </p>

          {/* Receipt Download Section */}
          <ReceiptSection
            orderData={{
              id: `order_${Date.now()}`,
              amount_in_usdc: parseFloat(swapData.usdcAmount),
              amount_in_local: parseFloat(swapData.localAmount),
              local_currency: swapData.currency,
              account_name: formData.accountName,
              phone_number: formData.phoneNumber,
              account_number: formData.accountNumber,
              bank_code: formData.bankCode,
              wallet_address: walletAddress || '',
              rate: swapData.rate,
              sender_fee: 0,
              transaction_fee: 0,
              status: 'completed',
              created_at: new Date().toISOString(),
            }}
            className="mt-6"
          />
          
          <div className="space-y-4">
            
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
