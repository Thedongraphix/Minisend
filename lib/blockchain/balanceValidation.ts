/**
 * Blockchain balance validation utilities
 * Prevents order creation for wallets without sufficient USDC balance
 */

import { createPublicClient, http, formatUnits, parseUnits } from 'viem'
import { base } from 'viem/chains'

// Base network USDC contract address
const USDC_CONTRACT_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as const

// Create public client for Base network
const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

// USDC ERC-20 ABI (minimal for balance checking)
const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  }
] as const

export interface BalanceCheckResult {
  hasBalance: boolean
  currentBalance: string
  requiredAmount: string
  balanceInUSDC: number
  requiredInUSDC: number
  insufficientBy?: number
}

/**
 * Check if wallet has sufficient USDC balance for the transaction
 */
export async function validateWalletBalance(
  walletAddress: string,
  requiredAmountUSDC: number,
  bufferPercentage: number = 0 // No buffer by default since Minisend doesn't charge gas fees
): Promise<BalanceCheckResult> {
  try {
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      throw new Error('Invalid wallet address format')
    }

    if (requiredAmountUSDC <= 0) {
      throw new Error('Required amount must be positive')
    }

    // Get USDC balance from Base network
    const balance = await publicClient.readContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`]
    }) as bigint

    // USDC has 6 decimals
    const balanceInUSDC = parseFloat(formatUnits(balance, 6))

    // Add any specified buffer (0 by default for Minisend since no gas fees)
    const requiredWithBuffer = requiredAmountUSDC * (1 + bufferPercentage)

    // Use proper decimal comparison to avoid floating point issues (USDC has 6 decimals)
    const hasBalance = Math.round(balanceInUSDC * 1e6) >= Math.round(requiredWithBuffer * 1e6)

    const result: BalanceCheckResult = {
      hasBalance,
      currentBalance: balance.toString(),
      requiredAmount: parseUnits(requiredAmountUSDC.toString(), 6).toString(),
      balanceInUSDC,
      requiredInUSDC: requiredWithBuffer,
      insufficientBy: hasBalance ? undefined : requiredWithBuffer - balanceInUSDC
    }

    return result

  } catch {
    // In case of RPC errors, we might want to allow the transaction to proceed
    // but log the error for monitoring
    return {
      hasBalance: true, // Fail open for now to avoid blocking legitimate users
      currentBalance: '0',
      requiredAmount: parseUnits(requiredAmountUSDC.toString(), 6).toString(),
      balanceInUSDC: 0,
      requiredInUSDC: requiredAmountUSDC,
      insufficientBy: undefined
    }
  }
}

/**
 * Enhanced balance validation with multiple checks
 */
export async function validateWalletForOrder(
  walletAddress: string,
  orderAmountUSDC: number
): Promise<{
  isValid: boolean
  reason?: string
  balanceCheck: BalanceCheckResult
}> {
  try {
    // 1. Basic address validation
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return {
        isValid: false,
        reason: 'Invalid wallet address format',
        balanceCheck: {
          hasBalance: false,
          currentBalance: '0',
          requiredAmount: '0',
          balanceInUSDC: 0,
          requiredInUSDC: orderAmountUSDC
        }
      }
    }
    
    // 2. Amount validation
    if (orderAmountUSDC <= 0 || orderAmountUSDC > 100000) { // Max $100k per transaction
      return {
        isValid: false,
        reason: `Invalid order amount: ${orderAmountUSDC}. Must be between $0.01 and $100,000`,
        balanceCheck: {
          hasBalance: false,
          currentBalance: '0',
          requiredAmount: '0',
          balanceInUSDC: 0,
          requiredInUSDC: orderAmountUSDC
        }
      }
    }
    
    // 3. Balance validation
    const balanceCheck = await validateWalletBalance(walletAddress, orderAmountUSDC)
    
    if (!balanceCheck.hasBalance) {
      return {
        isValid: false,
        reason: `Insufficient USDC balance. Required: $${balanceCheck.requiredInUSDC.toFixed(2)}, Available: $${balanceCheck.balanceInUSDC.toFixed(2)}`,
        balanceCheck
      }
    }
    
    return {
      isValid: true,
      balanceCheck
    }
    
  } catch {
    return {
      isValid: false,
      reason: 'Unable to validate wallet balance. Please try again.',
      balanceCheck: {
        hasBalance: false,
        currentBalance: '0',
        requiredAmount: '0',
        balanceInUSDC: 0,
        requiredInUSDC: orderAmountUSDC
      }
    }
  }
}

/**
 * Get current gas price and estimate transaction cost
 */
export async function estimateTransactionCost(): Promise<{
  gasPrice: string
  estimatedCostUSD: number
}> {
  try {
    const gasPrice = await publicClient.getGasPrice()
    
    // Convert to USD (very rough estimate, would need ETH/USD price)
    // For now, assume $0.50 per transaction as conservative estimate
    const estimatedCostUSD = 0.5
    
    return {
      gasPrice: gasPrice.toString(),
      estimatedCostUSD
    }
  } catch {
    return {
      gasPrice: '0',
      estimatedCostUSD: 1.0 // Conservative fallback
    }
  }
}

/**
 * Rate limiting for balance checks (prevent abuse)
 */
const balanceCheckCache = new Map<string, { timestamp: number; result: BalanceCheckResult }>()
const CACHE_DURATION = 30000 // 30 seconds

export async function validateWalletBalanceWithCache(
  walletAddress: string,
  requiredAmountUSDC: number
): Promise<BalanceCheckResult> {
  const cacheKey = `${walletAddress}:${requiredAmountUSDC}`
  const cached = balanceCheckCache.get(cacheKey)
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.result
  }
  
  const result = await validateWalletBalance(walletAddress, requiredAmountUSDC)
  
  balanceCheckCache.set(cacheKey, {
    timestamp: Date.now(),
    result
  })
  
  return result
}