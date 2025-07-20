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
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-lg border border-blue-100">
        <p className="text-gray-600">Connect wallet to view USDC balance</p>
      </div>
    )
  }

  if (chainId !== baseSepolia.id) {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-2xl shadow-lg border border-orange-100">
        <div className="text-center">
          <p className="text-orange-800 font-semibold mb-2">Wrong Network</p>
          <p className="text-orange-700">Please switch to Base Sepolia network</p>
          <button
            onClick={() => {
              if (window.ethereum) {
                window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0x14a34' }], // Base Sepolia chain ID in hex
                });
              }
            }}
            className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Switch to Base Sepolia
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-lg border border-blue-100 animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-200 rounded-xl"></div>
          <div className="flex-1">
            <div className="h-4 bg-blue-200 rounded-lg mb-2"></div>
            <div className="h-8 bg-blue-300 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-lg border border-blue-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full -translate-y-16 translate-x-16"></div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">Available USDC</h3>
              <button
                onClick={fetchBalance}
                className="text-blue-600 hover:text-blue-800 p-1"
                title="Refresh balance"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-600">On {networkConfig.name}</p>
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full border border-orange-200">
                Testnet
              </span>
            </div>
            <p className="text-xs text-gray-500 font-mono">
              Contract: {usdcContract.slice(0, 6)}...{usdcContract.slice(-4)}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">
            ${balance}
          </p>
          {error ? (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          ) : (
            <p className="text-sm text-blue-600 font-medium">
              Ready to convert
            </p>
          )}
        </div>
      </div>
      
      {/* Additional info */}
      <div className="mt-4 pt-4 border-t border-blue-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Direct contract call (no API)
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
            className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200"
          >
            Add to MetaMask
          </button>
        </div>
      </div>
    </div>
  )
}