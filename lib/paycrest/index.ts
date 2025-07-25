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
    // Use /sender/orders endpoint as per PayCrest documentation
    return this.makeRequest<PaycrestOrder>('/sender/orders', 'POST', orderData);
  }

  async getOrderStatus(orderId: string): Promise<PaycrestOrder> {
    // Use /sender/orders endpoint for status checking
    return this.makeRequest<PaycrestOrder>(`/sender/orders/${orderId}`);
  }

  async getRates(token: string = 'USDC', amount: string = '1', currency: string = 'KES', network: string = 'base'): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/rates/${token}/${amount}/${currency}?network=${network}`, {
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

  // Sender endpoints
  async getSenderStats(): Promise<unknown> {
    return this.makeRequest('/sender/stats');
  }

  async listSenderOrders(page: number = 1, pageSize: number = 20): Promise<unknown> {
    return this.makeRequest(`/sender/orders?page=${page}&pageSize=${pageSize}`);
  }

  // Provider endpoints
  async getProviderOrders(): Promise<unknown> {
    return this.makeRequest('/provider/orders');
  }

  async getProviderRates(token: string, fiat: string): Promise<unknown> {
    return this.makeRequest(`/provider/rates/${token}/${fiat}`);
  }

  async getProviderStats(): Promise<unknown> {
    return this.makeRequest('/provider/stats');
  }

  async getNodeInfo(): Promise<unknown> {
    return this.makeRequest('/provider/node-info');
  }

  // General endpoints
  async getCurrencies(): Promise<unknown> {
    return this.makeRequest('/currencies');
  }

  async getInstitutions(currencyCode: string): Promise<unknown> {
    return this.makeRequest(`/institutions/${currencyCode}`);
  }

  async getTokens(): Promise<unknown> {
    return this.makeRequest('/tokens');
  }

  async getAggregatorPublicKey(): Promise<unknown> {
    return this.makeRequest('/pubkey');
  }

  async verifyBankAccount(accountData: unknown): Promise<unknown> {
    return this.makeRequest('/verify-account', 'POST', accountData);
  }

  async getLockPaymentOrderStatus(chainId: string, id: string): Promise<unknown> {
    return this.makeRequest(`/orders/${chainId}/${id}`);
  }

  async reindexTransaction(network: string, txHash: string): Promise<unknown> {
    return this.makeRequest(`/reindex/${network}/${txHash}`);
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