"use client";

import { useState, useEffect } from 'react';
import { detectPaymentDestination, detectPaybillWithAccount, getPaymentDestinationDescription, isPaymentDestinationSupported } from '@/lib/utils/tillValidator';

interface PaymentMethodData {
  type: 'phone' | 'till' | 'paybill';
  value: string;
  formatted: string;
  accountNumber?: string; // For paybill numbers
}

interface EnhancedPaymentSelectorProps {
  currency: 'KES' | 'NGN';
  onPaymentMethodChange: (method: PaymentMethodData | null) => void;
  className?: string;
}

export function EnhancedPaymentSelector({ 
  currency, 
  onPaymentMethodChange, 
  className = '' 
}: EnhancedPaymentSelectorProps) {
  const [selectedType, setSelectedType] = useState<'auto' | 'paybill'>('auto');
  const [paymentInput, setPaymentInput] = useState('');
  const [paybillNumber, setPaybillNumber] = useState('');
  const [paybillAccount, setPaybillAccount] = useState('');
  const [currentDestination, setCurrentDestination] = useState(detectPaymentDestination(''));

  // Update payment method when inputs change
  useEffect(() => {
    let result: PaymentMethodData | null = null;

    if (selectedType === 'paybill') {
      // Handle paybill mode
      if (paybillNumber.trim() && paybillAccount.trim()) {
        const paybillDestination = detectPaybillWithAccount(paybillNumber, paybillAccount);
        if (paybillDestination.isValid && isPaymentDestinationSupported(paybillDestination, currency)) {
          result = {
            type: 'paybill',
            value: paybillDestination.value,
            formatted: paybillDestination.formatted,
            accountNumber: paybillDestination.accountNumber
          };
        }
      }
    } else {
      // Handle auto-detection mode (phone/till)
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
    }

    onPaymentMethodChange(result);
  }, [selectedType, paymentInput, paybillNumber, paybillAccount, currency, onPaymentMethodChange]);

  // Don't show for NGN as till/paybill numbers aren't supported
  if (currency !== 'KES') {
    return null;
  }

  const getInputStatus = (input: string, isPaybill = false) => {
    if (!input.trim()) return 'neutral';
    
    if (isPaybill) {
      const destination = detectPaybillWithAccount(paybillNumber, paybillAccount);
      return destination.isValid ? 'valid' : 'invalid';
    } else {
      const destination = detectPaymentDestination(input);
      return destination.isValid && isPaymentDestinationSupported(destination, currency) ? 'valid' : 'invalid';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Payment Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Payment Method
        </label>
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setSelectedType('auto')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              selectedType === 'auto'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Phone / Till
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('paybill')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              selectedType === 'paybill'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Paybill
          </button>
        </div>
      </div>

      {/* Auto-detection mode (Phone/Till) */}
      {selectedType === 'auto' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Till Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={paymentInput}
              onChange={(e) => setPaymentInput(e.target.value)}
              placeholder="Enter phone number (254...) or till number (12345)"
              className={`w-full px-4 py-3 pr-12 bg-gray-800/80 border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm ${
                getInputStatus(paymentInput) === 'valid' 
                  ? 'border-green-500 focus:ring-green-500' 
                  : getInputStatus(paymentInput) === 'invalid'
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-600 focus:ring-blue-500'
              }`}
            />
            
            {/* Status indicator */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              {getInputStatus(paymentInput) === 'valid' && (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {getInputStatus(paymentInput) === 'invalid' && (
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          {/* Detection result */}
          {currentDestination.type !== 'unknown' && paymentInput.trim() && (
            <div className="mt-2 flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                getInputStatus(paymentInput) === 'valid' 
                  ? (currentDestination.type === 'phone' ? 'bg-green-400' : 'bg-blue-400')
                  : 'bg-yellow-400'
              }`}></div>
              <span className={`text-xs ${
                getInputStatus(paymentInput) === 'valid' ? 'text-gray-300' : 'text-yellow-400'
              }`}>
                {getInputStatus(paymentInput) === 'valid' 
                  ? `Detected: ${getPaymentDestinationDescription(currentDestination)}`
                  : `Invalid ${currentDestination.type === 'phone' ? 'phone number' : 'till number'} format`
                }
              </span>
            </div>
          )}
        </div>
      )}

      {/* Paybill mode */}
      {selectedType === 'paybill' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Paybill Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={paybillNumber}
                onChange={(e) => setPaybillNumber(e.target.value)}
                placeholder="Enter paybill number (e.g., 40200)"
                className={`w-full px-4 py-3 pr-12 bg-gray-800/80 border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm ${
                  paybillNumber && getInputStatus('', true) === 'valid' 
                    ? 'border-green-500 focus:ring-green-500' 
                    : paybillNumber && getInputStatus('', true) === 'invalid'
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-600 focus:ring-blue-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Account Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={paybillAccount}
                onChange={(e) => setPaybillAccount(e.target.value)}
                placeholder="Enter account number (e.g., 1234567890)"
                className={`w-full px-4 py-3 pr-12 bg-gray-800/80 border rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all duration-200 hover:bg-gray-800 backdrop-blur-sm ${
                  paybillAccount && getInputStatus('', true) === 'valid' 
                    ? 'border-green-500 focus:ring-green-500' 
                    : paybillAccount && getInputStatus('', true) === 'invalid'
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-600 focus:ring-blue-500'
                }`}
              />
              
              {/* Status indicator for complete paybill */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                {getInputStatus('', true) === 'valid' && (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Paybill validation status */}
          {paybillNumber && paybillAccount && (
            <div className="mt-2 flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                getInputStatus('', true) === 'valid' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className={`text-xs ${
                getInputStatus('', true) === 'valid' ? 'text-green-300' : 'text-red-400'
              }`}>
                {getInputStatus('', true) === 'valid' 
                  ? 'Valid paybill details'
                  : 'Invalid paybill number or account number'
                }
              </span>
            </div>
          )}
        </div>
      )}

      {/* Helper text */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg backdrop-blur-sm">
        <div className="text-xs text-blue-300 space-y-2">
          <div className="font-medium">Supported payment methods:</div>
          <div className="space-y-1">
            <div>• <strong>Phone:</strong> M-Pesa mobile number (254712345678)</div>
            <div>• <strong>Till:</strong> Business till number (12345)</div>
            <div>• <strong>Paybill:</strong> Business paybill + account (40200 + account)</div>
          </div>
        </div>
      </div>
    </div>
  );
}