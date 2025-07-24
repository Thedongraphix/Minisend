"use client";

import { useState, useEffect, useCallback } from 'react'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { useAccount, useChainId } from 'wagmi'
import { getNetworkConfig, getUSDCContract } from '@/lib/contracts'
import { base } from 'viem/chains'
import Image from 'next/image'

export function DirectUSDCBalance() {
  // Dual wallet system: MiniKit for Farcaster, Wagmi for web
  const { context } = useMiniKit()
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const chainId = useChainId()
  
  // Enhanced Farcaster detection and wallet logic (matches OffRampFlow)
  const isFarcaster = Boolean(context?.user || context?.client)
  const farcasterAddress = (context?.user as { walletAddress?: string })?.walletAddress
  
  // Use wagmi address as fallback when in Farcaster but no farcaster address
  const address = farcasterAddress || wagmiAddress
  const isConnected = Boolean(address) && (wagmiConnected || Boolean(farcasterAddress))
  
  // Debug logging
  console.log('DirectUSDCBalance - Wallet detection:', {
    isFarcaster,
    farcasterAddress,
    wagmiAddress,
    finalAddress: address,
    wagmiConnected,
    isConnected
  });
  
  const [balance, setBalance] = useState<string>('0.00')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  
  const networkConfig = getNetworkConfig(chainId)
  const usdcContract = getUSDCContract(chainId)
  
  const fetchBalance = useCallback(async () => {
    if (!address || chainId !== base.id) return
    
    // Capture address value to prevent race conditions
    const currentAddress = address
    if (!currentAddress) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // Use Base mainnet RPC endpoint
      const rpcUrl = 'https://mainnet.base.org'
      
      // ERC-20 balanceOf function call
      const data = `0x70a08231000000000000000000000000${currentAddress.slice(2)}`
      
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              to: usdcContract,
              data: data,
            },
            'latest'
          ],
          id: 1,
        }),
      })
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      // Convert hex result to decimal and format (USDC has 6 decimals)
      const balanceHex = result.result
      const balanceBigInt = BigInt(balanceHex)
      const balanceFormatted = Number(balanceBigInt) / 1000000 // 6 decimals
      
      setBalance(balanceFormatted.toFixed(2))
    } catch (err) {
      console.error('Error fetching USDC balance:', err)
      setError('Failed to load balance')
    } finally {
      setIsLoading(false)
    }
  }, [address, chainId, usdcContract])
  
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  if (!isConnected) {
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
      <div className="relative w-full h-56 rounded-3xl card-shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
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
                <h2 className="text-white text-3xl font-bold tracking-tight">${balance}</h2>
                <button
                  onClick={fetchBalance}
                  className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                  title="Refresh balance"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {error ? (
                <p className="text-red-400 text-xs font-medium">{error}</p>
              ) : null}
            </div>
            
            
          </div>
          
          {/* Center Section - Card Number */}
          <div className="space-y-1">
            <p className="text-gray-400 text-[10px] font-medium tracking-[0.3em] uppercase">Wallet Address</p>
            <p className="text-white font-mono text-lg tracking-[0.15em] font-medium">
              {address ? `${address.slice(0, 6)} •••• •••• ${address.slice(-4)}` : '•••• •••• •••• ••••'}
            </p>
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