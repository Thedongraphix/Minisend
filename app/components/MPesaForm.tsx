"use client";

import { useState } from 'react'

interface MPesaFormProps {
  kshAmount: number;
  onSubmit: (data: { phoneNumber: string; amount: number }) => Promise<void>;
}

export function MPesaForm({ kshAmount, onSubmit }: MPesaFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')

  const validateKenyanPhone = (phone: string) => {
    // Kenyan phone format: +254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX
    const regex = /^(\+254|0)[17]\d{8}$/
    return regex.test(phone)
  }

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('0')) {
      return '+254' + phone.substring(1)
    }
    return phone
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPhoneNumber(value)
    setError('')
    
    // Real-time validation feedback
    if (value && !validateKenyanPhone(value)) {
      setError('Please enter a valid Kenyan phone number')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateKenyanPhone(phoneNumber)) {
      setError('Please enter a valid Kenyan phone number')
      return
    }

    if (kshAmount <= 0) {
      setError('Invalid amount')
      return
    }

    setIsValidating(true)
    setError('')
    
    try {
      await onSubmit({
        phoneNumber: formatPhoneNumber(phoneNumber),
        amount: kshAmount
      })
    } catch (error) {
      console.error('M-Pesa submission error:', error)
      setError('Failed to process payment. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const isValid = validateKenyanPhone(phoneNumber) && kshAmount > 0

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">M-Pesa Payment Details</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            M-Pesa Phone Number
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder="0712345678 or +254712345678"
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Enter your Safaricom M-Pesa registered number
          </p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Amount to receive:</span>
            <span className="font-semibold">KSH {kshAmount.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            You'll receive an M-Pesa payment confirmation SMS
          </p>
        </div>

        <button
          type="submit"
          disabled={!isValid || isValidating}
          className={`w-full p-3 rounded-lg font-medium transition-colors ${
            isValid && !isValidating
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isValidating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </div>
          ) : (
            `Send KSH ${kshAmount.toFixed(2)} to M-Pesa`
          )}
        </button>

        <div className="text-xs text-gray-500 text-center">
          By proceeding, you agree to our terms and conditions.
          Processing fee is already included in the amount shown.
        </div>
      </form>
    </div>
  )
} 