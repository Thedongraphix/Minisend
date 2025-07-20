import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📨 B2C Result Callback:', JSON.stringify(body, null, 2))

    const { Result } = body

    if (Result) {
      const { 
        ResultType, 
        ResultCode, 
        ResultDesc, 
        OriginatorConversationID, 
        ConversationID,
        TransactionID 
      } = Result

      if (ResultCode === 0) {
        // B2C Payment successful - user received money
        console.log('✅ B2C Payment successful - Money sent to user:', {
          OriginatorConversationID,
          ConversationID,
          TransactionID,
          ResultDesc
        })

        // Extract additional details if available
        let recipientInfo = {}
        if (Result.ResultParameters?.ResultParameter) {
          Result.ResultParameters.ResultParameter.forEach((param: any) => {
            if (param.Key === 'TransactionAmount') {
              recipientInfo = { ...recipientInfo, amount: param.Value }
            }
            if (param.Key === 'TransactionReceipt') {
              recipientInfo = { ...recipientInfo, receipt: param.Value }
            }
            if (param.Key === 'ReceiverPartyPublicName') {
              recipientInfo = { ...recipientInfo, recipient: param.Value }
            }
          })
        }

        console.log('💰 Payment details:', recipientInfo)

        // TODO: Update transaction status in database to 'completed'
        // await updateTransactionStatus(ConversationID, 'completed', {
        //   transactionId: TransactionID,
        //   mpesaReceipt: recipientInfo.receipt,
        //   amount: recipientInfo.amount
        // })

        // TODO: Send success notification to user
        // await notifyUserOfSuccessfulPayment(ConversationID, recipientInfo)

      } else {
        // B2C Payment failed
        console.log('❌ B2C Payment failed:', {
          OriginatorConversationID,
          ConversationID,
          ResultCode,
          ResultDesc
        })

        // TODO: Update transaction status in database to 'failed'
        // await updateTransactionStatus(ConversationID, 'failed', {
        //   errorCode: ResultCode,
        //   errorDescription: ResultDesc
        // })

        // TODO: Trigger USDC refund if applicable
        // await initiateUSDCRefund(ConversationID)

        // TODO: Notify user of failed payment
        // await notifyUserOfFailedPayment(ConversationID, ResultDesc)
      }
    }

    // Always acknowledge receipt to Safaricom
    return NextResponse.json({ 
      ResultCode: 0, 
      ResultDesc: 'Accepted' 
    })

  } catch (error) {
    console.error('❌ B2C Result callback error:', error)
    
    // Still acknowledge to prevent Safaricom retries
    return NextResponse.json({ 
      ResultCode: 0, 
      ResultDesc: 'Accepted' 
    })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'M-Pesa B2C Result callback endpoint is active',
    purpose: 'Receives B2C payment completion notifications from Safaricom'
  })
}