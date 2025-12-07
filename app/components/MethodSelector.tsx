"use client";

import { useState, useEffect } from 'react';
import { detectPaymentDestination, getPaymentDestinationDescription, isPaymentDestinationSupported } from '@/lib/utils/tillValidator';

interface MethodSelectorProps {
  currency: 'KES' | 'NGN';
  onPaymentMethodChange: (method: { 
    type: 'phone' | 'till'; 
    value: string; 
    formatted: string; 
  } | null) => void;
  className?: string;
}

export function MethodSelector({
  currency,
  onPaymentMethodChange,
  className = ''
}: MethodSelectorProps) {
  const [paymentInput, setPaymentInput] = useState('');
  const [destination, setDestination] = useState(detectPaymentDestination(''));
  const [showHelper, setShowHelper] = useState(false);

  useEffect(() => {
    const newDestination = detectPaymentDestination(paymentInput);
    setDestination(newDestination);
    
    // Only notify parent if we have a valid, supported payment method
    if (newDestination.isValid && isPaymentDestinationSupported(newDestination, currency)) {
      onPaymentMethodChange({
        type: newDestination.type as 'phone' | 'till',
        value: newDestination.value,
        formatted: newDestination.formatted
      });
    } else {
      onPaymentMethodChange(null);
    }
  }, [paymentInput, currency, onPaymentMethodChange]);

  const handleInputChange = (value: string) => {
    setPaymentInput(value);
  };

  // Don't show for NGN as till numbers aren't supported
  if (currency !== 'KES') {
    return null;
  }

  const getInputStatus = () => {
    if (!paymentInput.trim()) return 'neutral';
    if (destination.isValid && isPaymentDestinationSupported(destination, currency)) return 'valid';
    if (paymentInput.length > 0) return 'invalid';
    return 'neutral';
  };

  const inputStatus = getInputStatus();

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Paybill Number or M-Pesa Till 
        </label>
        <div className="relative">
          <input
            type="text"
            value={paymentInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Enter Till Number or Paybill Number (12345)"
            className={`w-full px-4 py-3 pr-12 bg-gray-800/80 border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm ${
              inputStatus === 'valid' 
                ? 'border-green-500 focus:ring-green-500' 
                : inputStatus === 'invalid'
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-600 focus:ring-blue-500'
            }`}
            onFocus={() => setShowHelper(true)}
            onBlur={() => setTimeout(() => setShowHelper(false), 150)}
          />
          
          {/* Status indicator */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            {inputStatus === 'valid' && (
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {inputStatus === 'invalid' && (
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        </div>
        
        {/* Payment type indicator */}
        {destination.type !== 'unknown' && paymentInput.trim() && (
          <div className="mt-2 flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              inputStatus === 'valid' 
                ? (destination.type === 'phone' ? 'bg-green-400' : 'bg-blue-400')
                : 'bg-yellow-400'
            }`}></div>
            <span className={`text-xs ${
              inputStatus === 'valid' ? 'text-gray-300' : 'text-yellow-400'
            }`}>
              {inputStatus === 'valid' 
                ? `Detected: ${getPaymentDestinationDescription(destination)}`
                : `Invalid ${destination.type === 'phone' ? 'phone number' : 'till number'} format`
              }
            </span>
          </div>
        )}

        {/* Helper text */}
        {showHelper && (
          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg backdrop-blur-sm">
            <div className="text-xs text-blue-300 space-y-2">
              <div className="font-medium">Supported formats:</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>Phone numbers:</span>
                  <span className="text-blue-200">+254712345678, 0712345678</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Till numbers:</span>
                  <span className="text-blue-200">12345, 987654</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}