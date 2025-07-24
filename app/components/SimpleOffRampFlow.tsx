"use client";

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { SimpleUSDCPayment } from './SimpleUSDCPayment';
import { DirectUSDCBalance } from './DirectUSDCBalance';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import Image from 'next/image';

export function SimpleOffRampFlow() {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { context } = useMiniKit();
  
  // Wallet detection
  const isFarcaster = Boolean(context?.user || context?.client);
  const farcasterAddress = (context?.user as { walletAddress?: string })?.walletAddress;
  const address = farcasterAddress || wagmiAddress;
  const isConnected = Boolean(address) && (wagmiConnected || Boolean(farcasterAddress));

  // Form state
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [formData, setFormData] = useState({
    amount: '',
    phoneNumber: '',
    accountName: '',
    currency: 'KES' as 'KES' | 'NGN'
  });

  console.log('Wallet detection:', { isFarcaster, address, isConnected });

  // Show wallet connection if not connected
  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">USDC to Mobile Money</h1>
          <p className="text-gray-300">Connect your wallet to get started</p>
        </div>

        <Wallet>
          <ConnectWallet
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            Connect Wallet
          </ConnectWallet>
        </Wallet>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">USDC Convert</h1>
        <p className="text-gray-300">Send crypto to mobile money</p>
        
        <div className="inline-flex items-center space-x-2 text-xs text-blue-300 bg-blue-500/10 px-3 py-1 rounded-xl mt-2 border border-blue-400/20">
          <Image src="/Base_Network_Logo.svg" alt="Base Network" width={12} height={12} />
          <span className="font-medium">Powered by Base</span>
        </div>
      </div>

      {/* USDC Balance */}
      <DirectUSDCBalance />

      {/* Form Step */}
      {step === 'form' && (
        <div className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Amount (USDC)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              min="1"
              max="1000"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as 'KES' | 'NGN' }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="KES">🇰🇪 Kenyan Shilling (KES)</option>
              <option value="NGN">🇳🇬 Nigerian Naira (NGN)</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="+254712345678"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Account Name</label>
            <input
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            />
          </div>

          <button
            onClick={() => setStep('payment')}
            disabled={!formData.amount || !formData.phoneNumber || !formData.accountName}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            Continue to Payment
          </button>
        </div>
      )}

      {/* Payment Step */}
      {step === 'payment' && (
        <div>
          <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-white font-medium mb-2">Payment Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Amount:</span>
                <span>${formData.amount} USDC</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>To:</span>
                <span>{formData.phoneNumber}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Currency:</span>
                <span>{formData.currency}</span>
              </div>
            </div>
          </div>

          <SimpleUSDCPayment
            amount={formData.amount}
            phoneNumber={formData.phoneNumber}
            accountName={formData.accountName}
            currency={formData.currency}
            onSuccess={() => setStep('success')}
            onError={(error) => {
              console.error('Payment error:', error);
              // Could show error message here
            }}
          />

          <button
            onClick={() => setStep('form')}
            className="w-full mt-4 text-gray-400 hover:text-white py-2 transition-colors"
          >
            ← Back to Form
          </button>
        </div>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <div className="text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
          <p className="text-gray-300">
            Your {formData.currency} will be sent to {formData.phoneNumber} shortly.
          </p>
          <button
            onClick={() => {
              setStep('form');
              setFormData({ amount: '', phoneNumber: '', accountName: '', currency: 'KES' });
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            Send Another Payment
          </button>
        </div>
      )}
    </div>
  );
}