import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('⏰ B2C Timeout Callback:', JSON.stringify(body, null, 2))

    const { Result } = body

    if (Result) {
      const { 
        OriginatorConversationID, 
        ConversationID,
        ResultDesc 
      } = Result

      console.log('⏰ B2C Payment timed out:', {
        OriginatorConversationID,
        ConversationID,
        ResultDesc
      })

      // TODO: Update transaction status in database to 'timeout'
      // await updateTransactionStatus(ConversationID, 'timeout', {
      //   reason: 'B2C payment request timed out'
      // })

      // TODO: Initiate USDC refund for timed out transaction
      // await initiateUSDCRefund(ConversationID, 'timeout')

      // TODO: Notify user of timeout and refund
      // await notifyUserOfTimeout(ConversationID)
    }

    // Acknowledge receipt to Safaricom
    return NextResponse.json({ 
      ResultCode: 0, 
      ResultDesc: 'Timeout acknowledged' 
    })

  } catch (error) {
    console.error('❌ B2C Timeout callback error:', error)
    
    // Still acknowledge to prevent Safaricom retries
    return NextResponse.json({ 
      ResultCode: 0, 
      ResultDesc: 'Timeout acknowledged' 
    })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'M-Pesa B2C Timeout callback endpoint is active',
    purpose: 'Receives B2C payment timeout notifications from Safaricom'
  })
}