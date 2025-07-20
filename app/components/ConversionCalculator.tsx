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
    <div className="glass-effect rounded-3xl p-8 card-shadow relative overflow-hidden">
      {/* Subtle background mesh */}
      <div className="absolute inset-0 gradient-mesh opacity-30"></div>
      
      <div className="relative">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <img 
              src="/Base_Network_Logo.svg" 
              alt="Base Network" 
              className="w-6 h-6"
            />
            <h3 className="text-2xl font-bold text-white tracking-tight">Conversion Details</h3>
          </div>
          <button
            onClick={refreshExchangeRate}
            disabled={isLoadingRate}
            className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 border border-white/10"
          >
            <svg className={`w-4 h-4 ${isLoadingRate ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="font-medium">{isLoadingRate ? 'Updating...' : 'Refresh Rate'}</span>
          </button>
        </div>
        
        {/* Main conversion display */}
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm p-8 rounded-2xl border border-blue-500/20 mb-6">
          <div className="text-center">
            <div className="text-sm text-gray-300 font-medium mb-3 tracking-wide">You&apos;ll receive</div>
            <div className="text-5xl font-bold text-white mb-4 tracking-tight">
              KSH {kshAmount.toFixed(2)}
            </div>
            <div className="inline-flex items-center space-x-2 text-sm text-blue-300 bg-blue-500/20 px-4 py-2 rounded-xl border border-blue-400/30">
              <span className="text-lg">🇰🇪</span>
              <span className="font-medium">Direct to M-Pesa</span>
            </div>
          </div>
        </div>
        
        {/* Breakdown */}
        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-300">Exchange Rate</span>
              <span className="font-bold text-white">1 USDC = {exchangeRate} KSH</span>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-300">Gross Amount</span>
              <span className="font-bold text-white">KSH {(usdcAmount * exchangeRate).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-300">Processing Fee</span>
              <span className="font-bold text-orange-400">
                KSH {fees.toFixed(2)} ({(fees / (usdcAmount * exchangeRate) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
        
        {usdcAmount > 0 && (
          <div className="mt-6 p-5 bg-blue-500/10 rounded-xl border border-blue-400/20">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-blue-300 font-semibold text-sm mb-1">Fee Optimization</p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Amounts over $100 USDC get lower fees ({usdcAmount > 100 ? '2% applied' : 'Currently 4%, upgrade to 2% with $100+'})
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 