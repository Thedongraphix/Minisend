"use client";

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { getUSDCContract } from '@/lib/contracts'
import { base } from 'viem/chains'
import { useMinisendAuth } from '@/lib/hooks/useMinisendAuth'

interface UseUSDCBalanceReturn {
  balance: string;
  balanceNum: number;
  isLoading: boolean;
  error: string;
  isRefreshing: boolean;
  fetchBalance: () => Promise<void>;
}

async function fetchOnChainUSDCBalance(
  walletAddress: string,
  usdcContract: string
): Promise<bigint> {
  const rpcUrl = 'https://mainnet.base.org'
  const data = `0x70a08231000000000000000000000000${walletAddress.slice(2)}`

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: usdcContract, data }, 'latest'],
      id: 1,
    }),
  })

  const result = await response.json()
  if (result.error) throw new Error(result.error.message)

  return BigInt(result.result)
}

export function useUSDCBalance(): UseUSDCBalanceReturn {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { minisendWallet } = useMinisendAuth()

  const hasWallet = (isConnected && address) || minisendWallet

  const [balance, setBalance] = useState<string>('0.00')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const usdcContract = getUSDCContract(chainId)

  const fetchBalance = useCallback(async () => {
    if ((!address && !minisendWallet) || chainId !== base.id) return

    setIsLoading(true)
    setIsRefreshing(true)
    setError('')

    try {
      let totalBalance = BigInt(0)

      // Fetch connected wallet balance
      if (address) {
        totalBalance += await fetchOnChainUSDCBalance(address, usdcContract)
      }

      // Fetch BlockRadar wallet balance if it's a different address
      if (minisendWallet && minisendWallet.toLowerCase() !== address?.toLowerCase()) {
        totalBalance += await fetchOnChainUSDCBalance(minisendWallet, usdcContract)
      }

      const balanceFormatted = Number(totalBalance) / 1000000 // USDC has 6 decimals
      setBalance(balanceFormatted.toFixed(2))

    } catch (err) {
      setError('Failed to load balance')
    } finally {
      setIsLoading(false)
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }, [address, minisendWallet, chainId, usdcContract])

  useEffect(() => {
    if (hasWallet && chainId === base.id) {
      fetchBalance()
    }
  }, [fetchBalance, hasWallet, chainId])

  return {
    balance,
    balanceNum: parseFloat(balance),
    isLoading,
    error,
    isRefreshing,
    fetchBalance
  }
}
