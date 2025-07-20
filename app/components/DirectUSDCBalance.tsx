"use client";

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { getNetworkConfig } from '@/lib/contracts'
import { baseSepolia } from 'wagmi/chains'

export function DirectUSDCBalance() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [balance, setBalance] = useState<string>('0.00')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  
  const networkConfig = getNetworkConfig(chainId)
  const usdcContract = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  
  const fetchBalance = useCallback(async () => {
    if (!address || chainId !== baseSepolia.id) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // Use public Base Sepolia RPC endpoint
      const rpcUrl = 'https://sepolia.base.org'
      
      // ERC-20 balanceOf function call
      const data = `0x70a08231000000000000000000000000${address.slice(2)}`
      
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
  }, [address, chainId])
  
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  if (!isConnected) {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-slate-800/10"></div>
        <p className="text-slate-300 relative z-10 flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Connect wallet to view USDC balance</span>
        </p>
      </div>
    )
  }

  if (chainId !== baseSepolia.id) {
    return (
      <div className="bg-amber-500/10 backdrop-blur-sm border border-amber-500/30 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5"></div>
        <div className="text-center relative z-10">
          <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-amber-300 font-bold text-lg mb-2">Wrong Network</p>
          <p className="text-amber-200 mb-4">Please switch to Base Sepolia network</p>
          <button
            onClick={() => {
              if (window.ethereum) {
                window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0x14a34' }],
                });
              }
            }}
            className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl hover:from-amber-700 hover:to-amber-600 transition-all duration-300 font-medium shadow-lg hover:shadow-amber-500/25 transform hover:scale-105"
          >
            Switch to Base Sepolia
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-2xl animate-pulse relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-slate-800/10"></div>
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center">
            <div className="w-6 h-6 bg-blue-500/30 rounded-full animate-pulse"></div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-slate-700/50 rounded-lg w-3/4"></div>
            <div className="h-8 bg-slate-600/50 rounded-xl w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-slate-600/50 transition-all duration-300">
      {/* Premium background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-emerald-600/5"></div>
      <div className="absolute -top-4 -right-4 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-500"></div>
      <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-500 opacity-20 animate-pulse"></div>
                <svg className="w-8 h-8 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-xl font-bold text-slate-100">Available USDC</h3>
                <button
                  onClick={fetchBalance}
                  className="group/btn p-2 text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-all duration-300 hover:scale-110"
                  title="Refresh balance"
                >
                  <svg className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center space-x-3 mb-2">
                <p className="text-sm text-slate-400">On {networkConfig.name}</p>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30">
                  TESTNET
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {usdcContract.slice(0, 6)}...{usdcContract.slice(-4)}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-4xl font-black text-slate-100 tabular-nums mb-1">
              ${balance}
            </p>
            {error ? (
              <p className="text-sm text-red-400 font-medium">{error}</p>
            ) : (
              <p className="text-sm text-emerald-400 font-bold flex items-center justify-end space-x-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span>Ready to convert</span>
              </p>
            )}
          </div>
        </div>
        
        {/* Premium info bar */}
        <div className="flex items-center justify-between p-4 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-slate-300">Direct blockchain call</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              if (window.ethereum) {
                window.ethereum.request({
                  method: 'wallet_watchAsset',
                  params: {
                    type: 'ERC20',
                    options: {
                      address: usdcContract,
                      symbol: 'USDC',
                      decimals: 6,
                      image: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
                    },
                  },
                });
              }
            }}
            className="text-xs text-blue-300 hover:text-blue-200 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-xl border border-blue-500/20 hover:border-blue-500/30 transition-all duration-300 font-medium"
          >
            Add to Wallet
          </button>
        </div>
      </div>
    </div>
  )
}