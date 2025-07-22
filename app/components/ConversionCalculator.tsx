"use client";

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface ConversionCalculatorProps {
  usdcAmount: number;
  onKshChange: (amount: number) => void;
  provider?: 'paycrest';
  onRateChange?: (rate: number) => void;
}

export function ConversionCalculator({ usdcAmount, onKshChange, provider = 'paycrest', onRateChange }: ConversionCalculatorProps) {
  const [exchangeRate] = useState(129.2) // Current USDC to KSH rate
  const [fees, setFees] = useState(0)
  const [isLoadingRate, setIsLoadingRate] = useState(false)

  useEffect(() => {
    // Calculate fees based on provider and amount
    const feePercentage = 0.01; // 1% fee for PayCrest
    const calculatedFees = usdcAmount * exchangeRate * feePercentage;
    
    setFees(calculatedFees);
    
    const kshAmount = Math.max(0, (usdcAmount * exchangeRate) - calculatedFees);
    onKshChange(kshAmount);
    
    // Notify parent component of current rate
    if (onRateChange) {
      onRateChange(exchangeRate);
    }
  }, [usdcAmount, exchangeRate, provider, onKshChange, onRateChange])

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
    <div className="relative w-full max-w-md mx-auto">
      {/* Premium Conversion Card */}
      <div className="relative w-full rounded-3xl card-shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
        {/* Card Background with Premium Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
          {/* Dynamic mesh gradient overlay */}
          <div className="absolute inset-0 gradient-mesh opacity-40"></div>
          
          {/* Floating elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-16 h-16 border border-blue-400 rounded-full animate-pulse"></div>
            <div className="absolute bottom-6 left-6 w-8 h-8 border border-green-400 rounded-full"></div>
            <div className="absolute top-1/2 left-4 w-12 h-12 border border-white rounded-full"></div>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="relative z-10 p-8">
          {/* Header with Base logo and refresh */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <Image 
                src="/Base_Network_Logo.svg" 
                alt="Base Network" 
                width={20}
                height={20}
                className="opacity-80"
              />
              <span className="text-gray-400 text-sm font-medium tracking-wide">Live Rate</span>
            </div>
          <button
            onClick={refreshExchangeRate}
            disabled={isLoadingRate}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200"
          >
              <svg className={`w-4 h-4 text-white ${isLoadingRate ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
          {/* Main Conversion Display */}
          <div className="text-center mb-8">
            <div className="text-xs text-gray-400 font-medium tracking-[0.2em] uppercase mb-3">You Receive</div>
            <div className="text-4xl font-bold text-white mb-4 tracking-tight">
              KSH {kshAmount.toFixed(2)}
            </div>
            <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border ${
              provider === 'paycrest' 
                ? 'bg-blue-500/20 border-blue-400/30' 
                : 'bg-green-500/20 border-green-400/30'
            }`}>
              <span className="text-sm">{provider === 'paycrest' ? '⚡' : '🇰🇪'}</span>
              <span className={`text-xs font-medium ${
                provider === 'paycrest' ? 'text-blue-300' : 'text-green-300'
              }`}>
                {provider === 'paycrest' ? 'Via PayCrest' : 'Direct to M-Pesa'}
              </span>
          </div>
        </div>
        
          {/* Rate & Fee Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Rate</div>
              <div className="text-white font-bold text-sm">{exchangeRate} KSH</div>
              <div className="text-xs text-gray-500">per USDC</div>
          </div>
          
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Fee</div>
              <div className="text-orange-400 font-bold text-sm">{(fees / (usdcAmount * exchangeRate) * 100).toFixed(1)}%</div>
              <div className="text-xs text-gray-500">KSH {fees.toFixed(2)}</div>
            </div>
          </div>
          
          {/* Provider-specific Fee Information */}
          {usdcAmount > 0 && (
            <div className={`p-4 rounded-xl border transition-all duration-300 ${
              provider === 'paycrest'
                ? 'bg-blue-500/10 border-blue-400/30'
                : usdcAmount > 100 
                  ? 'bg-green-500/10 border-green-400/30' 
                  : 'bg-orange-500/10 border-orange-400/30'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  provider === 'paycrest' 
                    ? 'bg-blue-400'
                    : usdcAmount > 100 ? 'bg-green-400' : 'bg-orange-400'
                }`}></div>
                <span className={`text-sm font-medium ${
                  provider === 'paycrest'
                    ? 'text-blue-300'
                    : usdcAmount > 100 ? 'text-green-300' : 'text-orange-300'
                }`}>
                  {provider === 'paycrest' 
                    ? 'Lower fees • Manual payment required'
                    : usdcAmount > 100 
                      ? 'Premium Rate Active • Automatic'
                      : '$100+ for Premium Rate • Automatic'
                  }
              </span>
            </div>
          </div>
          )}
        </div>
        
        {/* Subtle border glow */}
        <div className="absolute inset-0 rounded-3xl border border-white/10"></div>
      </div>
    </div>
  )
} 