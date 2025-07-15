import { createHmac, timingSafeEqual } from 'crypto'

export interface TransakSellParams {
  walletAddress: string
  cryptoCurrencyCode: 'USDC'
  fiatCurrency: 'KES'
  fiatAmount: number
  email: string
  phoneNumber: string
  redirectURL?: string
}

export interface TransakConfig {
  apiKey: string
  environment: 'STAGING' | 'PRODUCTION'
  partnerId?: string
  partnerOrderId?: string
}

export class TransakIntegration {
  private apiKey: string
  private environment: 'STAGING' | 'PRODUCTION'
  private partnerId?: string
  private baseUrl: string

  constructor(config: TransakConfig) {
    this.apiKey = config.apiKey
    this.environment = config.environment
    this.partnerId = config.partnerId
    this.baseUrl = this.environment === 'STAGING' 
      ? 'https://staging-global.transak.com' 
      : 'https://global.transak.com'
  }

  /**
   * Generate Transak widget URL for sell transactions
   */
  generateSellURL(params: TransakSellParams): string {
    const query = new URLSearchParams({
      apiKey: this.apiKey,
      hostURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      walletAddress: params.walletAddress,
      cryptoCurrencyCode: params.cryptoCurrencyCode,
      fiatCurrency: params.fiatCurrency,
      fiatAmount: params.fiatAmount.toString(),
      email: params.email,
      mobileNumber: params.phoneNumber,
      productsAvailed: 'SELL',
      themeColor: '000000',
      hideMenu: 'true',
      environment: this.environment,
    })

    // Add optional parameters
    if (params.redirectURL) {
      query.append('redirectURL', params.redirectURL)
    }

    if (this.partnerId) {
      query.append('partnerId', this.partnerId)
    }

    return `${this.baseUrl}?${query}`
  }

  /**
   * Get supported currencies for Kenya
   */
  async getSupportedCurrencies(): Promise<any> {
    const response = await fetch(
      `https://api.transak.com/api/v2/currencies/crypto-currencies`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Transak API error: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Get current exchange rates
   */
  async getExchangeRate(
    cryptoCurrency: string = 'USDC',
    fiatCurrency: string = 'KES',
    amount: number = 1
  ): Promise<any> {
    const query = new URLSearchParams({
      fiatCurrency,
      cryptoCurrency,
      fiatAmount: amount.toString(),
      paymentMethod: 'mobile_money', // For M-Pesa
      partnerApiKey: this.apiKey,
    })

    const response = await fetch(
      `https://api.transak.com/api/v2/currencies/price?${query}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Validate Kenyan phone number for M-Pesa
   */
  validateKenyanPhone(phoneNumber: string): boolean {
    // Kenyan phone formats: +254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX
    const regex = /^(\+254|0)[17]\d{8}$/
    return regex.test(phoneNumber)
  }

  /**
   * Format phone number to international format
   */
  formatPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.startsWith('0')) {
      return '+254' + phoneNumber.substring(1)
    }
    return phoneNumber
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<any> {
    const response = await fetch(
      `https://api.transak.com/api/v2/orders/${orderId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Transak API error: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Handle webhook verification
   */
  verifyWebhook(payload: string, signature: string, secret: string): boolean {
    const computedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(computedSignature, 'hex')
    )
  }

  /**
   * Calculate fees for a transaction
   */
  calculateFees(amount: number, currency: string = 'KES'): {
    processingFee: number
    networkFee: number
    totalFee: number
    feePercentage: number
  } {
    // Transak typical fees for Kenya: 2-4%
    const basePercentage = amount > 10000 ? 0.025 : 0.035 // 2.5% for larger amounts, 3.5% for smaller
    const processingFee = amount * basePercentage
    const networkFee = currency === 'KES' ? 50 : 0 // Fixed network fee in KES
    const totalFee = processingFee + networkFee
    const feePercentage = (totalFee / amount) * 100

    return {
      processingFee,
      networkFee,
      totalFee,
      feePercentage
    }
  }
} 