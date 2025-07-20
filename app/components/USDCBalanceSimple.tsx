"use client";

import { useAccount, useChainId, useReadContract } from 'wagmi'
import { getNetworkConfig, isTestnet } from '@/lib/contracts'
import { baseSepolia } from 'wagmi/chains'

const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const

export function USDCBalanceSimple() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  
  const networkConfig = getNetworkConfig(chainId)
  const usdcContract = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  
  const { data: balance, isLoading: balanceLoading, refetch } = useReadContract({
    address: usdcContract as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
    query: {
      enabled: !!address && chainId === baseSepolia.id,
    },
  })

  const { data: decimals } = useReadContract({
    address: usdcContract as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'decimals',
    chainId: baseSepolia.id,
  })

  const formatBalance = (balance: bigint | undefined, decimals: number = 6): string => {
    if (!balance) return '0.00'
    const divisor = BigInt(10 ** decimals)
    const wholePart = balance / divisor
    const fractionalPart = balance % divisor
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
    return `${wholePart}.${fractionalStr.slice(0, 2)}`
  }

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
        <p className="text-orange-800">Please switch to Base Sepolia network</p>
      </div>
    )
  }

  if (balanceLoading) {
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

  const formattedBalance = formatBalance(typeof balance === 'bigint' ? balance : undefined, typeof decimals === 'number' ? decimals : 6)

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
                onClick={() => refetch()}
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
              {isTestnet(chainId) && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full border border-orange-200">
                  Testnet
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono">
              Contract: {usdcContract.slice(0, 6)}...{usdcContract.slice(-4)}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">
            ${formattedBalance}
          </p>
          <p className="text-sm text-blue-600 font-medium">
            Ready to convert
          </p>
        </div>
      </div>
      
      {/* Additional info */}
      <div className="mt-4 pt-4 border-t border-blue-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Secured by {networkConfig.name} network
          </div>
          
          <div className="flex items-center text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.966-.833-2.736 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Test Mode
          </div>
        </div>
      </div>
    </div>
  )
}