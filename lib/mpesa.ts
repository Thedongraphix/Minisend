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
  processCallback(callbackBody: { Body: { stkCallback: Record<string, unknown> } }): MPesaCallbackData {
    const { Body } = callbackBody
    const { stkCallback } = Body

    const result: MPesaCallbackData = {
      resultCode: typeof stkCallback.ResultCode === 'number' ? stkCallback.ResultCode : 0,
      resultDesc: typeof stkCallback.ResultDesc === 'string' ? stkCallback.ResultDesc : '',
      merchantRequestID: typeof stkCallback.MerchantRequestID === 'string' ? stkCallback.MerchantRequestID : '',
      checkoutRequestID: typeof stkCallback.CheckoutRequestID === 'string' ? stkCallback.CheckoutRequestID : '',
    }

    if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata) {
      const callbackMetadata = stkCallback.CallbackMetadata as { Item: Array<{ Name: string; Value: unknown }> };
      const metadata = callbackMetadata.Item;
      
      metadata.forEach((item) => {
        switch (item.Name) {
          case 'Amount':
            result.amount = typeof item.Value === 'number' ? item.Value : undefined
            break
          case 'MpesaReceiptNumber':
            result.mpesaReceiptNumber = typeof item.Value === 'string' ? item.Value : undefined
            break
          case 'Balance':
            result.balance = typeof item.Value === 'number' ? item.Value : undefined
            break
          case 'TransactionDate':
            result.transactionDate = typeof item.Value === 'string' ? item.Value : undefined
            break
          case 'PhoneNumber':
            result.phoneNumber = typeof item.Value === 'string' ? item.Value : undefined
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