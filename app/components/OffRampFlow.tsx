"use client";

import { useState } from 'react'
import { USDCBalance } from './USDCBalance'
import { ConversionCalculator } from './ConversionCalculator'
import { MPesaForm } from './MPesaForm'
import { useAccount } from 'wagmi'

interface TransactionResult {
  usdcTxHash: string;
  mpesaReference: string;
}

export function OffRampFlow() {
  const { address, isConnected } = useAccount()
  const [usdcAmount, setUsdcAmount] = useState(0)
  const [kshAmount, setKshAmount] = useState(0)
  const [step, setStep] = useState(1) // 1: Amount, 2: M-Pesa, 3: Confirm, 4: Processing, 5: Success
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null)
  const [error, setError] = useState('')

  const handleMPesaSubmit = async (mpesaData: { phoneNumber: string; amount: number }) => {
    setStep(4)
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
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setTransactionResult({
          usdcTxHash: data.usdcTxHash,
          mpesaReference: data.mpesaReference
        })
        setStep(5) // Success step
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

  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  if (!isConnected) {
    return (
      <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600 mb-6">Please connect your wallet to continue with USDC off-ramp to M-Pesa</p>
        <div className="text-sm text-gray-500">
          Make sure you have USDC on Base network
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">USDC to M-Pesa</h1>
        <p className="text-gray-600 mt-1">Convert your USDC to Kenyan Shillings</p>
      </div>

      {/* Progress indicator */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((stepNum) => (
            <div
              key={stepNum}
              className={`w-3 h-3 rounded-full ${
                stepNum <= step
                  ? stepNum === step
                    ? 'bg-blue-600'
                    : 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-red-800 font-medium">Transaction Failed</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* USDC Balance */}
      <USDCBalance />
      
      {/* Step 1: Amount Input */}
      {step >= 1 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Convert (USDC)
          </label>
          <input
            type="number"
            value={usdcAmount || ''}
            onChange={(e) => setUsdcAmount(parseFloat(e.target.value) || 0)}
            placeholder="Enter USDC amount"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="1"
            max="1000" // Compliance limit
            step="0.01"
          />
          <div className="text-xs text-gray-500 mt-1">
            Minimum: $1 USDC • Maximum: $1,000 USDC
          </div>
          {usdcAmount > 0 && step === 1 && (
            <button
              onClick={() => setStep(2)}
              className="w-full mt-4 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Continue to Payment Details
            </button>
          )}
        </div>
      )}
      
      {/* Step 2+: Conversion Calculator */}
      {step >= 2 && usdcAmount > 0 && (
        <ConversionCalculator 
          usdcAmount={usdcAmount} 
          onKshChange={setKshAmount}
        />
      )}
      
      {/* Step 2+: M-Pesa Form */}
      {step >= 2 && step < 4 && kshAmount > 0 && (
        <MPesaForm 
          kshAmount={kshAmount}
          onSubmit={handleMPesaSubmit}
        />
      )}
      
      {/* Step 4: Processing */}
      {step === 4 && (
        <div className="text-center p-8 bg-blue-50 rounded-lg border border-blue-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Processing Transaction</h3>
          <p className="text-blue-700">
            Converting your USDC and initiating M-Pesa payment...
          </p>
          <div className="text-sm text-blue-600 mt-2">
            This may take 1-3 minutes
          </div>
        </div>
      )}
      
      {/* Step 5: Success */}
      {step === 5 && transactionResult && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Transaction Successful!</h3>
            <p className="text-green-700">
              KSH {kshAmount.toFixed(2)} has been sent to your M-Pesa account
            </p>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="bg-white p-3 rounded border">
              <div className="flex justify-between">
                <span className="text-gray-600">USDC Transaction:</span>
                <span className="font-mono text-blue-600">
                  {formatTxHash(transactionResult.usdcTxHash)}
                </span>
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="flex justify-between">
                <span className="text-gray-600">M-Pesa Reference:</span>
                <span className="font-mono text-green-600">
                  {transactionResult.mpesaReference}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={resetFlow}
            className="w-full mt-4 bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 font-medium"
          >
            Make Another Transaction
          </button>
        </div>
      )}
      
      {/* Back button for steps 2-3 */}
      {(step === 2 || step === 3) && (
        <button
          onClick={() => setStep(step - 1)}
          className="w-full text-gray-600 p-2 rounded-lg hover:bg-gray-100 text-sm"
        >
          ← Back
        </button>
      )}
    </div>
  )
} 