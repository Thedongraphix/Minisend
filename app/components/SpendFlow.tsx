"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { PaymentProcessor } from './PaymentProcessor';
import { PretiumPaymentProcessor } from './PretiumPaymentProcessor';
import { BalanceView } from './BalanceView';
import { ConnectionHandler } from './ConnectionHandler';
import { AdvancedSelector } from './AdvancedSelector';
import { Button } from './BaseComponents';
import Image from 'next/image';
import { CurrencySwapInterface } from './CurrencySwapInterface';
import { FormInput } from './FormInput';
import { DownloadButton } from './DownloadButton';
import { useReceiptReadiness } from '../hooks/useReceiptReadiness';

interface SpendFlowProps {
  setActiveTab: (tab: string) => void;
}

export function SpendFlow({ setActiveTab }: SpendFlowProps) {
  const { address, isConnected } = useAccount();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Use receipt readiness hook for Pretium transactions
  const {
    isReady: receiptIsReady,
    isChecking: receiptIsChecking,
    receiptNumber: mpesaCode
  } = useReceiptReadiness({
    transactionCode: transactionData.transactionCode,
    enabled: step === 'success' && swapData?.currency === 'KES' && !!transactionData.transactionCode,
    maxAttempts: 15, // 15 attempts = 30 seconds
    pollInterval: 2000, // Check every 2 seconds
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
          <p className="text-gray-300">Pay businesses with M-Pesa till & paybill</p>
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
          {/* Amount Summary Banner - Mobile Optimized */}
          <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-2xl p-4 sm:p-5 mb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[#8e8e93] text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2 uppercase tracking-wider">You&apos;re spending</div>
                <div className="text-white font-bold text-2xl sm:text-3xl tracking-tight break-words mb-1">
                  {swapData.currency === 'KES' ? 'KSh' : '₦'}{parseFloat(swapData.localAmount).toLocaleString()}
                </div>
                <div className="text-[#8e8e93] text-xs sm:text-sm font-medium">
                  ≈ ${parseFloat(swapData.usdcAmount).toFixed(4)} USDC
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-lg sm:text-xl">{swapData.currency === 'KES' ? '🇰🇪' : '🇳🇬'}</span>
                </div>
                <button
                  onClick={() => setStep('swap')}
                  className="text-[#8e8e93] hover:text-white transition-colors p-1.5 hover:bg-[#2c2c2e] rounded-lg"
                  title="Edit amount"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Enhanced Payment Method Selector - Phone, Till, and Paybill numbers */}
            <AdvancedSelector
              currency={swapData.currency}
              onPaymentMethodChange={setPaymentMethod}
              className="mb-4"
            />

            <FormInput
              label="Recipient Name"
              type="text"
              value={formData.accountName}
              onChange={(value) => setFormData(prev => ({ ...prev, accountName: value }))}
              placeholder="Business or person name"
              success={formData.accountName.length > 0}
            />

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
          {/* Payment Summary - Mobile Optimized */}
          <div className="space-y-3 mb-6">
            {/* Main Amount Card */}
            <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[#8e8e93] text-[10px] sm:text-xs font-medium mb-1.5 sm:mb-2 uppercase tracking-wider">Recipient receives</div>
                  <div className="text-white font-bold text-2xl sm:text-3xl tracking-tight break-words">
                    {swapData.currency === 'KES' ? 'KSh' : '₦'}{parseFloat(swapData.localAmount).toLocaleString()}
                  </div>
                  <div className="text-[#8e8e93] text-xs sm:text-sm mt-1 sm:mt-1.5 font-medium truncate">
                    {paymentMethod.type === 'till'
                      ? `Till ${paymentMethod.formatted}`
                      : paymentMethod.type === 'paybill'
                        ? `Paybill ${paymentMethod.formatted}${formData.paybillAccount ? ` - ${formData.paybillAccount}` : ''}`
                        : paymentMethod.formatted}
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-lg sm:text-xl">{swapData.currency === 'KES' ? '🇰🇪' : '🇳🇬'}</span>
                </div>
              </div>
            </div>

            {/* Transaction Breakdown */}
            <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-2xl p-3.5 sm:p-4">
              <div className="space-y-2.5 sm:space-y-3">
                {/* You send */}
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

                {/* Rate */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#8e8e93] text-xs sm:text-sm truncate">Rate</span>
                  <span className="text-white font-semibold text-xs sm:text-sm flex-shrink-0">1 USDC = {swapData.rate.toFixed(2)}</span>
                </div>

                <div className="h-px bg-[#3a3a3c]"></div>

                {/* Service fee - CALCULATED */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#8e8e93] text-xs sm:text-sm truncate">Service fee</span>
                  <span className="text-white font-semibold text-xs sm:text-sm flex-shrink-0">${(parseFloat(swapData.usdcAmount) * 0.01).toFixed(4)}</span>
                </div>

                <div className="h-px bg-[#3a3a3c]"></div>

                {/* Gas fee */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#8e8e93] text-xs sm:text-sm truncate">Gas fee</span>
                  <span className="text-green-500 font-semibold text-xs sm:text-sm flex-shrink-0">Free (saves ~$0.08)</span>
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
              paybillAccount={paymentMethod.type === 'paybill' ? formData.paybillAccount : undefined}
              accountName={formData.accountName}
              returnAddress={address || ''}
              rate={swapData.rate}
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

          {/* Download Receipt Button */}
          {swapData.currency === 'KES' && transactionData.txHash && (
            <div className="space-y-3 pt-4">
              <div className="bg-purple-500/10 border border-purple-400/20 rounded-xl p-4">
                <div className="flex items-start gap-3 text-left">
                  {receiptIsChecking ? (
                    <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-purple-300 font-medium">
                      {receiptIsChecking ? 'Waiting for M-Pesa confirmation...' : 'Receipt Ready'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {receiptIsChecking
                        ? 'Getting M-Pesa code from Safaricom. This usually takes 2-10 seconds.'
                        : mpesaCode
                          ? `M-Pesa Code: ${mpesaCode} • Receipt ready for download`
                          : 'Your receipt includes the M-Pesa code and blockchain transaction details'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {receiptIsReady && (
                <DownloadButton
                orderData={{
                  id: transactionData.transactionCode || `order_${Date.now()}`,
                  amount_in_usdc: parseFloat(swapData.usdcAmount),
                  amount_in_local: parseFloat(swapData.localAmount),
                  local_currency: swapData.currency,
                  account_name: formData.accountName,
                  phone_number: paymentMethod.type === 'phone' ? paymentMethod.formatted : undefined,
                  till_number: paymentMethod.type === 'till' ? paymentMethod.formatted : undefined,
                  paybill_number: paymentMethod.type === 'paybill' ? paymentMethod.formatted : undefined,
                  paybill_account: paymentMethod.type === 'paybill' ? formData.paybillAccount : undefined,
                  wallet_address: address || '',
                  rate: swapData.rate,
                  sender_fee: 0,
                  transaction_fee: 0,
                  status: 'completed',
                  created_at: new Date().toISOString(),
                  blockchain_tx_hash: transactionData.txHash,
                  pretium_transaction_code: transactionData.transactionCode,
                }}
                variant="primary"
                size="lg"
                className="w-full"
              />
              )}
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