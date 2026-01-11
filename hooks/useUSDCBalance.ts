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

export function useUSDCBalance(): UseUSDCBalanceReturn {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { minisendWallet } = useMinisendAuth()

  // Use connected wallet address if available, otherwise use Minisend wallet
  const effectiveAddress = address || minisendWallet
  const hasWallet = (isConnected && address) || minisendWallet

  const [balance, setBalance] = useState<string>('0.00')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const usdcContract = getUSDCContract(chainId)

  const fetchBalance = useCallback(async () => {
    if (!effectiveAddress || chainId !== base.id) return

    // Capture address value to prevent race conditions
    const currentAddress = effectiveAddress
    if (!currentAddress) return

    setIsLoading(true)
    setIsRefreshing(true)
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
      setError('Failed to load balance')
    } finally {
      setIsLoading(false)
      setTimeout(() => setIsRefreshing(false), 500) // Keep pulse effect briefly
    }
  }, [effectiveAddress, chainId, usdcContract])

  useEffect(() => {
    if (hasWallet && effectiveAddress && chainId === base.id) {
      fetchBalance()
    }
  }, [fetchBalance, hasWallet, effectiveAddress, chainId])

  return {
    balance,
    balanceNum: parseFloat(balance),
    isLoading,
    error,
    isRefreshing,
    fetchBalance
  }
}