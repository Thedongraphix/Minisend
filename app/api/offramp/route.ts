import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { MoonPayIntegration } from '@/lib/moonpay'
import { TransakIntegration } from '@/lib/transak'

// USDC contract on Base
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// Initialize off-ramp providers
const moonpay = new MoonPayIntegration(
  process.env.MOONPAY_API_KEY || '',
  process.env.MOONPAY_SECRET_KEY || '',
  process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
)

const transak = new TransakIntegration({
  apiKey: process.env.TRANSAK_API_KEY || '',
  environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'STAGING',
})

// Create Viem client for Base network
const client = createPublicClient({
  chain: base,
  transport: http()
})

interface OffRampRequest {
  walletAddress: string
  usdcAmount: number
  kshAmount: number
  phoneNumber: string
  provider?: 'moonpay' | 'transak'
}

interface TransactionLogData {
  transactionId: string
  walletAddress: string
  usdcAmount: number
  kshAmount: number
  phoneNumber: string
  provider: string
  status: string
  timestamp: Date
  usdcTxHash?: string
  mpesaReference?: string
  sellUrl?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: OffRampRequest = await request.json()
    const { walletAddress, usdcAmount, kshAmount, phoneNumber, provider = 'moonpay' } = body

    // Validate input
    if (!walletAddress || !usdcAmount || !kshAmount || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate phone number format
    if (!validateKenyanPhone(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid Kenyan phone number format' },
        { status: 400 }
      )
    }

    // Validate amount limits (compliance)
    if (usdcAmount < 1 || usdcAmount > 1000) {
      return NextResponse.json(
        { error: 'Amount must be between $1 and $1,000 USDC' },
        { status: 400 }
      )
    }

    // 1. Check USDC balance
    const balance = await checkUSDCBalance(walletAddress)
    if (balance < usdcAmount) {
      return NextResponse.json(
        { error: 'Insufficient USDC balance' },
        { status: 400 }
      )
    }

    // 2. Generate transaction ID for tracking
    const transactionId = generateTransactionId()

    // 3. Process off-ramp based on provider
    let result
    if (provider === 'moonpay') {
      result = await processMoonPayOffRamp({
        walletAddress,
        usdcAmount,
        kshAmount,
        phoneNumber,
        transactionId
      })
    } else {
      result = await processTransakOffRamp({
        walletAddress,
        usdcAmount,
        kshAmount,
        phoneNumber,
        transactionId
      })
    }

    // 4. Log transaction for compliance
    await logTransaction({
      transactionId,
      walletAddress,
      usdcAmount,
      kshAmount,
      phoneNumber,
      provider,
      status: 'initiated',
      timestamp: new Date(),
      ...result
    })

    return NextResponse.json({
      success: true,
      transactionId,
      usdcTxHash: result.usdcTxHash,
      mpesaReference: result.mpesaReference,
      provider,
      estimatedCompletionTime: '1-3 minutes'
    })

  } catch (error) {
    console.error('Off-ramp processing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transaction failed' },
      { status: 500 }
    )
  }
}

async function checkUSDCBalance(address: string): Promise<number> {
  try {
    const balance = await client.readContract({
      address: USDC_CONTRACT as `0x${string}`,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    })

    // USDC has 6 decimals
    return Number(balance) / 1e6
  } catch (error) {
    console.error('Error checking USDC balance:', error)
    throw new Error('Failed to check USDC balance')
  }
}

async function processMoonPayOffRamp(params: {
  walletAddress: string
  usdcAmount: number
  kshAmount: number
  phoneNumber: string
  transactionId: string
}) {
  try {
    // Generate MoonPay sell transaction URL
    const sellUrl = await moonpay.initiateSellTransaction({
      walletAddress: params.walletAddress,
      cryptoCurrency: 'usdc',
      baseCurrency: 'kes',
      quoteCurrencyAmount: params.kshAmount,
      externalCustomerId: params.walletAddress,
      redirectURL: `${process.env.NEXT_PUBLIC_URL}/success?tx=${params.transactionId}`,
      phoneNumber: params.phoneNumber
    })

    // In a real implementation, you would:
    // 1. Redirect user to MoonPay for USDC transfer
    // 2. Wait for MoonPay webhook confirmation
    // 3. Initiate M-Pesa payment via MoonPay

    // For demo purposes, simulate transaction hashes
    const usdcTxHash = `0x${generateRandomHash()}`
    const mpesaReference = generateMPesaReference()

    return {
      usdcTxHash,
      mpesaReference,
      sellUrl
    }
  } catch (error) {
    console.error('MoonPay processing error:', error)
    throw new Error('Failed to process MoonPay transaction')
  }
}

async function processTransakOffRamp(params: {
  walletAddress: string
  usdcAmount: number
  kshAmount: number
  phoneNumber: string
  transactionId: string
}) {
  try {
    // Generate Transak sell URL
    const sellUrl = transak.generateSellURL({
      walletAddress: params.walletAddress,
      cryptoCurrencyCode: 'USDC',
      fiatCurrency: 'KES',
      fiatAmount: params.kshAmount,
      email: `user_${params.transactionId}@example.com`, // In production, collect real email
      phoneNumber: params.phoneNumber,
      redirectURL: `${process.env.NEXT_PUBLIC_URL}/success?tx=${params.transactionId}`
    })

    // For demo purposes, simulate transaction hashes
    const usdcTxHash = `0x${generateRandomHash()}`
    const mpesaReference = generateMPesaReference()

    return {
      usdcTxHash,
      mpesaReference,
      sellUrl
    }
  } catch (error) {
    console.error('Transak processing error:', error)
    throw new Error('Failed to process Transak transaction')
  }
}

async function logTransaction(data: TransactionLogData) {
  try {
    // In production, save to database (PostgreSQL, MongoDB, etc.)
    console.log('Transaction logged:', {
      ...data,
      phoneNumber: data.phoneNumber.replace(/\d(?=\d{4})/g, '*') // Mask phone number
    })

    // You could also send to external compliance monitoring
    if (process.env.CHAINALYSIS_API_KEY) {
      // await sendToAnalytics(data)
    }
  } catch (error) {
    console.error('Failed to log transaction:', error)
    // Don't throw error here as it shouldn't block the main transaction
  }
}

function validateKenyanPhone(phone: string): boolean {
  const regex = /^(\+254|0)[17]\d{8}$/
  return regex.test(phone)
}

function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function generateRandomHash(): string {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

function generateMPesaReference(): string {
  return `MP${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
}

// GET method for transaction status checking
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const transactionId = searchParams.get('id')

  if (!transactionId) {
    return NextResponse.json(
      { error: 'Transaction ID required' },
      { status: 400 }
    )
  }

  try {
    // In production, fetch from database
    // const transaction = await getTransactionById(transactionId)
    
    // For demo, return mock status
    return NextResponse.json({
      transactionId,
      status: 'completed',
      usdcTxHash: `0x${generateRandomHash()}`,
      mpesaReference: generateMPesaReference(),
      completedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching transaction status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transaction status' },
      { status: 500 }
    )
  }
} 