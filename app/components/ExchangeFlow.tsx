"use client";

import { useState, useEffect, useCallback } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import { PaymentProcessor } from './PaymentProcessor';
import { PretiumPaymentProcessor } from './PretiumPaymentProcessor';
import { BalanceView } from './BalanceView';
import { Button } from './BaseComponents';
import Image from 'next/image';
import { trackOffRampEvent, trackWalletEvent } from '@/lib/analytics';
import { PretiumReceipt } from './PretiumReceipt';
import { PaycrestReceipt } from './PaycrestReceipt';
import { CurrencySwapInterface } from './CurrencySwapInterface';
import { SavedRecipients } from './SavedRecipients';
import { saveRecipient, SavedRecipient } from '@/lib/recipient-storage';
import { BankSelector } from './BankSelector';
import { FormInput } from './FormInput';
import { PhoneNumberInput } from './PhoneNumberInput';
import { AccountNumberInput } from './AccountNumberInput';
import { useMinisendAuth } from '@/lib/hooks/useMinisendAuth';

interface ExchangeFlowProps {
  setActiveTab: (tab: string) => void;
}

// Helper function to get currency display info
function getCurrencyInfo(currency: 'KES' | 'NGN' | 'GHS' | 'UGX') {
  switch (currency) {
    case 'KES':
      return { symbol: 'KSh', flag: '🇰🇪', name: 'Kenya' };
    case 'NGN':
      return { symbol: '₦', flag: '🇳🇬', name: 'Nigeria' };
    case 'GHS':
      return { symbol: '₵', flag: '🇬🇭', name: 'Ghana' };
    case 'UGX':
      return { symbol: 'USh', flag: '🇺🇬', name: 'Uganda' };
  }
}

export function ExchangeFlow({ setActiveTab }: ExchangeFlowProps) {
  const { context } = useMiniKit();
  const { address, isConnected } = useAccount();
  const { minisendWallet } = useMinisendAuth();

  // User can proceed if they have either a connected wallet OR email authentication
  const hasWallet = isConnected && address;
  const walletAddress = address || minisendWallet;
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
    currency: 'KES' | 'NGN' | 'GHS' | 'UGX';
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
  const [transactionCode, setTransactionCode] = useState<string>('');
  const [paycrestOrderId, setPaycrestOrderId] = useState<string>('');

  // Fetch institutions (banks) for NGN from PayCrest
  const fetchInstitutions = async () => {
    setLoadingInstitutions(true);
    try {
      // Use PayCrest institutions endpoint for NGN
      const response = await fetch('/api/paycrest/institutions/NGN');
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

  // Verify phone number for KES and GHS
  const verifyPhoneNumber = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber || !swapData) return;

    setVerifyingAccount(true);
    try {
      const response = await fetch('/api/pretium/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          type: 'MOBILE',
          currency: swapData.currency
        }),
      });

      const data = await response.json();

      if (data.success && data.isValid) {
        // Set the account name from Pretium's response if we got one
        if (data.accountName && data.verified) {
          setFormData(prev => ({ ...prev, accountName: data.accountName }));
        }
        // Mark as verified if phone format is valid (even if we don't get name from Pretium)
        setAccountVerified(true);
      } else {
        setAccountVerified(false);
        throw new Error(data.error || 'Phone number validation failed');
      }
    } catch {
      setAccountVerified(false);
    } finally {
      setVerifyingAccount(false);
    }
  }, [formData.accountName, swapData]);

  // Verify account for NGN using PayCrest
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
          bankCode,
          currency: 'NGN'
        }),
      });

      const data = await response.json();

      if (data.success && data.isValid) {
        // Set the account name from PayCrest's response
        if (data.accountName) {
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

  // Check if phone number format is valid (Kenyan, Ghanaian, or Ugandan mobile numbers)
  const isPhoneNumberValid = swapData?.currency === 'KES'
    ? formData.phoneNumber.length >= 9 && formData.phoneNumber.length <= 12 && /^(\+?254|0)?[17]\d{8}$/.test(formData.phoneNumber)
    : swapData?.currency === 'GHS'
    ? formData.phoneNumber.length >= 9 && formData.phoneNumber.length <= 12 && /^(\+?233|0)?[2352]\d{8}$/.test(formData.phoneNumber)
    : swapData?.currency === 'UGX'
    ? formData.phoneNumber.length >= 9 && formData.phoneNumber.length <= 12 && /^(\+?256|0)?[7]\d{8}$/.test(formData.phoneNumber)
    : false;

  // Auto-verify phone number for KES, GHS, and UGX
  useEffect(() => {
    if (swapData && (swapData.currency === 'KES' || swapData.currency === 'GHS' || swapData.currency === 'UGX') && isPhoneNumberValid && !accountVerified) {
      const debounceTimer = setTimeout(() => {
        verifyPhoneNumber(formData.phoneNumber);
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(debounceTimer);
    } else if (swapData && (swapData.currency === 'KES' || swapData.currency === 'GHS' || swapData.currency === 'UGX') && formData.phoneNumber && !isPhoneNumberValid) {
      // Reset verification state if phone number becomes invalid
      setAccountVerified(false);
    }
  }, [formData.phoneNumber, swapData, isPhoneNumberValid, accountVerified, verifyPhoneNumber]);

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
      fetchInstitutions();
    }
  }, [step, swapData]);

  // Track step changes
  useEffect(() => {
    if (!swapData) return;

    const stepNumber = step === 'swap' ? 1 : step === 'details' ? 2 : step === 'payment' ? 3 : 4;

    trackOffRampEvent('step_changed', {
      step: stepNumber,
      currency: swapData.currency,
      amount: parseFloat(swapData.localAmount) || 0,
    }, context || undefined);
  }, [step, swapData, context]);

  // Show wallet connection if not connected or not mounted
  // For MiniKit users, auto-detect wallet from context
  // Show loading state while mounting
  if (!mounted) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-3/4 mx-auto"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Only show connection screen if user is not authenticated at all


  return (
    <div className="max-w-md mx-auto p-6 space-y-6 overflow-visible">
      {/* Back and Profile Buttons */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setActiveTab('send')}
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
          {/* Compact Amount Summary */}
          <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-[#8e8e93] mb-1">You&apos;ll receive</div>
              <div className="text-white font-bold text-lg">
                {getCurrencyInfo(swapData.currency).symbol} {parseFloat(swapData.localAmount).toLocaleString()}
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
          {/* Saved Recipients Section */}
          <SavedRecipients
            currency={swapData.currency}
            currentPhone={formData.phoneNumber}
            currentAccount={formData.accountNumber}
            onSelect={(recipient: SavedRecipient) => {
              if (recipient.type === 'KES' || recipient.type === 'GHS') {
                setFormData(prev => ({
                  ...prev,
                  phoneNumber: recipient.phoneNumber || '',
                  accountName: recipient.accountName,
                }));
              } else {
                setFormData(prev => ({
                  ...prev,
                  accountNumber: recipient.accountNumber || '',
                  bankCode: recipient.bankCode || '',
                  accountName: recipient.accountName,
                }));
              }
            }}
          />

          {/* Conditional input fields based on currency */}
          {swapData.currency === 'KES' || swapData.currency === 'GHS' || swapData.currency === 'UGX' ? (
            <>
              <PhoneNumberInput
                label="Phone Number"
                value={formData.phoneNumber}
                onChange={(value) => setFormData(prev => ({ ...prev, phoneNumber: value }))}
                currency={swapData.currency}
                placeholder={swapData.currency === 'KES' ? '712345678' : swapData.currency === 'GHS' ? '241234567' : '771234567'}
                onValidationChange={(isValid) => {
                  if (isValid && !accountVerified) {
                    // Auto-verify will be triggered by the useEffect
                  }
                }}
              />

              <FormInput
                label="Account Name"
                type="text"
                value={formData.accountName}
                onChange={(value) => setFormData(prev => ({ ...prev, accountName: value }))}
                placeholder="John Doe"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                helperText={swapData.currency === 'KES' ? 'Full name as registered with M-Pesa' : 'Full name as registered with Mobile Money'}
              />

              {accountVerified && formData.accountName && !verifyingAccount && (
                <div className="p-4 bg-[#1c1c1e] border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-green-400 font-medium text-sm">Phone Number Verified</div>
                      <div className="text-white font-semibold truncate">{formData.accountName}</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-white text-sm font-medium mb-2">Bank</label>
                <BankSelector
                  institutions={institutions}
                  value={formData.bankCode}
                  onChange={(value) => setFormData(prev => ({ ...prev, bankCode: value }))}
                  loading={loadingInstitutions}
                />
              </div>

              <AccountNumberInput
                label="Account Number"
                value={formData.accountNumber}
                onChange={(value) => setFormData(prev => ({ ...prev, accountNumber: value }))}
                placeholder="0123456789"
                disabled={!formData.bankCode}
                verifying={verifyingAccount}
                onValidationChange={(isValid) => {
                  if (isValid && formData.bankCode && !accountVerified) {
                    // Auto-verify will be triggered by the useEffect
                  }
                }}
              />

              {accountVerified && formData.accountName && !verifyingAccount && (
                <div className="p-4 bg-[#1c1c1e] border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-green-400 font-medium text-sm">Account Verified</div>
                      <div className="text-white font-semibold truncate">{formData.accountName}</div>
                    </div>
                  </div>
                </div>
              )}
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
              ((swapData.currency === 'KES' || swapData.currency === 'GHS' || swapData.currency === 'UGX') && !formData.phoneNumber) ||
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
          {/* Payment Summary - Mobile Optimized */}
          <div className="space-y-3 mb-6">
            {/* Main Amount Card */}
            <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[#8e8e93] text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2 uppercase tracking-wider">Recipient receives</div>
                  <div className="text-white font-bold text-2xl sm:text-3xl tracking-tight break-words">
                    {getCurrencyInfo(swapData.currency).symbol}{parseFloat(swapData.localAmount).toLocaleString()}
                  </div>
                  <div className="text-[#8e8e93] text-xs sm:text-sm mt-1 sm:mt-1.5 font-medium truncate">
                    {(swapData.currency === 'KES' || swapData.currency === 'GHS') ? formData.phoneNumber : formData.accountName}
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-lg sm:text-xl">{getCurrencyInfo(swapData.currency).flag}</span>
                </div>
              </div>

              {swapData.currency === 'NGN' && formData.bankCode && (
                <div className="pt-2.5 sm:pt-3 border-t border-[#3a3a3c]">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8e8e93] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-[#8e8e93] text-xs font-medium truncate">
                      {institutions.find(inst => inst.code === formData.bankCode)?.name || formData.bankCode}
                    </span>
                  </div>
                </div>
              )}
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

          {(swapData.currency === 'KES' || swapData.currency === 'GHS' || swapData.currency === 'UGX') ? (
            <PretiumPaymentProcessor
              amount={swapData.usdcAmount}
              phoneNumber={formData.phoneNumber}
              accountName={formData.accountName}
              returnAddress={walletAddress || ''}
              rate={swapData.rate}
              currency={swapData.currency}
              onSuccess={(txCode) => {
                // Store transaction code for receipt
                if (txCode) {
                  setTransactionCode(txCode);
                }

                trackOffRampEvent('payment_completed', {
                  currency: swapData.currency,
                  amount: parseFloat(swapData.localAmount),
                  usdcAmount: parseFloat(swapData.usdcAmount),
                  rate: swapData.rate,
                  phoneNumber: formData.phoneNumber,
                  provider: 'PRETIUM',
                  step: 3,
                  success: true,
                }, context || undefined);

                // Auto-save recipient for future use
                if (formData.accountName) {
                  saveRecipient({
                    type: swapData.currency,
                    phoneNumber: formData.phoneNumber,
                    accountNumber: formData.accountNumber,
                    accountName: formData.accountName,
                    bankCode: formData.bankCode,
                    bankName: undefined,
                  });
                }

                setStep('success');
              }}
              onError={(error) => {
                trackOffRampEvent('payment_error', {
                  currency: swapData.currency,
                  amount: parseFloat(swapData.localAmount),
                  usdcAmount: parseFloat(swapData.usdcAmount),
                  rate: swapData.rate,
                  provider: 'PRETIUM',
                  error: error,
                  step: 3,
                  success: false,
                }, context || undefined);
              }}
            />
          ) : swapData.currency === 'NGN' ? (
            <PaymentProcessor
              amount={swapData.usdcAmount}
              phoneNumber={formData.phoneNumber}
              accountNumber={formData.accountNumber}
              bankCode={formData.bankCode}
              accountName={formData.accountName}
              currency={swapData.currency}
              returnAddress={walletAddress || ''}
              rate={swapData.rate}
              onSuccess={(orderId) => {
                // Store PayCrest order ID for receipt tracking
                if (orderId) {
                  setPaycrestOrderId(orderId);
                }

                trackOffRampEvent('payment_completed', {
                  currency: swapData.currency,
                  amount: parseFloat(swapData.localAmount),
                  usdcAmount: parseFloat(swapData.usdcAmount),
                  rate: swapData.rate,
                  phoneNumber: formData.phoneNumber,
                  accountNumber: formData.accountNumber,
                  bankCode: formData.bankCode,
                  provider: 'PAYCREST',
                  step: 3,
                  success: true,
                }, context || undefined);

                // Auto-save recipient for future use
                if (formData.accountName) {
                  const bankName = institutions.find(inst => inst.code === formData.bankCode)?.name;
                  saveRecipient({
                    type: swapData.currency,
                    phoneNumber: formData.phoneNumber,
                    accountNumber: formData.accountNumber,
                    accountName: formData.accountName,
                    bankCode: formData.bankCode,
                    bankName: bankName,
                  });
                }

                setStep('success');
              }}
              onError={(error) => {
                trackOffRampEvent('payment_error', {
                  currency: swapData.currency,
                  amount: parseFloat(swapData.localAmount),
                  usdcAmount: parseFloat(swapData.usdcAmount),
                  rate: swapData.rate,
                  provider: 'PAYCREST',
                  error: error,
                  step: 3,
                  success: false,
                }, context || undefined);
              }}
            />
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
      {step === 'success' && swapData && (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white">
            {swapData.currency === 'NGN' ? 'Delivering Your NGN' : 'Payment Successful!'}
          </h2>

          <p className="text-gray-300 text-sm">
            {swapData.currency === 'NGN'
              ? `Sending ₦${parseFloat(swapData.localAmount).toLocaleString()} to ${formData.accountName}...`
              : `Your ${swapData.currency} has been sent to ${(swapData.currency === 'KES' || swapData.currency === 'GHS' || swapData.currency === 'UGX') ? formData.phoneNumber : formData.accountName}`
            }
          </p>

          {/* Modern Receipt Component - Real-time status updates */}
          {(swapData.currency === 'KES' || swapData.currency === 'GHS' || swapData.currency === 'UGX') && transactionCode ? (
            <div className="pt-4">
              <PretiumReceipt transactionCode={transactionCode} />
            </div>
          ) : swapData.currency === 'NGN' && paycrestOrderId ? (
            <div className="pt-4">
              <PaycrestReceipt orderId={paycrestOrderId} />
            </div>
          ) : null}
          
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
