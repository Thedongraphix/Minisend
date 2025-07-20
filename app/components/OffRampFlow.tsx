"use client";

import { useState } from 'react'
import { DirectUSDCBalance } from './DirectUSDCBalance'
import { ConversionCalculator } from './ConversionCalculator'
import { MPesaForm } from './MPesaForm'
import { useAccount, useChainId } from 'wagmi'
import { getNetworkConfig, isTestnet } from '@/lib/contracts'

interface TransactionResult {
  checkoutRequestID?: string;
  merchantRequestID?: string;
  mpesaReference: string;
  message: string;
  customerMessage?: string;
}

export function OffRampFlow() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [usdcAmount, setUsdcAmount] = useState(0)
  const [kshAmount, setKshAmount] = useState(0)
  const [step, setStep] = useState(1) // 1: Amount, 2: M-Pesa, 3: Processing, 4: Success
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null)
  const [error, setError] = useState('')

  const networkConfig = getNetworkConfig(chainId)
  const isTestnetNetwork = isTestnet(chainId)

  const handleMPesaSubmit = async (mpesaData: { phoneNumber: string; amount: number }) => {
    setStep(3)
    setError('')
    
    try {
      // Submit to your backend API
      const response = await fetch('/api/offramp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          usdcAmount,
          kshAmount,
          phoneNumber: mpesaData.phoneNumber,
          provider: 'mpesa',
          chainId
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setTransactionResult({
          checkoutRequestID: data.checkoutRequestID,
          merchantRequestID: data.merchantRequestID,
          mpesaReference: data.mpesaReference,
          message: data.message,
          customerMessage: data.customerMessage
        })
        setStep(4) // Success step
      } else {
        throw new Error(data.error || 'Transaction failed')
      }
    } catch (error) {
      console.error('Off-ramp error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
      setStep(2) // Back to M-Pesa form
    }
  }

  const resetFlow = () => {
    setStep(1)
    setUsdcAmount(0)
    setKshAmount(0)
    setTransactionResult(null)
    setError('')
  }

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center p-8 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
          {/* Premium background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-slate-800/20"></div>
          <div className="absolute -top-2 -right-2 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-2 -left-2 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-3xl flex items-center justify-center mb-6 shadow-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-500 rounded-3xl opacity-20 animate-pulse"></div>
              <svg className="w-12 h-12 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-100 mb-4 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">Connect Your Wallet</h2>
            <p className="text-slate-300 mb-6 leading-relaxed text-lg">Connect your wallet to start converting USDC to M-Pesa instantly</p>
            <div className="text-sm text-blue-300 bg-blue-500/10 backdrop-blur-sm p-4 rounded-xl border border-blue-500/20">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <span>Secure connection to {networkConfig.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-8 min-h-screen relative">
      {/* Premium Header */}
      <div className="text-center pt-6 pb-4">
        <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-3xl mb-6 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-3xl opacity-30 animate-pulse"></div>
          <svg className="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 via-blue-100 to-slate-100 bg-clip-text text-transparent mb-3">USDC to M-Pesa</h1>
        <p className="text-slate-300 text-lg mb-4">Convert your USDC to Kenyan Shillings instantly</p>
        
        {/* Premium Network indicator */}
        <div className="inline-flex items-center justify-center space-x-3 bg-slate-800/40 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-700/50">
          <div className={`w-2.5 h-2.5 rounded-full ${isTestnetNetwork ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
          <span className={`text-sm font-medium ${isTestnetNetwork ? 'text-amber-300' : 'text-emerald-300'}`}>
            {networkConfig.name} {isTestnetNetwork ? '(Testnet)' : ''}
          </span>
          <div className="w-1 h-1 rounded-full bg-slate-500"></div>
          <span className="text-xs text-slate-400">Live</span>
        </div>
      </div>

      {/* Premium Progress indicator */}
      <div className="flex justify-center mb-10">
        <div className="relative bg-slate-900/40 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50 shadow-2xl">
          <div className="flex space-x-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-500 relative overflow-hidden ${
                      stepNum < step
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl'
                        : stepNum === step
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl ring-4 ring-blue-400/30'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                    }`}
                  >
                    {stepNum < step && (
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-500 opacity-30 animate-pulse rounded-2xl"></div>
                    )}
                    {stepNum === step && (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-500 opacity-30 animate-pulse rounded-2xl"></div>
                    )}
                    <span className="relative z-10">
                      {stepNum < step ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : stepNum}
                    </span>
                  </div>
                </div>
                {stepNum < 4 && (
                  <div className={`w-12 h-1 mx-3 rounded-full transition-all duration-500 relative ${
                    stepNum < step ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-slate-700/50'
                  }`}>
                    {stepNum < step && (
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-300 opacity-50 animate-pulse rounded-full"></div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Step labels */}
          <div className="flex justify-between mt-3 px-1">
            <span className="text-xs text-slate-400 text-center w-12">Amount</span>
            <span className="text-xs text-slate-400 text-center w-12 ml-16">Details</span>
            <span className="text-xs text-slate-400 text-center w-12 ml-16">Process</span>
            <span className="text-xs text-slate-400 text-center w-12 ml-16">Success</span>
          </div>
        </div>
      </div>

      {/* Premium Error Display */}
      {error && (
        <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-red-600/5"></div>
          <div className="relative z-10">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-red-300 font-bold text-lg">Transaction Failed</h3>
                <p className="text-red-200 text-sm mt-2 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* USDC Balance */}
      <DirectUSDCBalance />
      
      {/* Premium Step 1: Amount Input */}
      {step >= 1 && (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-slate-800/10"></div>
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <label className="block text-xl font-bold text-slate-100 mb-6 flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <span>Amount to Convert</span>
            </label>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none z-10">
                <span className="text-slate-400 text-xl font-bold">$</span>
              </div>
              <input
                type="number"
                value={usdcAmount || ''}
                onChange={(e) => setUsdcAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter USDC amount"
                className="w-full pl-12 pr-6 py-5 text-2xl font-bold text-slate-100 placeholder-slate-500 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-slate-800/70 transition-all duration-300 group-hover:border-slate-500/70"
                min="1"
                max="1000"
                step="0.01"
              />
              <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
                <span className="text-slate-400 text-lg font-medium">USDC</span>
              </div>
            </div>
            
            <div className="flex justify-between text-sm text-slate-400 mt-4 px-2">
              <span className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>Min: $1 USDC</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <span>Max: $1,000 USDC</span>
              </span>
            </div>
            
            {usdcAmount > 0 && step === 1 && (
              <button
                onClick={() => setStep(2)}
                className="w-full mt-8 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white py-5 px-8 rounded-2xl font-bold text-lg hover:from-blue-700 hover:via-blue-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transform hover:scale-[1.02] transition-all duration-300 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <span className="relative flex items-center justify-center space-x-2">
                  <span>Continue to M-Pesa Payment</span>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Step 2: Conversion Calculator */}
      {step >= 2 && usdcAmount > 0 && (
        <div className="transform transition-all duration-500 ease-out">
          <ConversionCalculator 
            usdcAmount={usdcAmount} 
            onKshChange={setKshAmount}
          />
        </div>
      )}
      
      {/* Step 2: M-Pesa Form */}
      {step >= 2 && step < 3 && kshAmount > 0 && (
        <MPesaForm 
          kshAmount={kshAmount}
          onSubmit={handleMPesaSubmit}
        />
      )}
      
      {/* Step 3: Processing */}
      {step === 3 && (
        <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-lg">
          <div className="w-20 h-20 mx-auto mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <h3 className="text-2xl font-bold text-blue-900 mb-2">Sending KSH to M-Pesa</h3>
          <p className="text-blue-700 mb-4">
            Processing B2C payment. Money is being sent to your M-Pesa wallet...
          </p>
          <div className="text-sm text-blue-600 bg-blue-100 px-4 py-2 rounded-lg inline-block">
            💰 No PIN required - you will receive the money automatically
          </div>
        </div>
      )}
      
      {/* Step 4: Success */}
      {step === 4 && transactionResult && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-green-800 mb-2">
              KSH Sent to M-Pesa! 💰
            </h3>
            <p className="text-green-700 text-lg mb-4">
              {transactionResult.message}
            </p>
            {transactionResult.customerMessage && (
              <p className="text-green-600 text-sm bg-green-100 p-3 rounded-lg border border-green-200">
                {transactionResult.customerMessage}
              </p>
            )}
          </div>
          
          <div className="space-y-3">
            {transactionResult.checkoutRequestID && (
              <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Checkout Request ID:</span>
                  <span className="font-mono text-green-600 font-semibold text-sm">
                    {transactionResult.checkoutRequestID.slice(-8)}
                  </span>
                </div>
              </div>
            )}
            <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Reference:</span>
                <span className="font-mono text-green-600 font-semibold">
                  {transactionResult.mpesaReference}
                </span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Network:</span>
                <span className="font-semibold text-gray-700">
                  {networkConfig.name} {isTestnetNetwork ? '(Testnet)' : ''}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h4 className="font-semibold text-blue-800 mb-2">What Happens Next:</h4>
            <ol className="text-blue-700 text-sm space-y-1">
              <li>1. Money is automatically sent to your M-Pesa wallet</li>
              <li>2. You&apos;ll receive an SMS: &quot;You have received KSH X.XX&quot;</li>
              <li>3. No PIN required - the money appears in your M-Pesa balance</li>
            </ol>
          </div>
          
          <button
            onClick={resetFlow}
            className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
          >
            Make Another Transaction
          </button>
        </div>
      )}
      
      {/* Back button for step 2 */}
      {step === 2 && (
        <button
          onClick={() => setStep(1)}
          className="w-full text-gray-600 bg-gray-100 hover:bg-gray-200 p-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      )}
    </div>
  )
} 