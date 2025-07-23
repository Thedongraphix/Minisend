"use client";

import { useState } from 'react'
import { DirectUSDCBalance } from './DirectUSDCBalance'
import { ConversionCalculator } from './ConversionCalculator'
import { PaycrestForm } from './PaycrestForm'
import { CurrencySelector, Currency, CURRENCIES } from './CurrencySelector'
import { PaycrestAutomatedOrderCard } from './PaycrestAutomatedOrderCard'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { useAccount, useChainId } from 'wagmi'
import { getNetworkConfig, isTestnet } from '@/lib/contracts'
import { ConnectWallet } from '@coinbase/onchainkit/wallet'
import Image from 'next/image'

interface TransactionResult {
  orderId: string;
  receiveAddress: string;
  message: string;
  status: string;
}

interface PaycrestOrder {
  id: string;
  receiveAddress: string;
  validUntil: string;
  senderFee: string;
  transactionFee: string;
  totalAmount: string;
  status: string;
  recipient: {
    phoneNumber: string;
    accountName: string;
    provider: string;
  };
}

export function OffRampFlow() {
  // Dual wallet system: MiniKit for Farcaster, Wagmi for web
  const { context } = useMiniKit()
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const chainId = useChainId()
  
  // Detect environment and use appropriate wallet
  const isFarcaster = Boolean(context?.user)
  const address = isFarcaster ? (context?.user as { walletAddress?: string })?.walletAddress : wagmiAddress
  const isConnected = isFarcaster ? Boolean(address) : wagmiConnected
  
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('KES')
  const [usdcAmount, setUsdcAmount] = useState(0)
  const [localAmount, setLocalAmount] = useState(0)
  const [step, setStep] = useState(1) // 1: Currency, 2: Amount, 3: Form, 4: Automated Payment, 5: Success
  const [paycrestOrder, setPaycrestOrder] = useState<PaycrestOrder | null>(null)
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null)
  const [error, setError] = useState('')

  const networkConfig = getNetworkConfig(chainId)
  const isTestnetNetwork = isTestnet(chainId)

  const handlePaycrestSubmit = async (paycrestData: { phoneNumber: string; accountName: string; amount: number }) => {
    setStep(4) // Go to automated payment step
    setError('')
    
    try {
      // Submit to Paycrest API
      const response = await fetch('/api/paycrest/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: usdcAmount.toString(),
          phoneNumber: paycrestData.phoneNumber,
          accountName: paycrestData.accountName,
          rate: (localAmount / usdcAmount).toString(),
          returnAddress: address,
          currency: selectedCurrency,
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setPaycrestOrder({
          id: data.order.id,
          receiveAddress: data.order.receiveAddress,
          validUntil: data.order.validUntil,
          senderFee: data.order.senderFee,
          transactionFee: data.order.transactionFee,
          totalAmount: data.order.totalAmount,
          status: data.order.status,
          recipient: {
            phoneNumber: paycrestData.phoneNumber,
            accountName: paycrestData.accountName,
            provider: selectedCurrency === 'KES' ? 'M-Pesa' : 'Bank Transfer'
          }
        })
      } else {
        throw new Error(data.error || 'Transaction failed')
      }
    } catch (error) {
      console.error('Off-ramp error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
      setStep(3) // Back to form step
    }
  }

  const handleAutomatedComplete = () => {
    setStep(5) // Go to success step
  }

  const resetFlow = () => {
    setStep(1)
    setSelectedCurrency('KES')
    setUsdcAmount(0)
    setLocalAmount(0)
    setPaycrestOrder(null)
    setTransactionResult(null)
    setError('')
  }

  if (!isConnected) {
    if (isFarcaster) {
      // Farcaster frame wallet setup
      return (
        <div className="relative w-full max-w-md mx-auto">
          <div className="relative rounded-3xl card-shadow-lg overflow-hidden">
            {/* Premium farcaster wallet background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-blue-800">
              <div className="absolute inset-0 gradient-mesh opacity-40"></div>
              
              {/* Floating farcaster elements */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-6 right-6 w-16 h-16 border border-purple-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-8 left-8 w-10 h-10 border border-blue-400 rounded-full"></div>
                <div className="absolute top-1/2 left-6 w-12 h-12 border border-white rounded-full"></div>
              </div>
            </div>
            
            {/* Farcaster wallet content */}
            <div className="relative z-10 p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-600 to-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl">🎭</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Wallet Setup Needed</h2>
              <p className="text-gray-300 text-base mb-6 leading-relaxed">Please ensure you have wallet access enabled in your Farcaster client</p>
              
              <div className="bg-purple-500/20 px-4 py-3 rounded-xl border border-purple-400/30">
                <div className="flex items-center justify-center space-x-2 text-sm text-purple-300">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">Powered by Farcaster MiniKit</span>
                </div>
              </div>
            </div>
            
            {/* Subtle border */}
            <div className="absolute inset-0 rounded-3xl border border-purple-400/20"></div>
          </div>
        </div>
      )
    } else {
      // Regular web wallet connection
      return (
        <div className="relative w-full max-w-md mx-auto">
          <div className="relative rounded-3xl card-shadow-lg overflow-hidden">
            {/* Premium web wallet background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-black to-green-800">
              <div className="absolute inset-0 gradient-mesh opacity-40"></div>
              
              {/* Floating web elements */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-6 right-6 w-16 h-16 border border-blue-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-8 left-8 w-10 h-10 border border-green-400 rounded-full"></div>
                <div className="absolute top-1/2 left-6 w-12 h-12 border border-white rounded-full"></div>
              </div>
            </div>
            
            {/* Web wallet content */}
            <div className="relative z-10 p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-green-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Connect Wallet</h2>
              <p className="text-gray-300 text-base mb-6 leading-relaxed">Connect your wallet to start converting USDC</p>
              
              {/* OnchainKit Connect Wallet */}
              <ConnectWallet
                text="Connect Wallet"
                className="w-full"
              />
              
              <div className="mt-4 bg-blue-500/20 px-4 py-3 rounded-xl border border-blue-400/30">
                <div className="flex items-center justify-center space-x-2 text-sm text-blue-300">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">Ready for {networkConfig.name}</span>
                </div>
              </div>
            </div>
            
            {/* Subtle border */}
            <div className="absolute inset-0 rounded-3xl border border-blue-400/20"></div>
          </div>
        </div>
      )
    }
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
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">USDC Offramp</h1>
        <p className="text-gray-300 text-lg font-medium">Convert your USDC to local currency</p>
        

        
        {/* Powered by Base indicator */}
        <div className="inline-flex items-center space-x-2 text-xs text-blue-300 bg-blue-500/10 px-3 py-1 rounded-xl mt-2 border border-blue-400/20">
          <Image 
            src="/Base_Network_Logo.svg" 
            alt="Base Network" 
            width={12}
            height={12}
          />
          <span className="font-medium">Powered by Base</span>
        </div>
      </div>

      {/* Premium Progress indicator */}
      <div className="flex justify-center mb-8">
        <div className="relative rounded-2xl card-shadow-lg overflow-hidden">
          {/* Premium background */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-black to-gray-800">
            <div className="absolute inset-0 gradient-mesh opacity-20"></div>
          </div>
          
          {/* Progress content */}
          <div className="relative flex items-center space-x-3 p-4">
          {[1, 2, 3, 4, 5].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  stepNum < step
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg'
                    : stepNum === step
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg animate-pulse'
                    : 'bg-white/5 text-gray-400 border border-white/10'
                }`}
              >
                {stepNum < step ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : stepNum}
              </div>
              {stepNum < 5 && (
                <div className={`w-12 h-1 mx-2 rounded-full transition-all duration-300 ${
                  stepNum < step ? 'bg-green-500' : 'bg-white/10'
                }`}></div>
              )}
            </div>
          ))}
          </div>
          
          {/* Subtle border */}
          <div className="absolute inset-0 rounded-2xl border border-white/10"></div>
        </div>
      </div>

      {/* Premium Error Display */}
      {error && (
        <div className="relative w-full max-w-md mx-auto mb-6">
          <div className="relative rounded-3xl card-shadow-lg overflow-hidden">
            {/* Premium error background */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-black to-red-800">
              <div className="absolute inset-0 gradient-mesh opacity-40"></div>
              
              {/* Floating error elements */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 w-8 h-8 border border-red-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border border-red-400 rounded-full"></div>
              </div>
            </div>
            
            {/* Error content */}
            <div className="relative z-10 p-6">
          <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
                  <h3 className="text-red-300 font-bold text-lg mb-2">Transaction Failed</h3>
              <p className="text-red-200 text-sm leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
            
            {/* Subtle border */}
            <div className="absolute inset-0 rounded-3xl border border-red-400/20"></div>
          </div>
        </div>
      )}
      
      {/* USDC Balance */}
      <DirectUSDCBalance />
      
      {/* Step 1: Currency Selector */}
      {step === 1 && (
        <CurrencySelector 
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
          onContinue={() => setStep(2)}
        />
      )}
      
      {/* Step 2: Premium Amount Input */}
      {step >= 2 && (
        <div className="relative w-full max-w-md mx-auto">
          {/* Premium Amount Input Card */}
          <div className="relative w-full rounded-3xl card-shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
            {/* Card Background with Premium Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
              {/* Dynamic mesh gradient overlay */}
              <div className="absolute inset-0 gradient-mesh opacity-40"></div>
              
              {/* Floating elements */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 w-12 h-12 border border-blue-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-6 left-6 w-6 h-6 border border-green-400 rounded-full"></div>
                <div className="absolute top-1/2 left-4 w-8 h-8 border border-white rounded-full"></div>
              </div>
            </div>
            
            {/* Card Content */}
            <div className="relative z-10 p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">Amount to Convert</h3>
              </div>
              
              {/* Amount Input */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <span className="text-gray-300 text-xl font-bold">$</span>
            </div>
            <input
              type="number"
              value={usdcAmount || ''}
              onChange={(e) => setUsdcAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-16 py-4 text-2xl font-bold bg-white/5 backdrop-blur-sm border-2 border-white/20 text-white rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
              min="1"
              max="1000"
              step="0.01"
            />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-sm font-medium">USDC</span>
                </div>
          </div>
          
              {/* Limits Display */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                  <div className="text-xs text-gray-400 mb-1">Minimum</div>
                  <div className="text-white font-bold text-sm">$1</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                  <div className="text-xs text-gray-400 mb-1">Maximum</div>
                  <div className="text-white font-bold text-sm">$1,000</div>
                </div>
          </div>
          
              {/* Continue Button */}
          {usdcAmount > 0 && step === 2 && (
            <button
              onClick={() => setStep(3)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-bold text-base hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Continue to Payment</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
            </button>
          )}

              {/* Validation Messages */}
              {usdcAmount > 0 && (usdcAmount < 1 || usdcAmount > 1000) && (
                <div className="mt-4 p-3 bg-orange-500/20 border border-orange-400/30 rounded-xl backdrop-blur-sm">
                  <p className="text-orange-300 text-sm font-medium">
                    {usdcAmount < 1 ? 'Minimum amount is $1 USDC' : 'Maximum amount is $1,000 USDC'}
                  </p>
                </div>
              )}
            </div>
            
            {/* Subtle border glow */}
            <div className="absolute inset-0 rounded-3xl border border-white/10"></div>
          </div>
        </div>
      )}
      
      {/* Step 3: Conversion Calculator */}
      {step >= 3 && usdcAmount > 0 && (
        <div className="transform transition-all duration-500 ease-out">
          <ConversionCalculator 
            usdcAmount={usdcAmount} 
            onKshChange={setLocalAmount}
            provider="paycrest"
            currency={selectedCurrency}
          />
        </div>
      )}
      
      {/* Step 3: PayCrest Form */}
      {step === 3 && localAmount > 0 && (
        <PaycrestForm 
          localAmount={localAmount}
          usdcAmount={usdcAmount}
          currency={selectedCurrency}
          onSubmit={handlePaycrestSubmit}
        />
      )}
      
      {/* Step 4: Automated Payment */}
      {step === 4 && paycrestOrder && (
        <PaycrestAutomatedOrderCard
          order={paycrestOrder}
          currency={CURRENCIES[selectedCurrency].symbol}
          localAmount={localAmount}
          onComplete={handleAutomatedComplete}
        />
      )}
      
      {/* Step 5: Premium Success */}
      {step === 5 && (
        <div className="relative w-full max-w-md mx-auto">
          <div className="relative rounded-3xl card-shadow-lg overflow-hidden">
            {/* Premium processing background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-black to-blue-800">
              <div className="absolute inset-0 gradient-mesh opacity-40"></div>
              
              {/* Animated floating elements */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-6 right-6 w-12 h-12 border border-blue-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-8 left-8 w-8 h-8 border border-green-400 rounded-full animate-bounce"></div>
                <div className="absolute top-1/2 left-6 w-10 h-10 border border-white rounded-full animate-ping"></div>
              </div>
            </div>
            
            {/* Processing content */}
            <div className="relative z-10 p-8 text-center">
              {/* Spinning loader */}
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-white/20 border-t-blue-400 shadow-lg"></div>
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-2xl">💸</span>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Processing Order</h3>
              <p className="text-gray-300 text-base mb-6 leading-relaxed">
                Setting up your payment...
              </p>
              
              <div className="bg-blue-500/20 px-4 py-3 rounded-xl border border-blue-400/30">
                <div className="flex items-center justify-center space-x-2 text-sm text-blue-300">
                  <span>{CURRENCIES[selectedCurrency].flag}</span>
                  <span className="font-medium">Transaction completed successfully</span>
                </div>
              </div>
            </div>
            
            {/* Subtle border */}
            <div className="absolute inset-0 rounded-3xl border border-blue-400/20"></div>
          </div>
        </div>
      )}
      
      {/* Legacy Success Display - Not used in automated flow */}
      {step === 6 && transactionResult && (
        <div className="relative w-full max-w-md mx-auto">
          <div className="relative rounded-3xl card-shadow-lg overflow-hidden">
            {/* Premium success background */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-black to-green-800">
              <div className="absolute inset-0 gradient-mesh opacity-40"></div>
              
              {/* Floating success elements */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-6 right-6 w-16 h-16 border border-green-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-8 left-8 w-10 h-10 border border-emerald-400 rounded-full"></div>
                <div className="absolute top-1/2 left-6 w-12 h-12 border border-white rounded-full"></div>
              </div>
            </div>
            
            {/* Success content */}
            <div className="relative z-10 p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  Order Created! 🚀
              </h3>
                <p className="text-gray-300 text-base mb-4 leading-relaxed">
                {transactionResult.message}
              </p>
            </div>
            
              {/* Transaction details */}
              <div className="space-y-3 mb-6">
                <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Order ID</span>
                    <span className="font-mono text-green-400 font-bold text-xs">
                      {transactionResult.orderId.slice(-8)}
                    </span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Send USDC to</span>
                    <span className="font-mono text-green-400 font-bold text-xs">
                      {transactionResult.receiveAddress.slice(0, 6)}...{transactionResult.receiveAddress.slice(-4)}
                    </span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Status</span>
                    <span className="font-mono text-blue-400 font-bold text-sm capitalize">
                      {transactionResult.status}
                    </span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Network</span>
                    <div className="flex items-center space-x-2">
                                             <Image 
                         src="/Base_Network_Logo.svg" 
                         alt="Base Network" 
                         width={16}
                         height={16}
                       />
                      <span className="font-bold text-white text-sm">
                    {networkConfig.name} {isTestnetNetwork ? '(Testnet)' : ''}
                  </span>
                    </div>
                </div>
              </div>
            </div>
            
              {/* What happens next */}
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-400/20 rounded-xl">
                <h4 className="font-bold text-blue-300 mb-3 text-sm">What Happens Next:</h4>
                <ol className="text-gray-300 text-xs space-y-2">
                  <li className="flex items-start space-x-2">
                    <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                    <span>Send USDC to the provided address</span>
                </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                    <span>PayCrest processes your payment</span>
                </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                    <span>{CURRENCIES[selectedCurrency].symbol} sent to your account</span>
                </li>
              </ol>
            </div>
            
            <button
              onClick={resetFlow}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl font-bold text-base hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-400 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg"
            >
              Make Another Transaction
            </button>
            </div>
            
            {/* Subtle border */}
            <div className="absolute inset-0 rounded-3xl border border-green-400/20"></div>
          </div>
        </div>
      )}
      
      {/* Premium Back button for steps 2 and 3 */}
      {(step === 2 || step === 3) && (
        <div className="relative w-full max-w-md mx-auto">
          <div className="relative rounded-2xl card-shadow overflow-hidden">
            {/* Premium button background */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800">
              <div className="absolute inset-0 gradient-mesh opacity-20"></div>
            </div>
            
            {/* Button content */}
        <button
          onClick={() => setStep(step - 1)}
              className="relative w-full text-gray-300 hover:text-white p-4 font-semibold transition-all duration-300 flex items-center justify-center space-x-3 hover:bg-white/5 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to {step === 2 ? 'Currency' : 'Amount'}</span>
        </button>
            
            {/* Subtle border */}
            <div className="absolute inset-0 rounded-2xl border border-white/10"></div>
          </div>
        </div>
      )}
    </div>
  )
} 