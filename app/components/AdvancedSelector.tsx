"use client";

import { useState, useEffect } from 'react';
import { detectPaymentDestination, detectPaybillWithAccount, getPaymentDestinationDescription, isPaymentDestinationSupported, isPaybillBlocked } from '@/lib/utils/tillValidator';
import { FormInput } from './FormInput';

interface PaymentMethodData {
  type: 'phone' | 'till' | 'paybill';
  value: string;
  formatted: string;
  paybillAccount?: string;
}

interface AdvancedSelectorProps {
  currency: 'KES' | 'NGN' | 'GHS' | 'UGX';
  onPaymentMethodChange: (method: PaymentMethodData | null) => void;
  className?: string;
}

export function AdvancedSelector({
  currency,
  onPaymentMethodChange,
  className = ''
}: AdvancedSelectorProps) {
  const [paymentMode, setPaymentMode] = useState<'mobile-till' | 'paybill'>('mobile-till');
  const [paymentInput, setPaymentInput] = useState('');
  const [paybillNumber, setPaybillNumber] = useState('');
  const [paybillAccount, setPaybillAccount] = useState('');
  const [currentDestination, setCurrentDestination] = useState(detectPaymentDestination(''));

  // Update payment method when inputs change
  useEffect(() => {
    let result: PaymentMethodData | null = null;

    if (paymentMode === 'paybill') {
      // Paybill mode - validate both paybill number and account, check if blocked
      if (paybillNumber.trim() && paybillAccount.trim()) {
        const destination = detectPaybillWithAccount(paybillNumber, paybillAccount);
        setCurrentDestination(destination);

        // Only set result if valid AND not blocked
        if (destination.isValid && !isPaybillBlocked(paybillNumber)) {
          result = {
            type: 'paybill',
            value: destination.value,
            formatted: destination.formatted,
            paybillAccount: destination.accountNumber
          };
        }
      }
    } else {
      // Mobile/Till mode - validate phone or till number
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
  }, [paymentInput, paybillNumber, paybillAccount, paymentMode, currency, onPaymentMethodChange]);

  // Don't show for NGN as till numbers aren't supported
  if (currency !== 'KES') {
    return null;
  }

  const getInputStatus = (input: string) => {
    if (!input.trim()) return 'neutral';

    const destination = detectPaymentDestination(input);
    return destination.isValid ? 'valid' : 'invalid';
  };

  const getPaybillStatus = () => {
    if (!paybillNumber.trim() || !paybillAccount.trim()) return 'neutral';

    const destination = detectPaybillWithAccount(paybillNumber, paybillAccount);
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
      {/* Payment Mode Selector */}
      <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl p-1 flex gap-1">
        <button
          type="button"
          onClick={() => setPaymentMode('mobile-till')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            paymentMode === 'mobile-till'
              ? 'bg-[#5e5ce6] text-white'
              : 'text-[#8e8e93] hover:text-white'
          }`}
        >
          Phone / Till
        </button>
        <button
          type="button"
          onClick={() => setPaymentMode('paybill')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            paymentMode === 'paybill'
              ? 'bg-[#5e5ce6] text-white'
              : 'text-[#8e8e93] hover:text-white'
          }`}
        >
          Paybill
        </button>
      </div>

      {/* Mobile/Till Input */}
      {paymentMode === 'mobile-till' && (
        <FormInput
          label="Phone Number or Till Number"
          type="text"
          value={paymentInput}
          onChange={setPaymentInput}
          placeholder="Enter phone (+254...) or till (12345)"
          success={getInputStatus(paymentInput) === 'valid'}
          error={getInputStatus(paymentInput) === 'invalid' && paymentInput.trim() ? 'Invalid format' : undefined}
          helperText={helperText}
          statusIcon={statusIcon}
        />
      )}

      {/* Paybill Inputs */}
      {paymentMode === 'paybill' && (
        <div className="space-y-3">
          <FormInput
            label="Paybill Number"
            type="text"
            value={paybillNumber}
            onChange={setPaybillNumber}
            placeholder="Enter paybill number (e.g., 522522)"
            success={paybillNumber.trim().length >= 5 && paybillNumber.trim().length <= 7 && !isPaybillBlocked(paybillNumber)}
            error={
              paybillNumber.trim() && isPaybillBlocked(paybillNumber)
                ? 'This paybill is not supported'
                : paybillNumber.trim() && (paybillNumber.trim().length < 5 || paybillNumber.trim().length > 7)
                ? 'Must be 5-7 digits'
                : undefined
            }
            helperText={
              paybillNumber.trim() && isPaybillBlocked(paybillNumber)
                ? 'This paybill number is blocked by our payment provider. Please use a different payment method.'
                : paybillNumber.trim()
                ? 'M-Pesa paybill numbers are typically 5-7 digits'
                : undefined
            }
          />
          <FormInput
            label="Account Number or Name"
            type="text"
            value={paybillAccount}
            onChange={setPaybillAccount}
            placeholder="Enter account number or name"
            success={getPaybillStatus() === 'valid'}
            error={paybillAccount.trim() && getPaybillStatus() === 'invalid' ? 'Account is required' : undefined}
            helperText={paybillAccount.trim() ? 'Some paybills use account numbers, others use account names' : 'Enter the account number or name for this paybill'}
          />
          {getPaybillStatus() === 'valid' && !isPaybillBlocked(paybillNumber) && (
            <div className="text-xs text-green-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Valid paybill details</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}