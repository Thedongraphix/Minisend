// PayCrest Sender API Integration
// Handles USDC to KSH offramp functionality

export interface PaycrestConfig {
  apiKey: string;
  webhookSecret: string;
  baseUrl: string;
}

export interface PaycrestRecipient {
  institution: string;
  accountIdentifier: string;
  accountName: string;
  currency: string;
  memo?: string;
}

export interface PaycrestOrderRequest {
  amount: string;
  token: string;
  network: string;
  rate: string;
  recipient: PaycrestRecipient;
  reference: string;
  returnAddress: string;
}

export interface PaycrestOrder {
  id: string;
  receiveAddress: string;
  validUntil: string;
  senderFee: string;
  transactionFee: string;
  amount: string;
  status: 'pending' | 'validated' | 'settled' | 'refunded' | 'expired';
  token: string;
  network: string;
  recipient: PaycrestRecipient;
  reference: string;
}

export interface PaycrestWebhookEvent {
  event: string;
  data: PaycrestOrder;
}

export class PaycrestError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'PaycrestError';
  }
}

export class PaycrestService {
  private config: PaycrestConfig;

  constructor(config: PaycrestConfig) {
    this.config = config;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'API-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `PayCrest API error: ${response.statusText}`;
      
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message || errorMessage;
      } catch {
        // If we can't parse the error body, use the status text
      }

      throw new PaycrestError(errorMessage, response.status);
    }

    const result = await response.json();
    
    // PayCrest API returns data in a nested structure: { status, message, data }
    // Extract the data field if it exists
    return result.data || result;
  }

  async createOrder(orderData: PaycrestOrderRequest): Promise<PaycrestOrder> {
    return this.makeRequest<PaycrestOrder>('/v1/sender/orders', 'POST', orderData);
  }

  async getOrderStatus(orderId: string): Promise<PaycrestOrder> {
    return this.makeRequest<PaycrestOrder>(`/v1/sender/orders/${orderId}`);
  }

  verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    const key = Buffer.from(this.config.webhookSecret);
    const hash = crypto.createHmac('sha256', key);
    hash.update(payload);
    const calculatedSignature = hash.digest('hex');
    
    return signature === calculatedSignature;
  }

  async createOrderWithRetry(
    orderData: PaycrestOrderRequest,
    maxRetries: number = 3
  ): Promise<PaycrestOrder> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.createOrder(orderData);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }
}

// Helper function to create KSH mobile money recipient
export function createKshMobileMoneyRecipient(
  phoneNumber: string,
  accountName: string,
  provider: 'MPESA' | 'AIRTEL' = 'MPESA'
): PaycrestRecipient {
  const institutionCode = provider === 'MPESA' ? 'SAFAKEPC' : 'AIRTKEPC';
  
  return {
    institution: institutionCode,
    accountIdentifier: phoneNumber,
    accountName,
    currency: 'KES',
    memo: 'MiniSend USDC to KES conversion'
  };
}

// Helper function to create NGN bank recipient
export function createNgnBankRecipient(
  phoneNumber: string,
  accountName: string
): PaycrestRecipient {
  // For NGN, we'll use a default bank institution code
  // In production, you'd want to let users select their specific bank
  const institutionCode = 'GTBNGLA'; // GTBank as default - should be configurable
  
  return {
    institution: institutionCode,
    accountIdentifier: phoneNumber, // This should be account number in production
    accountName,
    currency: 'NGN',
    memo: 'MiniSend USDC to NGN conversion'
  };
}

// Helper function to calculate total amount including fees
export function calculateTotalAmount(
  baseAmount: string,
  senderFee: string,
  transactionFee: string
): string {
  const total = 
    parseFloat(baseAmount) + 
    parseFloat(senderFee) + 
    parseFloat(transactionFee);
  
  return total.toString();
}