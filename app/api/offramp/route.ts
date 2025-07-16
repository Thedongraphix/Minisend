import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { MoonPayIntegration } from '@/lib/moonpay'
import { TransakIntegration } from '@/lib/transak'
import { createMPesaInstance } from '@/lib/mpesa'
import { getUSDCContract, getNetworkConfig } from '@/lib/contracts'

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

// Initialize M-Pesa
const mpesa = createMPesaInstance()

// Create Viem clients for both networks
const createClient = (chainId: number) => {
  const chain = chainId === base.id ? base : baseSepolia
  return createPublicClient({
    chain,
    transport: http()
  })
}

interface OffRampRequest {
  walletAddress: string
  usdcAmount: number
  kshAmount: number
  phoneNumber: string
  provider?: 'moonpay' | 'transak' | 'mpesa'
  chainId?: number
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
  chainId: number
  usdcTxHash?: string
  mpesaReference?: string
  checkoutRequestID?: string
  sellUrl?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: OffRampRequest = await request.json()
    const { 
      walletAddress, 
      usdcAmount, 
      kshAmount, 
      phoneNumber, 
      provider = 'mpesa',
      chainId = base.id 
    } = body

    // Validate input
    if (!walletAddress || !usdcAmount || !kshAmount || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate phone number format for M-Pesa
    if (provider === 'mpesa' && !mpesa.validateKenyanPhone(phoneNumber)) {
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
    const balance = await checkUSDCBalance(walletAddress, chainId)
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
    if (provider === 'mpesa') {
      result = await processMPesaOffRamp({
        walletAddress,
        usdcAmount,
        kshAmount,
        phoneNumber,
        transactionId,
        chainId
      })
    } else if (provider === 'moonpay') {
      result = await processMoonPayOffRamp({
        walletAddress,
        usdcAmount,
        kshAmount,
        phoneNumber,
        transactionId,
        chainId
      })
    } else {
      result = await processTransakOffRamp({
        walletAddress,
        usdcAmount,
        kshAmount,
        phoneNumber,
        transactionId,
        chainId
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
      chainId,
      status: 'initiated',
      timestamp: new Date(),
      ...result
    })

    return NextResponse.json({
      success: true,
      transactionId,
      provider,
      chainId,
      networkName: getNetworkConfig(chainId).name,
      ...result
    })

  } catch (error) {
    console.error('Off-ramp processing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transaction failed' },
      { status: 500 }
    )
  }
}

// Check USDC balance for specific chain
async function checkUSDCBalance(address: string, chainId: number): Promise<number> {
  try {
    const client = createClient(chainId)
    const usdcContract = getUSDCContract(chainId)

    // Get USDC balance (6 decimals for USDC)
    const balance = await client.readContract({
      address: usdcContract as `0x${string}`,
      abi: [
        {
          constant: true,
          inputs: [{ name: 'owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          type: 'function',
        },
      ],
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    })

    // Convert from wei to USDC (6 decimals)
    return Number(balance) / 1e6
  } catch (error) {
    console.error('Error checking USDC balance:', error)
    return 0
  }
}

// Process M-Pesa off-ramp (direct STK Push)
async function processMPesaOffRamp(params: {
  walletAddress: string
  usdcAmount: number
  kshAmount: number
  phoneNumber: string
  transactionId: string
  chainId: number
}) {
  try {
    // Initiate M-Pesa STK Push
    const mpesaResult = await mpesa.stkPush({
      phoneNumber: params.phoneNumber,
      amount: params.kshAmount,
      accountReference: params.transactionId,
      transactionDesc: `USDC to KSH conversion - ${params.usdcAmount} USDC`
    })

    return {
      checkoutRequestID: mpesaResult.checkoutRequestID,
      merchantRequestID: mpesaResult.merchantRequestID,
      mpesaReference: mpesaResult.checkoutRequestID,
      message: 'M-Pesa STK push sent. Please check your phone and enter your M-Pesa PIN.',
      customerMessage: mpesaResult.customerMessage
    }
  } catch (error) {
    throw new Error(`M-Pesa payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Process MoonPay off-ramp (existing implementation)
async function processMoonPayOffRamp(params: {
  walletAddress: string
  usdcAmount: number
  kshAmount: number
  phoneNumber: string
  transactionId: string
  chainId: number
}) {
  try {
    const sellUrl = await moonpay.initiateSellTransaction({
      walletAddress: params.walletAddress,
      cryptoCurrency: 'usdc',
      baseCurrency: 'kes',
      quoteCurrencyAmount: params.kshAmount,
      externalCustomerId: params.transactionId,
      redirectURL: `${process.env.NEXT_PUBLIC_URL}/success?tx=${params.transactionId}`
    })

    return {
      sellUrl,
      mpesaReference: params.transactionId,
      message: 'Redirecting to MoonPay for KYC and payment processing'
    }
  } catch (error) {
    throw new Error(`MoonPay processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Process Transak off-ramp (existing implementation)
async function processTransakOffRamp(params: {
  walletAddress: string
  usdcAmount: number
  kshAmount: number
  phoneNumber: string
  transactionId: string
  chainId: number
}) {
  try {
    const sellUrl = transak.generateSellURL({
      walletAddress: params.walletAddress,
      cryptoCurrencyCode: 'USDC',
      fiatCurrency: 'KES',
      fiatAmount: params.kshAmount,
      email: `${params.transactionId}@temp.com`, // Temporary email
      phoneNumber: params.phoneNumber
    })

    return {
      sellUrl,
      mpesaReference: params.transactionId,
      message: 'Redirecting to Transak for KYC and payment processing'
    }
  } catch (error) {
    throw new Error(`Transak processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Generate unique transaction ID
function generateTransactionId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `KE_${timestamp}_${randomStr}`.toUpperCase()
}

// Log transaction for compliance and tracking
async function logTransaction(data: TransactionLogData) {
  try {
    // In a real implementation, you would save this to a database
    // For now, we'll just log it
    console.log('Transaction logged:', JSON.stringify(data, null, 2))
    
    // TODO: Implement database storage
    // await database.transactions.create(data)
    
  } catch (error) {
    console.error('Failed to log transaction:', error)
    // Don't throw error as this shouldn't fail the main transaction
  }
}

// Validate Kenyan phone number (backup validation)
function validateKenyanPhone(phoneNumber: string): boolean {
  // Kenyan phone format: +254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX
  const regex = /^(\+254|0)[17]\d{8}$/
  return regex.test(phoneNumber)
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
      status: 'pending',
      message: 'Transaction is being processed. Please check your M-Pesa for confirmation.',
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