"use client";

import { useState, useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import { SimpleUSDCPayment } from './SimpleUSDCPayment';
import { DirectUSDCBalance } from './DirectUSDCBalance';
import { MobileWalletHandler } from './MobileWalletHandler';
import Image from 'next/image';

export function SimpleOffRampFlow() {
  const { context } = useMiniKit();
  const { address, isConnected } = useAccount();
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Log environment information for debugging
  useEffect(() => {
    if (mounted && context) {
      console.log('MiniKit Environment:', {
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
    phoneNumber: '',
    accountNumber: '',
    bankCode: '',
    accountName: '',
    currency: 'KES' as 'KES' | 'NGN'
  });
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [accountVerified, setAccountVerified] = useState(false);
  const [institutions, setInstitutions] = useState<{code: string, name: string, type: string}[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  console.log('Wallet connection state:', { 
    address,
    isConnected
  });

  // Fetch exchange rates
  const fetchRate = async (amount: string, currency: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setCurrentRate(null);
      return;
    }
    
    setRateLoading(true);
    setRateError(null);
    
    try {
      const response = await fetch(`/api/paycrest/rates/USDC/${amount}/${currency}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentRate(data.rate);
      } else {
        throw new Error(data.error || 'Failed to fetch rate');
      }
    } catch (error) {
      console.error('Rate fetch error:', error);
      setRateError(error instanceof Error ? error.message : 'Failed to fetch rate');
      // Set fallback rates
      setCurrentRate(currency === 'KES' ? 150.5 : 1650.0);
    } finally {
      setRateLoading(false);
    }
  };

  // Fetch institutions for NGN
  const fetchInstitutions = async (currency: string) => {
    setLoadingInstitutions(true);
    try {
      const response = await fetch(`/api/paycrest/institutions/${currency}`);
      const data = await response.json();
      
      if (data.success) {
        setInstitutions(data.institutions || []);
      } else {
        console.error('Failed to fetch institutions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
    } finally {
      setLoadingInstitutions(false);
    }
  };

  // Verify account for NGN
  const verifyAccount = async (accountNumber: string, bankCode: string) => {
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
      
      if (data.success && data.accountName) {
        setFormData(prev => ({ ...prev, accountName: data.accountName }));
        setAccountVerified(true);
      } else {
        setAccountVerified(false);
        throw new Error(data.error || 'Account verification failed');
      }
    } catch (error) {
      console.error('Account verification error:', error);
      setAccountVerified(false);
      // Could show error message to user here
    } finally {
      setVerifyingAccount(false);
    }
  };

  // Auto-verify account when account number and bank code are provided
  useEffect(() => {
    if (formData.currency === 'NGN' && formData.accountNumber && formData.bankCode) {
      const debounceTimer = setTimeout(() => {
        verifyAccount(formData.accountNumber, formData.bankCode);
      }, 1000); // Debounce for 1 second
      
      return () => clearTimeout(debounceTimer);
    }
  }, [formData.accountNumber, formData.bankCode, formData.currency]);

  // Auto-fetch rates when amount or currency changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (formData.amount && formData.currency) {
        fetchRate(formData.amount, formData.currency);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(debounceTimer);
  }, [formData.amount, formData.currency]);

  // Fetch institutions when currency changes
  useEffect(() => {
    if (formData.currency === 'NGN') {
      fetchInstitutions('NGN');
    }
  }, [formData.currency]);

  // Reset form fields when currency changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      phoneNumber: '',
      accountNumber: '',
      bankCode: '',
      accountName: ''
    }));
    setAccountVerified(false);
  }, [formData.currency]);

  // Show wallet connection if not connected or not mounted
  if (!mounted || !isConnected) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MiniSend</h1>
          <p className="text-gray-300">Send money to mobile wallets</p>
        </div>

        <MobileWalletHandler showBalance={false} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Header with Step Indicator */}
      <div className="text-center">
        
        <div className="inline-flex items-center space-x-2 text-xs text-blue-300 bg-blue-500/10 px-3 py-1 rounded-xl mt-2 border border-blue-400/20">
          <Image src="/Base_Network_Logo.svg" alt="Base Network" width={12} height={12} />
          <span className="font-medium">Powered by Base</span>
        </div>
        
        {/* Step Progress Indicator */}
        <div className="flex items-center justify-center space-x-2 mt-4">
          <div className={`w-2 h-2 rounded-full ${step === 'form' ? 'bg-blue-500' : 'bg-blue-500'}`}></div>
          <div className={`w-8 h-0.5 ${step === 'payment' || step === 'success' ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
          <div className={`w-2 h-2 rounded-full ${step === 'payment' ? 'bg-blue-500' : step === 'success' ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
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
      <DirectUSDCBalance />

      {/* Form Step */}
      {step === 'form' && (
        <div className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Amount ($)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm"
              min="0.50"
              max="10000"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as 'KES' | 'NGN' }))}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none cursor-pointer hover:bg-gray-800 backdrop-blur-sm"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px'
              }}
            >
              <option value="KES" className="bg-gray-800 text-white">🇰🇪 Kenyan Shilling (KES)</option>
              <option value="NGN" className="bg-gray-800 text-white">🇳🇬 Nigerian Naira (NGN)</option>
            </select>
          </div>

          {/* Exchange Rate Display */}
          {formData.amount && (
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Exchange Rate:</span>
                <div className="text-right">
                  {rateLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-300">Loading...</span>
                    </div>
                  ) : currentRate ? (
                    <div>
                      <div className="text-white font-medium">
                        1 USD = {currentRate.toLocaleString()} {formData.currency}
                      </div>
                      <div className="text-xs text-gray-400">
                        You&apos;ll receive ≈ {(parseFloat(formData.amount) * currentRate).toLocaleString()} {formData.currency}
                      </div>
                    </div>
                  ) : rateError ? (
                    <div className="text-red-400 text-xs">
                      Rate unavailable
                    </div>
                  ) : null}
                </div>
              </div>
              {rateError && (
                <div className="mt-2 text-xs text-yellow-400">
                  Using fallback rate - order will use live rates
                </div>
              )}
            </div>
          )}

          {/* Conditional input fields based on currency */}
          {formData.currency === 'KES' ? (
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
                  placeholder="John Doe"
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
                    placeholder="1234567890"
                    className="w-full px-4 py-3 bg-gray-800/80 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm"
                    disabled={verifyingAccount}
                  />
                  {verifyingAccount && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {verifyingAccount && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-400">Verifying account with bank...</span>
                  </div>
                )}
                {accountVerified && formData.accountName && !verifyingAccount && (
                  <div className="mt-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-green-300 font-medium text-sm">Account Verified</div>
                        <div className="text-green-200 text-xs">{formData.accountName}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => setStep('payment')}
            disabled={
              !formData.amount || 
              !formData.accountName ||
              (formData.currency === 'KES' && !formData.phoneNumber) ||
              (formData.currency === 'NGN' && (!formData.accountNumber || !formData.bankCode || !accountVerified))
            }
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            Continue to Payment
          </button>
        </div>
      )}

      {/* Payment Step */}
      {step === 'payment' && (
        <div>
          <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-white font-medium mb-2">Payment Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Amount:</span>
                <span>${formData.amount}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>To:</span>
                <span>{formData.phoneNumber}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Currency:</span>
                <span>{formData.currency}</span>
              </div>
            </div>
          </div>

          <SimpleUSDCPayment
            amount={formData.amount}
            phoneNumber={formData.phoneNumber}
            accountNumber={formData.accountNumber}
            bankCode={formData.bankCode}
            accountName={formData.accountName}
            currency={formData.currency}
            returnAddress={address || ''}
            rate={currentRate} // Pass the fetched rate
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
      {step === 'success' && (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
          
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Your {formData.currency} has been sent to {formData.phoneNumber}
            </p>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="text-gray-300">Funds will arrive within 1-2 minutes</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                setStep('form');
                setFormData({ amount: '', phoneNumber: '', accountNumber: '', bankCode: '', accountName: '', currency: 'KES' });
                setCurrentRate(null);
                setAccountVerified(false);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
            >
              Send Another Payment
            </button>
            
            <p className="text-gray-400 text-xs">
              Thank you for using Mini Send! 🚀
            </p>
          </div>
        </div>
      )}
    </div>
  );
}