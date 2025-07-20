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
    <div className="relative w-full max-w-md mx-auto">
      {/* Premium M-Pesa Payment Card */}
      <div className="relative w-full rounded-3xl card-shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
        {/* Card Background with Premium Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
          {/* Dynamic mesh gradient overlay */}
          <div className="absolute inset-0 gradient-mesh opacity-40"></div>
          
          {/* Floating elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-6 right-6 w-12 h-12 border border-orange-400 rounded-full animate-pulse"></div>
            <div className="absolute bottom-4 left-4 w-6 h-6 border border-green-400 rounded-full"></div>
            <div className="absolute top-1/3 left-6 w-8 h-8 border border-white rounded-full"></div>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">🇰🇪</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">M-Pesa Payment</h3>
              <p className="text-gray-400 text-sm">Enter Safaricom number</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <span className="text-lg">🇰🇪</span>
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="0712345678"
                className={`w-full pl-12 pr-12 py-4 text-base font-medium text-white placeholder-gray-400 bg-white/5 border-2 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:bg-white/10 transition-all duration-200 backdrop-blur-sm ${
                  error ? 'border-red-400 bg-red-500/10' : 'border-white/20'
                }`}
                required
              />
              {isValid && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Amount Display */}
            <div className="bg-green-500/10 border border-green-400/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm font-medium">You Receive</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">KSH {kshAmount.toFixed(2)}</div>
                  <div className="text-xs text-green-300">Direct to M-Pesa</div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid || isValidating}
              className={`w-full py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 ${
                isValid && !isValidating
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-orange-400 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600'
              }`}
            >
              {isValidating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span>Send to M-Pesa</span>
                </div>
              )}
            </button>

            {/* Security Footer */}
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <span>🔒</span>
              <span>Secure • Instant • No PIN required</span>
            </div>
          </form>
        </div>
        
        {/* Subtle border glow */}
        <div className="absolute inset-0 rounded-3xl border border-white/10"></div>
      </div>
    </div>
  )
} 