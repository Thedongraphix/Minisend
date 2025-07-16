import { NextRequest, NextResponse } from 'next/server'
import { MoonPayIntegration } from '@/lib/moonpay'

const moonpay = new MoonPayIntegration(
  process.env.MOONPAY_API_KEY || '',
  process.env.MOONPAY_SECRET_KEY || '',
  process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
)

interface MoonPayTransactionData {
  id: string
  status: string
  failureReason?: string
  externalCustomerId?: string
}

interface MoonPayWebhookPayload {
  type: string
  data: MoonPayTransactionData
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('moonpay-signature') || ''

    // Verify webhook signature
    if (!moonpay.verifyWebhook(signature, body)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    const webhookData: MoonPayWebhookPayload = JSON.parse(body)
    const { type, data } = webhookData

    console.log('MoonPay webhook received:', { type, transactionId: data.id })

    switch (type) {
      case 'transaction_updated':
        await handleTransactionUpdate(data)
        break
      case 'transaction_completed':
        await handleTransactionCompleted(data)
        break
      case 'transaction_failed':
        await handleTransactionFailed(data)
        break
      default:
        console.log('Unhandled webhook type:', type)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('MoonPay webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleTransactionUpdate(transactionData: MoonPayTransactionData) {
  // Update transaction status in your database
  console.log('Transaction updated:', transactionData.id, transactionData.status)
  
  // In production, update your database:
  // await updateTransactionStatus(transactionData.id, transactionData.status)
}

async function handleTransactionCompleted(transactionData: MoonPayTransactionData) {
  console.log('Transaction completed:', transactionData.id)
  
  // In production:
  // 1. Update transaction status to completed
  // 2. Send confirmation notification to user
  // 3. Update compliance records
  
  // Example notification (implement with your notification system)
  if (transactionData.externalCustomerId) {
    // await sendNotification(transactionData.externalCustomerId, {
    //   type: 'transaction_completed',
    //   message: 'Your USDC to M-Pesa conversion has been completed'
    // })
  }
}

async function handleTransactionFailed(transactionData: MoonPayTransactionData) {
  console.log('Transaction failed:', transactionData.id, transactionData.failureReason)
  
  // In production:
  // 1. Update transaction status to failed
  // 2. Send failure notification to user
  // 3. Initiate refund if necessary
  // 4. Log for compliance review
  
  if (transactionData.externalCustomerId) {
    // await sendNotification(transactionData.externalCustomerId, {
    //   type: 'transaction_failed',
    //   message: `Transaction failed: ${transactionData.failureReason}`
    // })
  }
} 