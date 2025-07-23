"use client";

import { useState } from 'react';

interface PaycrestFormProps {
  localAmount: number;
  usdcAmount: number;
  currency: 'KES' | 'NGN';
  onSubmit: (data: {
    phoneNumber: string;
    accountName: string;
    amount: number;
  }) => void;
}

export function PaycrestForm({ localAmount, usdcAmount, currency, onSubmit }: PaycrestFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !accountName) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        phoneNumber: phoneNumber.trim(),
        accountName: accountName.trim(),
        amount: usdcAmount,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    
    if (currency === 'KES') {
      // Kenya phone number formatting
      if (cleaned.startsWith('254')) {
        return cleaned.slice(0, 12);
      } else if (cleaned.startsWith('0')) {
        return cleaned.slice(0, 10);
      } else if (cleaned.length <= 9) {
        return cleaned;
      }
      return cleaned.slice(0, 9);
    } else {
      // Nigeria phone number formatting
      if (cleaned.startsWith('234')) {
        return cleaned.slice(0, 13);
      } else if (cleaned.startsWith('0')) {
        return cleaned.slice(0, 11);
      } else if (cleaned.length <= 10) {
        return cleaned;
      }
      return cleaned.slice(0, 10);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const displayPhoneNumber = () => {
    if (!phoneNumber) return '';
    
    if (currency === 'KES') {
      if (phoneNumber.startsWith('254')) {
        return `+${phoneNumber}`;
      } else if (phoneNumber.startsWith('0')) {
        return phoneNumber;
      } else if (phoneNumber.length === 9) {
        return `0${phoneNumber}`;
      }
    } else {
      // Nigeria
      if (phoneNumber.startsWith('234')) {
        return `+${phoneNumber}`;
      } else if (phoneNumber.startsWith('0')) {
        return phoneNumber;
      } else if (phoneNumber.length === 10) {
        return `0${phoneNumber}`;
      }
    }
    return phoneNumber;
  };

  const isValid = (currency === 'KES' ? phoneNumber.length >= 9 : phoneNumber.length >= 10) && accountName.length >= 2;

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative rounded-3xl card-shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.01]">
        {/* Premium background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
          <div className="absolute inset-0 gradient-mesh opacity-40"></div>
          
          {/* Floating elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-12 h-12 border border-blue-400 rounded-full animate-pulse"></div>
            <div className="absolute bottom-6 left-6 w-6 h-6 border border-purple-400 rounded-full"></div>
            <div className="absolute top-1/2 left-4 w-8 h-8 border border-white rounded-full"></div>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">3</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Payment Details</h3>
          </div>

          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-400/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">⚡</span>
              </div>
              <div>
                <h4 className="text-blue-300 font-bold text-sm mb-1">Payment Process</h4>
                <p className="text-blue-200 text-xs leading-relaxed">
                  You&apos;ll get payment instructions to send USDC. {currency} will be sent to your {currency === 'KES' ? 'M-Pesa' : 'bank account'} once confirmed.
                </p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Name Input */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Account Name *
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 text-white bg-white/5 backdrop-blur-sm border-2 border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
                required
                minLength={2}
                maxLength={50}
              />
              <p className="text-gray-400 text-xs mt-1">
                Full name as registered with your mobile money account
              </p>
            </div>
            
            {/* Phone Number Input */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {currency === 'KES' ? 'M-Pesa Number' : 'Phone Number'} *
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="0712345678"
                className="w-full px-4 py-3 text-white bg-white/5 backdrop-blur-sm border-2 border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
                required
              />
              {phoneNumber && (
                <p className="text-blue-400 text-xs mt-1 font-mono">
                  Will send to: {displayPhoneNumber()}
                </p>
              )}
              <p className="text-gray-400 text-xs mt-1">
                Format: {currency === 'KES' ? '0712345678 or 254712345678' : '08012345678 or 2348012345678'}
              </p>
            </div>

            {/* Transaction Summary */}
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <h4 className="text-white font-bold text-sm mb-3">Transaction Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">You send (USDC)</span>
                  <span className="text-white font-mono">${usdcAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Recipient gets ({currency})</span>
                  <span className="text-white font-mono">{currency === 'KES' ? 'KSh' : '₦'} {localAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-gray-300">Method</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">⚡</span>
                    <span className="text-blue-400 font-medium">Instant</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`w-full py-4 px-6 rounded-xl font-bold text-base focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 transform shadow-lg ${
                isValid && !isSubmitting
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Order...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>Create Payment Order</span>
                  <span>⚡</span>
                </div>
              )}
            </button>
            
            {/* Validation Message */}
            {!isValid && phoneNumber && accountName && (
              <div className="mt-2 p-3 bg-orange-500/20 border border-orange-400/30 rounded-xl">
                <p className="text-orange-300 text-sm">
                  Please check your phone number and account name
                </p>
              </div>
            )}
          </form>
        </div>
        
        {/* Subtle border */}
        <div className="absolute inset-0 rounded-3xl border border-white/10"></div>
      </div>
    </div>
  );
}