import { createHmac, timingSafeEqual } from 'crypto'

export interface MoonPaySellParams {
  walletAddress: string
  cryptoCurrency: 'usdc'
  baseCurrency: 'kes'
  quoteCurrencyAmount: number
  externalCustomerId: string
  redirectURL: string
  phoneNumber?: string
}

export interface MoonPayTransactionStatus {
  id: string
  status: 'pending' | 'completed' | 'failed' | 'waitingPayment'
  cryptoTransactionId?: string
  externalTransactionId?: string
  failureReason?: string
}

export class MoonPayIntegration {
  private apiKey: string
  private secretKey: string
  private baseUrl: string
  private environment: 'sandbox' | 'production'

  constructor(apiKey: string, secretKey: string, environment: 'sandbox' | 'production' = 'sandbox') {
    this.apiKey = apiKey
    this.secretKey = secretKey
    this.environment = environment
    this.baseUrl = environment === 'sandbox' 
      ? 'https://api.moonpay.com'
      : 'https://api.moonpay.com'
  }

  /**
   * Initiate a sell transaction (crypto to fiat)
   */
  async initiateSellTransaction(params: MoonPaySellParams): Promise<string> {
    const query = new URLSearchParams({
      apiKey: this.apiKey,
      currencyCode: params.cryptoCurrency,
      baseCurrencyCode: params.baseCurrency,
      baseCurrencyAmount: params.quoteCurrencyAmount.toString(),
      externalCustomerId: params.externalCustomerId,
      redirectURL: params.redirectURL,
      walletAddress: params.walletAddress,
    })

    // Add phone number if provided (for M-Pesa)
    if (params.phoneNumber) {
      query.append('phoneNumber', params.phoneNumber)
    }

    const signature = createHmac('sha256', this.secretKey)
      .update(query.toString())
      .digest('base64')

    return `${this.baseUrl}/v4/sell_transaction?${query}&signature=${encodeURIComponent(signature)}`
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<MoonPayTransactionStatus> {
    const endpoint = `/v1/transactions/${transactionId}`
    const signature = this.createSignature('GET', endpoint)
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Api-Key ${this.apiKey}`,
        'Signature': signature,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`MoonPay API error: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Get current exchange rates
   */
  async getExchangeRate(fromCurrency: string = 'usd', toCurrency: string = 'kes'): Promise<number> {
    const response = await fetch(
      `${this.baseUrl}/v3/currencies/${fromCurrency}/price?quote=${toCurrency}`,
      {
        headers: {
          'Authorization': `Api-Key ${this.apiKey}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.statusText}`)
    }

    const data = await response.json()
    return parseFloat(data.price)
  }

  /**
   * Validate M-Pesa phone number format
   */
  validateMPesaNumber(phoneNumber: string): boolean {
    // Kenyan M-Pesa numbers: +254XXXXXXXXX
    const regex = /^\+254[17]\d{8}$/
    return regex.test(phoneNumber)
  }

  /**
   * Create HMAC signature for authenticated requests
   */
  private createSignature(method: string, endpoint: string, body?: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const payload = `${timestamp}${method}${endpoint}${body || ''}`
    
    return createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('base64')
  }

  /**
   * Handle webhook verification
   */
  verifyWebhook(signature: string, body: string): boolean {
    const computedSignature = createHmac('sha256', this.secretKey)
      .update(body)
      .digest('base64')

    return timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(computedSignature, 'base64')
    )
  }
} 