"use client";

import { useAccount, useBalance } from 'wagmi'
import { base } from 'wagmi/chains'

const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC on Base

export function USDCBalance() {
  const { address } = useAccount()
  const { data: balance, isLoading } = useBalance({
    address,
    token: USDC_CONTRACT,
    chainId: base.id,
  })

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
            <h3 className="text-lg font-semibold text-gray-900">Available USDC</h3>
            <p className="text-sm text-gray-600">On Base Network</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">
            ${balance?.formatted || '0.00'}
          </p>
          <p className="text-sm text-blue-600 font-medium">
            Ready to convert
          </p>
        </div>
      </div>
      
      {/* Additional info */}
      <div className="mt-4 pt-4 border-t border-blue-200/50">
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Secured by Base network
        </div>
      </div>
    </div>
  )
} 