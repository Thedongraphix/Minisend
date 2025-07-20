// M-Pesa Integration for Kenya USDC Off-Ramp
export interface MPesaConfig {
  consumerKey: string
  consumerSecret: string
  passkey: string
  shortcode: string
  environment: 'sandbox' | 'production'
}

export interface MPesaCallbackData {
  resultCode: number
  resultDesc: string
  merchantRequestID: string
  checkoutRequestID: string
  amount?: number
  mpesaReceiptNumber?: string
  balance?: number
  transactionDate?: string
  phoneNumber?: string
}

export class MPesaIntegration {
  private config: MPesaConfig

  constructor(config: MPesaConfig) {
    this.config = config
  }

  // Process callback data from M-Pesa
  processCallback(callbackBody: any): MPesaCallbackData {
    const { Body } = callbackBody
    const { stkCallback } = Body

    const result: MPesaCallbackData = {
      resultCode: stkCallback.ResultCode,
      resultDesc: stkCallback.ResultDesc,
      merchantRequestID: stkCallback.MerchantRequestID,
      checkoutRequestID: stkCallback.CheckoutRequestID,
    }

    if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata) {
      const metadata = stkCallback.CallbackMetadata.Item
      
      metadata.forEach((item: any) => {
        switch (item.Name) {
          case 'Amount':
            result.amount = item.Value
            break
          case 'MpesaReceiptNumber':
            result.mpesaReceiptNumber = item.Value
            break
          case 'Balance':
            result.balance = item.Value
            break
          case 'TransactionDate':
            result.transactionDate = item.Value
            break
          case 'PhoneNumber':
            result.phoneNumber = item.Value
            break
        }
      })
    }

    return result
  }
}

// Factory function to create M-Pesa instance
export function createMPesaInstance(): MPesaIntegration {
  const config: MPesaConfig = {
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    passkey: process.env.MPESA_PASSKEY || '',
    shortcode: process.env.MPESA_SHORTCODE || '',
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  }

  return new MPesaIntegration(config)
} 