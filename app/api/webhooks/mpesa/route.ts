import { NextRequest, NextResponse } from 'next/server'
import { createMPesaInstance } from '@/lib/mpesa'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('M-Pesa callback received:', JSON.stringify(body, null, 2))

    const mpesa = createMPesaInstance()
    
    // Process the callback data
    const callbackData = mpesa.processCallback(body)
    
    console.log('Processed callback data:', callbackData)

    // Handle successful payment
    if (callbackData.resultCode === 0) {
      console.log('✅ M-Pesa payment successful!', {
        merchantRequestID: callbackData.merchantRequestID,
        checkoutRequestID: callbackData.checkoutRequestID,
        amount: callbackData.amount,
        mpesaReceiptNumber: callbackData.mpesaReceiptNumber,
        phoneNumber: callbackData.phoneNumber
      })

      // TODO: Update your database with successful payment
      // await updateTransactionStatus(callbackData.checkoutRequestID, 'success', callbackData)
      
      // TODO: Send confirmation notification to user
      // await sendPaymentConfirmation(callbackData)

    } else {
      console.log('❌ M-Pesa payment failed:', {
        merchantRequestID: callbackData.merchantRequestID,
        checkoutRequestID: callbackData.checkoutRequestID,
        resultCode: callbackData.resultCode,
        resultDesc: callbackData.resultDesc
      })

      // TODO: Update your database with failed payment
      // await updateTransactionStatus(callbackData.checkoutRequestID, 'failed', callbackData)
      
      // TODO: Notify user of failed payment
      // await sendPaymentFailureNotification(callbackData)
    }

    // Respond to M-Pesa with success acknowledgment
    return NextResponse.json({ 
      status: 'success',
      message: 'Callback processed successfully' 
    }, { status: 200 })

  } catch (error) {
    console.error('M-Pesa webhook error:', error)
    
    // Still return success to M-Pesa to prevent retries
    // but log the error for debugging
    return NextResponse.json({ 
      status: 'error',
      message: 'Internal processing error' 
    }, { status: 200 })
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ 
    message: 'M-Pesa webhook endpoint is active' 
  }, { status: 200 })
} 