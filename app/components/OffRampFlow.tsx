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
      <div className="glass-effect rounded-3xl p-8 card-shadow relative overflow-hidden">
        {/* Subtle background mesh */}
        <div className="absolute inset-0 gradient-mesh opacity-30"></div>
        
        <div className="relative text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl flex items-center justify-center mb-8 shadow-xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Connect Your Wallet</h2>
          <p className="text-gray-300 text-lg mb-6 leading-relaxed">Connect your wallet to start converting USDC to M-Pesa</p>
          <div className="inline-flex items-center space-x-2 text-sm text-blue-300 bg-blue-500/20 px-4 py-3 rounded-2xl border border-blue-400/30 backdrop-blur-sm">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            <span className="font-medium">Connect to {networkConfig.name}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-8">
      {/* Premium Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl flex items-center justify-center mb-6 card-shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">USDC to M-Pesa</h1>
        <p className="text-gray-300 text-lg font-medium">Convert your USDC to Kenyan Shillings</p>
        
        {/* Premium Network indicator */}
        <div className="inline-flex items-center space-x-3 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-2xl mt-4 border border-white/10">
          <div className={`w-3 h-3 rounded-full ${isTestnetNetwork ? 'bg-orange-400' : 'bg-green-400'} shadow-lg`}></div>
          <span className="text-sm text-gray-300 font-medium">
            {networkConfig.name} {isTestnetNetwork ? '(Testnet)' : ''}
          </span>
        </div>
      </div>

      {/* Premium Progress indicator */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-3">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  stepNum < step
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg'
                    : stepNum === step
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'bg-white/5 text-gray-400 border border-white/10'
                }`}
              >
                {stepNum < step ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : stepNum}
              </div>
              {stepNum < 4 && (
                <div className={`w-12 h-1 mx-2 rounded-full transition-all duration-300 ${
                  stepNum < step ? 'bg-green-500' : 'bg-white/10'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Premium Error Display */}
      {error && (
        <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-2xl p-6 card-shadow">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-red-300 font-bold text-lg mb-1">Transaction Failed</h3>
              <p className="text-red-200 text-sm leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* USDC Balance */}
      <DirectUSDCBalance />
      
      {/* Step 1: Premium Amount Input */}
      {step >= 1 && (
        <div className="glass-effect rounded-3xl p-8 card-shadow">
          <label className="block text-xl font-bold text-white mb-6 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">1</span>
            </div>
            <span className="tracking-tight">Amount to Convert</span>
          </label>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <span className="text-gray-300 text-xl font-bold">$</span>
            </div>
            <input
              type="number"
              value={usdcAmount || ''}
              onChange={(e) => setUsdcAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter USDC amount"
              className="w-full pl-12 pr-20 py-5 text-2xl font-bold bg-white/5 backdrop-blur-sm border-2 border-white/20 text-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
              min="1"
              max="1000"
              step="0.01"
            />
           
          </div>
          
          <div className="flex justify-between text-sm text-gray-400 mt-4 px-1">
            <span className="font-medium">Min: $1 USDC</span>
            <span className="font-medium">Max: $1,000 USDC</span>
          </div>
          
          {usdcAmount > 0 && step === 1 && (
            <button
              onClick={() => setStep(2)}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] card-shadow-lg"
            >
              Continue to M-Pesa Payment →
            </button>
          )}
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
      
      {/* Step 3: Premium Processing */}
      {step === 3 && (
        <div className="glass-effect rounded-3xl p-8 card-shadow relative overflow-hidden">
          {/* Subtle background mesh */}
          <div className="absolute inset-0 gradient-mesh opacity-30"></div>
          
          <div className="relative text-center">
            <div className="w-24 h-24 mx-auto mb-8 relative">
              <div className="animate-spin rounded-full h-24 w-24 border-4 border-white/20 border-t-blue-500 shadow-lg"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm"></div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Sending KSH to M-Pesa</h3>
            <p className="text-gray-300 text-lg mb-6 leading-relaxed">
              Processing B2C payment. Money is being sent to your M-Pesa wallet...
            </p>
            <div className="inline-flex items-center space-x-3 text-sm text-blue-300 bg-blue-500/20 px-6 py-3 rounded-2xl border border-blue-400/30 backdrop-blur-sm">
              <span className="text-2xl">💰</span>
              <span className="font-medium">No PIN required - you will receive the money automatically</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Step 4: Premium Success */}
      {step === 4 && transactionResult && (
        <div className="glass-effect rounded-3xl p-8 card-shadow relative overflow-hidden">
          {/* Subtle background mesh */}
          <div className="absolute inset-0 gradient-mesh opacity-30"></div>
          
          <div className="relative">
            <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">
                KSH Sent to M-Pesa! 💰
              </h3>
              <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                {transactionResult.message}
              </p>
              {transactionResult.customerMessage && (
                <p className="text-green-300 text-sm bg-green-500/20 p-4 rounded-2xl border border-green-400/30 backdrop-blur-sm">
                  {transactionResult.customerMessage}
                </p>
              )}
            </div>
            
            <div className="space-y-4 mb-8">
              {transactionResult.checkoutRequestID && (
                <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium">Checkout Request ID</span>
                    <span className="font-mono text-green-400 font-bold text-sm">
                      {transactionResult.checkoutRequestID.slice(-8)}
                    </span>
                  </div>
                </div>
              )}
              <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Reference</span>
                  <span className="font-mono text-green-400 font-bold">
                    {transactionResult.mpesaReference}
                  </span>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Network</span>
                  <span className="font-bold text-white">
                    {networkConfig.name} {isTestnetNetwork ? '(Testnet)' : ''}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mb-8 p-6 bg-blue-500/10 border border-blue-400/20 rounded-2xl backdrop-blur-sm">
              <h4 className="font-bold text-blue-300 mb-4 text-lg">What Happens Next:</h4>
              <ol className="text-gray-300 text-sm space-y-2 leading-relaxed">
                <li className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Money is automatically sent to your M-Pesa wallet</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>You&apos;ll receive an SMS: &quot;You have received KSH X.XX&quot;</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>No PIN required - the money appears in your M-Pesa balance</span>
                </li>
              </ol>
            </div>
            
            <button
              onClick={resetFlow}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-5 px-6 rounded-2xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 card-shadow-lg"
            >
              Make Another Transaction
            </button>
          </div>
        </div>
      )}
      
      {/* Premium Back button for step 2 */}
      {step === 2 && (
        <button
          onClick={() => setStep(1)}
          className="w-full glass-effect text-gray-300 hover:text-white p-4 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3 border border-white/10 hover:border-white/20 transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Amount</span>
        </button>
      )}
    </div>
  )
} 