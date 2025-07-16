import crypto from 'crypto'

export interface TransakConfig {
  apiKey: string
  environment: 'STAGING' | 'PRODUCTION'
}

export interface TransakSellParams {
  walletAddress: string
  cryptoCurrencyCode: 'USDC'
  fiatCurrency: 'KES'
  fiatAmount: number
  email: string
  phoneNumber: string
}

export interface TransakOrderData {
  id: string
  status: string
  fiatCurrency: string
  cryptoCurrency: string
  requestedAmount: number
  walletAddress: string
  createdAt: string
}

export interface TransakCurrencyResponse {
  response: Array<{
    symbol: string
    name: string
    minAmount: number
    maxAmount: number
  }>
}

export interface TransakPriceResponse {
  response: {
    fiatAmount: number
    cryptoAmount: number
    feeAmount: number
    totalAmount: number
  }
}

export interface TransakOrderResponse {
  response: {
    id: string
    status: string
    walletAddress: string
    cryptoCurrency: string
    fiatCurrency: string
    requestedAmount: number
    createdAt: string
  }
}

export class TransakIntegration {
  private config: TransakConfig
  private baseUrl: string

  constructor(config: TransakConfig) {
    this.config = config
    this.baseUrl = config.environment === 'PRODUCTION' 
      ? 'https://global.transak.com' 
      : 'https://staging-global.transak.com'
  }

  // Generate URL for sell transactions
  generateSellURL(params: TransakSellParams): string {
    const query = new URLSearchParams({
      apiKey: this.config.apiKey,
      hostURL: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000',
      walletAddress: params.walletAddress,
      cryptoCurrencyCode: params.cryptoCurrencyCode,
      fiatCurrency: params.fiatCurrency,
      fiatAmount: params.fiatAmount.toString(),
      email: params.email,
      mobileNumber: params.phoneNumber,
      redirectURL: `${typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000'}/success`,
      productsAvailed: 'SELL',
      themeColor: '000000',
      hideMenu: 'true',
      disableWalletAddressForm: 'true'
    })

    return `${this.baseUrl}?${query}`
  }

  // Get supported currencies
  async getSupportedCurrencies(): Promise<TransakCurrencyResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/currencies/crypto-currencies`, {
        headers: {
          'api-key': this.config.apiKey
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch supported currencies')
      }

      return await response.json()
    } catch (error) {
      console.error('Transak get currencies error:', error)
      throw error
    }
  }

  // Get exchange rate
  async getExchangeRate(fromCurrency: string, toCurrency: string, amount: number): Promise<TransakPriceResponse> {
    try {
      const query = new URLSearchParams({
        fiatCurrency: toCurrency,
        cryptoCurrency: fromCurrency,
        fiatAmount: amount.toString(),
        network: 'base',
        partnerApiKey: this.config.apiKey
      })

      const response = await fetch(`${this.baseUrl}/api/v2/currencies/price?${query}`)

      if (!response.ok) {
        throw new Error('Failed to fetch exchange rate')
      }

      return await response.json()
    } catch (error) {
      console.error('Transak get exchange rate error:', error)
      throw error
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')
      
      return expectedSignature === signature
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return false
    }
  }

  // Process webhook data
  processWebhook(webhookData: any): TransakOrderData {
    const { eventData } = webhookData
    
    return {
      id: eventData.id,
      status: eventData.status,
      fiatCurrency: eventData.fiatCurrency,
      cryptoCurrency: eventData.cryptocurrency,
      requestedAmount: eventData.fiatAmount,
      walletAddress: eventData.walletAddress,
      createdAt: eventData.createdAt
    }
  }
} 