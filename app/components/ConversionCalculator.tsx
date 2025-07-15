"use client";

import { useState, useEffect } from 'react'

interface ConversionCalculatorProps {
  usdcAmount: number;
  onKshChange: (amount: number) => void;
}

export function ConversionCalculator({ usdcAmount, onKshChange }: ConversionCalculatorProps) {
  const [exchangeRate, setExchangeRate] = useState(129.2) // Current USDC to KSH rate
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
    <div className="bg-green-50 p-4 rounded-lg border border-green-200 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-green-900">Conversion Details</h3>
        <button
          onClick={refreshExchangeRate}
          disabled={isLoadingRate}
          className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
        >
          {isLoadingRate ? '🔄' : '↻'} Refresh Rate
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-green-700">You'll receive:</span>
          <span className="font-bold text-green-900">KSH {kshAmount.toFixed(2)}</span>
        </div>
        
        <div className="text-sm text-green-600 space-y-1 pt-2 border-t border-green-200">
          <div className="flex justify-between">
            <span>Exchange Rate:</span>
            <span>1 USDC = {exchangeRate} KSH</span>
          </div>
          <div className="flex justify-between">
            <span>Processing Fee:</span>
            <span>KSH {fees.toFixed(2)} ({(fees / (usdcAmount * exchangeRate) * 100).toFixed(1)}%)</span>
          </div>
          <div className="flex justify-between">
            <span>Gross Amount:</span>
            <span>KSH {(usdcAmount * exchangeRate).toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {usdcAmount > 0 && (
        <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
          💡 Tip: Larger amounts have lower fee percentages
        </div>
      )}
    </div>
  )
} 