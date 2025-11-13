"use client";

import { useState, useEffect } from 'react';
import { detectPaymentDestination, getPaymentDestinationDescription, isPaymentDestinationSupported } from '@/lib/utils/tillValidator';
import { FormInput } from './FormInput';

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

  const statusIcon = getInputStatus(paymentInput) === 'valid' ? (
    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
  ) : getInputStatus(paymentInput) === 'invalid' && paymentInput.trim() ? (
    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </div>
  ) : undefined;

  const helperText = paymentInput ? (
    getInputStatus(paymentInput) === 'valid'
      ? `${getPaymentDestinationDescription(currentDestination)} (${currentDestination.formatted})`
      : getInputStatus(paymentInput) === 'invalid'
      ? 'Invalid format - please enter a valid phone number or till number'
      : 'Enter a Kenyan phone number (+254...) or M-Pesa till number (5-7 digits)'
  ) : undefined;

  return (
    <div className={`space-y-4 ${className}`}>
      <FormInput
        label="Phone Number or Till Number"
        type="text"
        value={paymentInput}
        onChange={setPaymentInput}
        placeholder="Enter till number (12345)"
        success={getInputStatus(paymentInput) === 'valid'}
        error={getInputStatus(paymentInput) === 'invalid' && paymentInput.trim() ? 'Invalid format' : undefined}
        helperText={helperText}
        statusIcon={statusIcon}
      />
    </div>
  );
}