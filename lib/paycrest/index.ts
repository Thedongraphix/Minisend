// PayCrest Sender API Integration
// Production-ready PayCrest API service following official documentation

export interface PaycrestConfig {
  apiKey: string;
  clientSecret: string;
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
  // Settlement acceleration options
  priority?: 'high' | 'normal' | 'low';
  settlementSpeed?: 'express' | 'standard';
  webhookUrl?: string;
}

export interface PaycrestOrder {
  id: string;
  receiveAddress: string;
  validUntil: string;
  senderFee: string;
  transactionFee: string;
  amount: string;
  status: 'payment_order.pending' | 'payment_order.validated' | 'payment_order.settled' | 'payment_order.refunded' | 'payment_order.expired';
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
    
    console.log(`PayCrest API Request: ${method} ${url}`);
    if (body) {
      console.log('Request body:', JSON.stringify(body, null, 2));
    }
    
    const headers: Record<string, string> = {
      'API-Key': this.config.apiKey,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    console.log(`PayCrest API Response (${response.status}):`, responseText);

    if (!response.ok) {
      let errorMessage = `PayCrest API error: ${response.statusText}`;
      
      try {
        const errorBody = JSON.parse(responseText);
        errorMessage = errorBody.message || errorBody.error || errorMessage;
        
        // Log detailed error for debugging
        console.error('PayCrest API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          url,
          headers
        });
      } catch {
        console.error('PayCrest API Raw Error:', responseText);
      }

      throw new PaycrestError(errorMessage, response.status);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse PayCrest response:', parseError);
      throw new PaycrestError('Invalid JSON response from PayCrest API');
    }
    
    // PayCrest API returns data in a nested structure: { status, message, data }
    // Extract the data field if it exists, otherwise return the full result
    return result.data || result;
  }

  async createOrder(orderData: PaycrestOrderRequest): Promise<PaycrestOrder> {
    // Use /v1/sender/orders endpoint as per PayCrest documentation
    return this.makeRequest<PaycrestOrder>('/v1/sender/orders', 'POST', orderData);
  }

  async getOrderStatus(orderId: string): Promise<PaycrestOrder> {
    // Use /v1/sender/orders endpoint for status checking
    return this.makeRequest<PaycrestOrder>(`/v1/sender/orders/${orderId}`);
  }

  async getRates(token: string = 'USDC', amount: string = '1', currency: string = 'KES', network: string = 'base'): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/v1/rates/${token}/${amount}/${currency}?network=${network}`, {
      headers: {
        'API-Key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new PaycrestError(`Failed to get rates: ${response.statusText}`, response.status);
    }

    const data = await response.json();
    if (data.status === 'success' && data.data) {
      return data.data;
    }
    
    throw new PaycrestError('Invalid rates response format');
  }

  // Sender endpoints - Only what we need for offramp
  async getSenderStats(): Promise<unknown> {
    return this.makeRequest('/v1/sender/stats');
  }

  async listSenderOrders(page: number = 1, pageSize: number = 20): Promise<unknown> {
    return this.makeRequest(`/v1/sender/orders?page=${page}&pageSize=${pageSize}`);
  }

  verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    // Use CLIENT_SECRET as per PayCrest documentation
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    const secretKey = this.config.webhookSecret || this.config.clientSecret;
    const key = Buffer.from(secretKey);
    const hash = crypto.createHmac('sha256', key);
    hash.update(payload);
    const calculatedSignature = hash.digest('hex');
    
    console.log('Webhook signature verification:', {
      signature,
      calculatedSignature,
      secretUsed: secretKey ? 'present' : 'missing'
    });
    
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
  // Updated institution codes based on Paycrest docs
  const institutionCode = provider === 'MPESA' ? 'SAFARICOM' : 'AIRTEL';
  
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