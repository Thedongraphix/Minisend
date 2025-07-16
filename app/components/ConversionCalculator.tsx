"use client";

import { useState, useEffect } from 'react'

interface ConversionCalculatorProps {
  usdcAmount: number;
  onKshChange: (amount: number) => void;
}

export function ConversionCalculator({ usdcAmount, onKshChange }: ConversionCalculatorProps) {
  const [exchangeRate] = useState(129.2) // Current USDC to KSH rate
  const [fees, setFees] = useState(0)
  const [isLoadingRate, setIsLoadingRate] = useState(false)

  useEffect(() => {
    // Calculate fees based on amount (2-4% for M-Pesa)
    const feePercentage = usdcAmount > 100 ? 0.02 : 0.04
    const calculatedFees = usdcAmount * exchangeRate * feePercentage
    setFees(calculatedFees)
    
    const kshAmount = Math.max(0, (usdcAmount * exchangeRate) - calculatedFees)
    onKshChange(kshAmount)
  }, [usdcAmount, exchangeRate, onKshChange])

  // Function to fetch live exchange rate (placeholder)
  const refreshExchangeRate = async () => {
    setIsLoadingRate(true)
    try {
      // In production, fetch from a real API like CoinGecko or your provider
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      // setExchangeRate(newRate)
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error)
    } finally {
      setIsLoadingRate(false)
    }
  }

  const kshAmount = Math.max(0, (usdcAmount * exchangeRate) - fees)

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl shadow-lg border border-green-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full -translate-y-12 -translate-x-12"></div>
      
      <div className="relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Conversion Details</h3>
          <button
            onClick={refreshExchangeRate}
            disabled={isLoadingRate}
            className="flex items-center space-x-2 text-sm text-green-700 hover:text-green-800 bg-green-100 hover:bg-green-200 px-3 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${isLoadingRate ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isLoadingRate ? 'Updating...' : 'Refresh Rate'}</span>
          </button>
        </div>
        
        {/* Main conversion display */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100 mb-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">You&apos;ll receive</div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              KSH {kshAmount.toFixed(2)}
            </div>
            <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg inline-block">
              🇰🇪 Direct to M-Pesa
            </div>
          </div>
        </div>
        
        {/* Breakdown */}
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
            <div className="flex justify-between items-center text-gray-700">
              <span className="font-medium">Exchange Rate:</span>
              <span className="font-semibold">1 USDC = {exchangeRate} KSH</span>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
            <div className="flex justify-between items-center text-gray-700">
              <span className="font-medium">Gross Amount:</span>
              <span className="font-semibold">KSH {(usdcAmount * exchangeRate).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
            <div className="flex justify-between items-center text-gray-700">
              <span className="font-medium">Processing Fee:</span>
              <span className="font-semibold text-orange-600">
                KSH {fees.toFixed(2)} ({(fees / (usdcAmount * exchangeRate) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
        
        {usdcAmount > 0 && (
          <div className="mt-4 p-4 bg-green-100 rounded-xl border border-green-200">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-green-800 font-medium text-sm">Fee Optimization Tip</p>
                <p className="text-green-700 text-sm">
                  Amounts over $100 USDC get lower fees ({usdcAmount > 100 ? '2%' : 'Currently 4%, upgrade to 2% with $100+'})
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 