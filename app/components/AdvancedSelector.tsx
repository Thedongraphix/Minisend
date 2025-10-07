"use client";

import { useState, useEffect } from 'react';
import { detectPaymentDestination, getPaymentDestinationDescription, isPaymentDestinationSupported } from '@/lib/utils/tillValidator';

interface PaymentMethodData {
  type: 'phone' | 'till';
  value: string;
  formatted: string;
}

interface AdvancedSelectorProps {
  currency: 'KES' | 'NGN';
  onPaymentMethodChange: (method: PaymentMethodData | null) => void;
  className?: string;
}

export function AdvancedSelector({
  currency,
  onPaymentMethodChange,
  className = ''
}: AdvancedSelectorProps) {
  const [paymentInput, setPaymentInput] = useState('');
  const [currentDestination, setCurrentDestination] = useState(detectPaymentDestination(''));

  // Update payment method when inputs change
  useEffect(() => {
    let result: PaymentMethodData | null = null;

    if (paymentInput.trim()) {
      const destination = detectPaymentDestination(paymentInput);
      setCurrentDestination(destination);
      
      if (destination.isValid && isPaymentDestinationSupported(destination, currency)) {
        result = {
          type: destination.type as 'phone' | 'till',
          value: destination.value,
          formatted: destination.formatted
        };
      }
    }

    onPaymentMethodChange(result);
  }, [paymentInput, currency, onPaymentMethodChange]);

  // Don't show for NGN as till numbers aren't supported
  if (currency !== 'KES') {
    return null;
  }

  const getInputStatus = (input: string) => {
    if (!input.trim()) return 'neutral';
    
    const destination = detectPaymentDestination(input);
    return destination.isValid ? 'valid' : 'invalid';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-white text-sm font-medium mb-2">
          Phone Number or Till Number
        </label>
        <div className="relative">
          <input
            type="text"
            value={paymentInput}
            onChange={(e) => setPaymentInput(e.target.value)}
            placeholder="Enter till number (12345)"
            className={`w-full px-4 py-3 pr-12 bg-gray-800/80 border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm ${
              paymentInput && getInputStatus(paymentInput) === 'valid' 
                ? 'border-green-500 focus:ring-green-500' 
                : paymentInput && getInputStatus(paymentInput) === 'invalid'
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-600 focus:ring-purple-500'
            }`}
          />
          
          {/* Status indicator */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            {getInputStatus(paymentInput) === 'valid' && (
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {getInputStatus(paymentInput) === 'invalid' && paymentInput.trim() && (
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Status message */}
        {paymentInput && (
          <div className="mt-2 flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              getInputStatus(paymentInput) === 'valid' ? 'bg-green-500' : 
              getInputStatus(paymentInput) === 'invalid' ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
            <span className={`text-xs ${
              getInputStatus(paymentInput) === 'valid' ? 'text-green-400' : 
              getInputStatus(paymentInput) === 'invalid' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {getInputStatus(paymentInput) === 'valid' 
                ? `${getPaymentDestinationDescription(currentDestination)} (${currentDestination.formatted})`
                : getInputStatus(paymentInput) === 'invalid'
                ? 'Invalid format - please enter a valid phone number or till number'
                : 'Enter a Kenyan phone number (+254...) or M-Pesa till number (5-7 digits)'
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
}