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
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100 to-red-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
      
      <div className="relative">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">M-Pesa Payment Details</h3>
            <p className="text-gray-600">Enter your Safaricom number</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              M-Pesa Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500 font-medium">🇰🇪</span>
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="0712345678 or +254712345678"
                className={`w-full pl-12 pr-4 py-4 text-lg font-medium text-gray-900 placeholder-gray-400 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all duration-200 ${
                  error ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                required
              />
              {isValid && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}
            <p className="text-gray-500 text-sm mt-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Enter your Safaricom M-Pesa registered number
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">Amount to receive:</span>
              <span className="text-2xl font-bold text-green-700">KSH {kshAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center text-sm text-green-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              You&apos;ll receive an M-Pesa confirmation SMS
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid || isValidating}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg ${
              isValid && !isValidating
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transform hover:scale-[1.02]'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isValidating ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                <span>Processing Payment...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span>Send KSH {kshAmount.toFixed(2)} to M-Pesa</span>
              </div>
            )}
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500 bg-gray-50 px-4 py-2 rounded-lg inline-block">
              🔒 Secure transaction • Processing fee included • Terms apply
            </p>
          </div>
        </form>
      </div>
    </div>
  )
} 