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
      <div className="bg-blue-50 p-4 rounded-lg animate-pulse">
        <h3 className="text-lg font-semibold">Available USDC</h3>
        <div className="h-8 bg-blue-200 rounded mt-2"></div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold text-blue-900">Available USDC</h3>
      <p className="text-2xl font-bold text-blue-600 mt-1">
        ${balance?.formatted || '0.00'}
      </p>
      <p className="text-sm text-blue-700 mt-1">
        On Base Network
      </p>
    </div>
  )
} 