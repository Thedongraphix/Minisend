"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import { parseUnits } from 'viem';
import { useChainId } from 'wagmi';
import { getUSDCContract } from '@/lib/contracts';

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

interface PaycrestAutomatedOrderCardProps {
  order: PaycrestOrder;
  currency: string;
  localAmount: number;
  onComplete: () => void;
}

export function PaycrestAutomatedOrderCard({ 
  order, 
  currency,
  localAmount,
  onComplete 
}: PaycrestAutomatedOrderCardProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const chainId = useChainId();
  const usdcContract = getUSDCContract(chainId);

  // Create the USDC transfer transaction
  const transactions = [
    {
      to: usdcContract as `0x${string}`,
      data: `0xa9059cbb000000000000000000000000${order.receiveAddress.slice(2)}${parseUnits(order.totalAmount, 6).toString(16).padStart(64, '0')}` as `0x${string}`,
      value: '0' as const,
    },
  ];

  const handleSuccess = () => {
    setIsCompleted(true);
    // Call the completion callback after a short delay to allow the transaction to propagate
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  if (isCompleted) {
    return (
      <div className="relative w-full max-w-md mx-auto">
        <div className="relative rounded-3xl card-shadow-lg overflow-hidden">
          {/* Success background */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-black to-green-800">
            <div className="absolute inset-0 gradient-mesh opacity-40"></div>
          </div>
          
          {/* Success content */}
          <div className="relative z-10 p-6 sm:p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
              Transaction Sent! 🎉
            </h3>
            <p className="text-gray-300 text-base mb-4 leading-relaxed">
              Your USDC has been sent successfully. {currency} will arrive in your account shortly.
            </p>
            
            <div className="bg-green-500/20 p-4 rounded-xl border border-green-400/30 mb-6">
              <div className="text-green-300 text-sm">
                <div className="flex justify-between mb-2">
                  <span>You sent:</span>
                  <span className="font-bold">${order.totalAmount} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>You&apos;ll receive:</span>
                  <span className="font-bold">{currency} {localAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl font-bold text-base hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-400 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg"
            >
              Make Another Transaction
            </button>
          </div>
          
          <div className="absolute inset-0 rounded-3xl border border-green-400/20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative rounded-3xl card-shadow-lg overflow-hidden">
        {/* Premium background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
          <div className="absolute inset-0 gradient-mesh opacity-40"></div>
          
          {/* Floating elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-6 right-6 w-16 h-16 border border-blue-400 rounded-full animate-pulse"></div>
            <div className="absolute bottom-8 left-8 w-10 h-10 border border-purple-400 rounded-full"></div>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">⚡</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Complete Payment</h3>
            </div>
          </div>

          {/* Transaction Summary */}
          <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-400/30 mb-6">
            <h4 className="text-blue-300 font-bold text-sm mb-3">💰 Transaction Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">You send:</span>
                <span className="text-white font-mono font-bold">${order.totalAmount} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Recipient gets:</span>
                <span className="text-white font-mono font-bold">{currency} {localAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-blue-400/20 pt-2">
                <span className="text-gray-300">To:</span>
                <span className="text-blue-400 font-medium">{order.recipient.accountName}</span>
              </div>
            </div>
          </div>

          {/* Network Info */}
          <div className="bg-white/5 p-3 rounded-xl border border-white/10 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Network</span>
              <div className="flex items-center space-x-2">
                <Image 
                  src="/Base_Network_Logo.svg" 
                  alt="Base Network" 
                  width={16}
                  height={16}
                />
                <span className="text-white font-medium text-sm">Base</span>
              </div>
            </div>
          </div>

          {/* OnchainKit Transaction */}
          <Transaction
            contracts={transactions}
            onSuccess={handleSuccess}
            onError={(error) => {
              console.error('Transaction failed:', error);
            }}
          >
            <TransactionButton
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-bold text-base hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              text="Send USDC & Complete Order"
            />
            <TransactionStatus>
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </TransactionStatus>
          </Transaction>

          {/* What happens next */}
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-400/20 rounded-xl">
            <h4 className="font-bold text-yellow-300 mb-3 text-sm">📋 What happens next:</h4>
            <ol className="text-gray-300 text-xs space-y-2">
              <li className="flex items-start space-x-2">
                <span className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <span>USDC will be sent from your wallet automatically</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <span>PayCrest processes your payment</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <span>{currency} sent to your account within minutes</span>
              </li>
            </ol>
          </div>

          {/* Order ID */}
          <div className="mt-4 text-center">
            <span className="text-gray-400 text-xs">Order ID: </span>
            <span className="text-gray-300 text-xs font-mono">{order.id}</span>
          </div>
        </div>
        
        {/* Subtle border */}
        <div className="absolute inset-0 rounded-3xl border border-white/10"></div>
      </div>
    </div>
  );
}