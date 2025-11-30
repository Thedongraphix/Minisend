"use client";

import { useState, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { getNetworkConfig } from '@/lib/contracts'
import { base } from 'viem/chains'
import { Name } from '@coinbase/onchainkit/identity'
import Image from 'next/image'
import { useUSDCBalance } from '@/hooks/useUSDCBalance'

export function BalanceView() {
  // Use wagmi hooks for Coinbase Wallet connection
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Debug logging
  console.log('DirectUSDCBalance - Coinbase Wallet:', {
    address,
    isConnected,
    chainId
  });

  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [copyFeedback, setCopyFeedback] = useState(false)

  const networkConfig = getNetworkConfig(chainId)
  const { balance, isLoading, error, isRefreshing, fetchBalance } = useUSDCBalance()

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!mounted || !isConnected) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-8 rounded-2xl shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-gray-300">Connect wallet to view USDC balance</p>
        </div>
      </div>
    )
  }

  if (chainId !== base.id) {
    return (
      <div className="bg-gradient-to-br from-orange-900 to-red-900 border border-orange-700 p-8 rounded-2xl shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Wrong Network</h3>
          <p className="text-orange-200 mb-4">Please switch to Base mainnet</p>
          <button
            onClick={() => {
              if (window.ethereum) {
                window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0x2105' }],
                });
              }
            }}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            Switch to Base
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-8 rounded-2xl shadow-2xl animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-4 bg-gray-600 rounded w-32"></div>
            <div className="h-8 bg-gray-600 rounded w-24"></div>
          </div>
          <div className="w-12 h-12 bg-gray-600 rounded-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Premium Financial Card */}
      <div className="relative w-full h-56 rounded-3xl overflow-hidden transform transition-all duration-300 hover:scale-[1.01] group shadow-xl"
           style={{
             boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
           }}>
        {/* Card Background with Premium Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
          {/* Subtle mesh gradient overlay */}
          <div className="absolute inset-0 gradient-mesh"></div>
          
          {/* Premium geometric patterns */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-40 h-40 border border-white rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 border border-white rounded-full translate-y-16 -translate-x-16"></div>
            <div className="absolute top-1/2 left-1/2 w-24 h-24 border border-white rounded-full -translate-x-12 -translate-y-12"></div>
          </div>
        </div>
        
        {/* Card Content Layer */}
        <div className="relative z-10 p-8 h-full flex flex-col justify-between">
          {/* Header Section */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-gray-400 text-xs font-medium tracking-[0.2em] uppercase">Available Balance</p>
              <div className="flex items-center space-x-3">
                <h2 className="relative text-white text-3xl font-bold tracking-tight transition-all duration-300"
                    style={{
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                      filter: isRefreshing ? 'blur(0.5px)' : 'none'
                    }}>
                  <span className={`transition-opacity duration-300 ${isBalanceVisible ? 'opacity-100' : 'opacity-0'}`}>
                    ${balance}
                  </span>
                  <span className={`absolute inset-0 transition-opacity duration-300 ${!isBalanceVisible ? 'opacity-100' : 'opacity-0'}`}>
                    ••••
                  </span>
                  {isRefreshing && (
                    <div className="absolute inset-0 bg-blue-500/10 animate-pulse rounded-lg"></div>
                  )}
                </h2>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setIsBalanceVisible(!isBalanceVisible);
                    }}
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 group/btn"
                    title={isBalanceVisible ? "Hide balance" : "Show balance"}
                    aria-label={isBalanceVisible ? "Hide balance" : "Show balance"}
                  >
                    <div className="transform group-hover/btn:scale-110 transition-transform duration-200">
                      {isBalanceVisible ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      fetchBalance();
                    }}
                    className={`text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 group/btn ${isRefreshing ? 'animate-pulse' : ''}`}
                    title="Refresh balance"
                    aria-label="Refresh balance"
                    disabled={isLoading}
                  >
                    <div className={`transform group-hover/btn:scale-110 transition-transform duration-200 ${isRefreshing ? 'animate-spin' : ''}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
              {error ? (
                <p className="text-red-400 text-xs font-medium">{error}</p>
              ) : null}
            </div>
            
            
          </div>
          
          {/* Center Section - User Identity */}
          <div className="space-y-1">
            <p className="text-gray-400 text-[10px] font-medium tracking-[0.3em] uppercase">Wallet Owner</p>
            <div className="flex items-center space-x-2">
              <div className="text-white text-lg font-medium">
                <Name 
                  address={address} 
                  chain={base} 
                  className="text-white font-semibold tracking-[0.05em]"
                />
              </div>
              {address && (
                <button
                  onClick={() => {
                    copyToClipboard(address);
                  }}
                  className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/10 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 group/copy"
                  title={copyFeedback ? "Copied!" : "Copy full address"}
                  aria-label="Copy wallet address"
                >
                  <div className="transform group-hover/copy:scale-110 transition-transform duration-200">
                    {copyFeedback ? (
                      <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                </button>
              )}
            </div>
          </div>
          
          {/* Footer Section */}
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <p className="text-gray-400 text-[10px] font-medium tracking-[0.2em] uppercase">Network</p>
              <div className="flex items-center space-x-2">
                <Image 
                  src="/Base_Network_Logo.svg" 
                  alt="Base Network" 
                  width={16}
                  height={16}
                />
              <p className="text-white text-sm font-semibold">{networkConfig.name}</p>
              </div>
            </div>
            
            <div className="text-right space-y-0.5">
              <p className="text-gray-400 text-[10px] font-medium tracking-[0.2em] uppercase">Currency</p>
              <p className="text-white text-sm font-semibold">USD Coin</p>
            </div>
          </div>
        </div>
        
        {/* Subtle border glow */}
        <div className="absolute inset-0 rounded-3xl border border-white/10"></div>
      </div>
    </div>
  )
}