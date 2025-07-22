import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'
// PayCrest integration - no more mpesa imports
import { getUSDCContract, getNetworkConfig } from '@/lib/contracts'

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
  provider?: 'paycrest'
  chainId?: number
  accountName?: string // Required for PayCrest
  rate?: number // Required for PayCrest
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
  checkoutRequestID?: string
  mpesaReference?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: OffRampRequest = await request.json()
    const { 
      walletAddress, 
      usdcAmount, 
      kshAmount, 
      phoneNumber, 
      provider = 'paycrest',
      accountName,
      chainId = base.id 
    } = body

    // Validate input
    if (!walletAddress || !usdcAmount || !kshAmount || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validation for PayCrest (now our only provider)
    if (!accountName) {
      return NextResponse.json(
        { error: 'Account name is required' },
        { status: 400 }
      )
    }

    // Validate phone number format for M-Pesa
    const phoneRegex = /^(\+?254|0)[17]\d{8}$/
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid Kenyan phone number format. Use +254XXXXXXXXX or 07XXXXXXXX' },
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

    // 3. Process PayCrest off-ramp 
    const result = await processPaycrestOffRamp({
      walletAddress,
      usdcAmount,
      kshAmount,
      phoneNumber,
      accountName: accountName!,
      transactionId,
      chainId
    })

    // 4. Log transaction for compliance
    await logTransaction({
      transactionId,
      walletAddress,
      usdcAmount,
      kshAmount,
      phoneNumber,
      provider,
      chainId,
      status: result.status || 'initiated',
      timestamp: new Date()
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

// Process PayCrest off-ramp
async function processPaycrestOffRamp(params: {
  walletAddress: string
  usdcAmount: number
  kshAmount: number
  phoneNumber: string
  accountName: string
  transactionId: string
  chainId: number
}) {
  try {
    console.log(`🚀 Creating PayCrest order: $${params.usdcAmount} USDC → KSH ${params.kshAmount} for ${params.phoneNumber}`)
    
    // Create PayCrest order via API call to our endpoint
    const orderResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/paycrest/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.usdcAmount.toString(),
        phoneNumber: params.phoneNumber,
        accountName: params.accountName,
        returnAddress: params.walletAddress,
        provider: 'MPESA',
        reference: params.transactionId
      }),
    })

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json()
      throw new Error(errorData.error || 'Failed to create PayCrest order')
    }

    const { order } = await orderResponse.json()

    return {
      orderId: order.id,
      receiveAddress: order.receiveAddress,
      validUntil: order.validUntil,
      senderFee: order.senderFee,
      transactionFee: order.transactionFee,
      totalAmount: order.totalAmount,
      status: order.status,
      message: `PayCrest order created successfully. Send ${order.totalAmount} USDC to the address below.`,
      recipient: order.recipient
    }
  } catch (error) {
    throw new Error(`PayCrest order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}