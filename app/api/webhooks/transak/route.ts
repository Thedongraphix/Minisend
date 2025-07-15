import { NextRequest, NextResponse } from 'next/server'
import { TransakIntegration } from '@/lib/transak'

const transak = new TransakIntegration({
  apiKey: process.env.TRANSAK_API_KEY || '',
  environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'STAGING',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-webhook-signature') || ''
    const webhookSecret = process.env.TRANSAK_WEBHOOK_SECRET || ''

    // Verify webhook signature
    if (!transak.verifyWebhook(body, signature, webhookSecret)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    const webhookData = JSON.parse(body)
    const { eventID, webhookData: data } = webhookData

    console.log('Transak webhook received:', { eventID, orderId: data.id })

    switch (eventID) {
      case 'ORDER_PROCESSING':
        await handleOrderProcessing(data)
        break
      case 'ORDER_COMPLETED':
        await handleOrderCompleted(data)
        break
      case 'ORDER_FAILED':
        await handleOrderFailed(data)
        break
      case 'ORDER_CANCELLED':
        await handleOrderCancelled(data)
        break
      default:
        console.log('Unhandled webhook event:', eventID)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Transak webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleOrderProcessing(orderData: any) {
  console.log('Order processing:', orderData.id)
  
  // Update transaction status to processing
  // await updateTransactionStatus(orderData.partnerOrderId, 'processing')
}

async function handleOrderCompleted(orderData: any) {
  console.log('Order completed:', orderData.id)
  
  // In production:
  // 1. Update transaction status to completed
  // 2. Send success notification to user
  // 3. Update compliance records
  
  if (orderData.partnerCustomerId) {
    // await sendNotification(orderData.partnerCustomerId, {
    //   type: 'order_completed',
    //   message: `Your order of ${orderData.fiatAmount} ${orderData.fiatCurrency} has been completed`
    // })
  }
}

async function handleOrderFailed(orderData: any) {
  console.log('Order failed:', orderData.id, orderData.statusDetail)
  
  // In production:
  // 1. Update transaction status to failed
  // 2. Send failure notification
  // 3. Process refund if applicable
  
  if (orderData.partnerCustomerId) {
    // await sendNotification(orderData.partnerCustomerId, {
    //   type: 'order_failed',
    //   message: `Order failed: ${orderData.statusDetail}`
    // })
  }
}

async function handleOrderCancelled(orderData: any) {
  console.log('Order cancelled:', orderData.id)
  
  // Update transaction status to cancelled
  // await updateTransactionStatus(orderData.partnerOrderId, 'cancelled')
} 