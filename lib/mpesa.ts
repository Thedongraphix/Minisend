import crypto from 'crypto'

export interface MPesaConfig {
  consumerKey: string
  consumerSecret: string
  businessShortCode: string
  passkey: string
  environment: 'sandbox' | 'production'
}

export interface MPesaPaymentRequest {
  phoneNumber: string
  amount: number
  accountReference: string
  transactionDesc: string
}

export interface MPesaPaymentResponse {
  merchantRequestID: string
  checkoutRequestID: string
  responseCode: string
  responseDescription: string
  customerMessage: string
}

export interface MPesaCallbackData {
  merchantRequestID: string
  checkoutRequestID: string
  resultCode: number
  resultDesc: string
  amount?: number
  mpesaReceiptNumber?: string
  phoneNumber?: string
}

interface MPesaQueryResponse {
  ResponseCode: string
  ResponseDescription: string
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: string
  ResultDesc: string
}

interface MPesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{
          Name: string
          Value: any
        }>
      }
    }
  }
}

export class MPesaIntegration {
  private config: MPesaConfig
  private baseUrl: string

  constructor(config: MPesaConfig) {
    this.config = config
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'
  }

  // Generate OAuth access token
  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64')
    
    const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get M-Pesa access token')
    }

    const data = await response.json()
    return data.access_token
  }

  // Generate password for STK push
  private generatePassword(): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
    const password = Buffer.from(`${this.config.businessShortCode}${this.config.passkey}${timestamp}`).toString('base64')
    return password
  }

  // Format phone number to international format
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove spaces and hyphens
    let formatted = phoneNumber.replace(/[\s-]/g, '')
    
    // Handle Kenyan phone number formats
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1)
    } else if (formatted.startsWith('+254')) {
      formatted = formatted.substring(1)
    } else if (!formatted.startsWith('254')) {
      formatted = '254' + formatted
    }
    
    return formatted
  }

  // Validate Kenyan phone number
  public validateKenyanPhone(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber)
    // Kenyan mobile numbers: 254-7XX-XXX-XXX or 254-1XX-XXX-XXX
    const regex = /^254[17]\d{8}$/
    return regex.test(formatted)
  }

  // Initiate STK Push payment
  async stkPush(request: MPesaPaymentRequest): Promise<MPesaPaymentResponse> {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
      const password = this.generatePassword()
      const phoneNumber = this.formatPhoneNumber(request.phoneNumber)

      if (!this.validateKenyanPhone(request.phoneNumber)) {
        throw new Error('Invalid Kenyan phone number format')
      }

      const payload = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount), // M-Pesa requires whole numbers
        PartyA: phoneNumber,
        PartyB: this.config.businessShortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/mpesa`,
        AccountReference: request.accountReference,
        TransactionDesc: request.transactionDesc
      }

      const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`M-Pesa STK Push failed: ${errorData.errorMessage || 'Unknown error'}`)
      }

      const responseData = await response.json()
      return responseData as MPesaPaymentResponse

    } catch (error) {
      console.error('M-Pesa STK Push error:', error)
      throw error
    }
  }

  // Query STK Push transaction status
  async queryTransaction(checkoutRequestID: string): Promise<MPesaQueryResponse> {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
      const password = this.generatePassword()

      const payload = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      }

      const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Failed to query M-Pesa transaction')
      }

      return await response.json()

    } catch (error) {
      console.error('M-Pesa query error:', error)
      throw error
    }
  }

  // Verify callback signature (for webhook security)
  verifyCallback(callbackData: string, signature: string): boolean {
    // Implement signature verification based on your webhook security setup
    // This is a basic implementation - enhance based on Safaricom's requirements
    const expectedSignature = crypto
      .createHmac('sha256', this.config.consumerSecret)
      .update(callbackData)
      .digest('base64')
    
    return expectedSignature === signature
  }

  // Process callback data from M-Pesa
  processCallback(callbackBody: MPesaCallbackBody): MPesaCallbackData {
    const { Body } = callbackBody
    const { stkCallback } = Body

    const result: MPesaCallbackData = {
      merchantRequestID: stkCallback.MerchantRequestID,
      checkoutRequestID: stkCallback.CheckoutRequestID,
      resultCode: stkCallback.ResultCode,
      resultDesc: stkCallback.ResultDesc
    }

    // If payment was successful, extract additional details
    if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata) {
      const metadata = stkCallback.CallbackMetadata.Item
      
      metadata.forEach((item: { Name: string; Value: any }) => {
        switch (item.Name) {
          case 'Amount':
            result.amount = item.Value
            break
          case 'MpesaReceiptNumber':
            result.mpesaReceiptNumber = item.Value
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

// Helper function to create M-Pesa instance
export function createMPesaInstance(): MPesaIntegration {
  const config: MPesaConfig = {
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    businessShortCode: process.env.MPESA_SHORTCODE || '',
    passkey: process.env.MPESA_PASSKEY || '',
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
  }

  return new MPesaIntegration(config)
} 