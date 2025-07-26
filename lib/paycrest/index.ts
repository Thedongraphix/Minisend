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
  status: 'initiated' | 'pending' | 'settled' | 'validated' | 'expired' | 'refunded' | 'failed' | 'cancelled';
  token: string;
  network: string;
  recipient: PaycrestRecipient;
  reference: string;
  // RESEARCH-BASED: Settlement verification fields
  txHash?: string;
  amountPaid?: string | number;  // API returns number according to docs
  amountReturned?: string | number;  // Important for failed payments
  settledAt?: string;
  // CRITICAL: Transaction logs contain actual settlement status
  transactionLogs?: Array<{
    id: string;
    gateway_id: string;
    status: string;  // This might be the real settlement status!
    tx_hash: string;
    created_at: string;
  }>;
  // Legacy support for transactions field
  transactions?: Array<{
    id: string;
    status: string;
    type: string;
    amount: string;
    timestamp: string;
  }>;
  // Additional fields from API docs
  rate?: number;
  gatewayId?: string;
  fromAddress?: string;
  returnAddress?: string;
  feeAddress?: string;
  createdAt?: string;
  updatedAt?: string;
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
    console.log('Creating PayCrest order with data:', JSON.stringify(orderData, null, 2));
    
    // Call PayCrest orders API directly as per their documentation
    const url = `${this.config.baseUrl}/sender/orders`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'API-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    const responseText = await response.text();
    console.log(`PayCrest orders response (${response.status}):`, responseText);

    if (!response.ok) {
      let errorMessage = `PayCrest orders API error: ${response.statusText}`;
      
      try {
        const errorBody = JSON.parse(responseText);
        errorMessage = errorBody.message || errorMessage;
        console.error('PayCrest orders API error details:', errorBody);
      } catch {
        console.error('PayCrest orders API raw error:', responseText);
      }

      throw new PaycrestError(errorMessage, response.status);
    }

    const result = JSON.parse(responseText);
    console.log('PayCrest orders result:', result);

    if (result.status === 'success' && result.data) {
      return result.data;
    }

    throw new PaycrestError('Invalid orders response format');
  }

  async getOrderStatus(orderId: string): Promise<PaycrestOrder> {
    // Use /v1/sender/orders endpoint for status checking
    return this.makeRequest<PaycrestOrder>(`/v1/sender/orders/${orderId}`);
  }

  async getRates(token: string = 'USDC', amount: string = '1', currency: string = 'KES', network: string = 'base'): Promise<string> {
    console.log(`Fetching PayCrest rates: ${token}/${amount}/${currency} on ${network}`);
    
    // Call PayCrest rates API directly as per their documentation
    const url = `${this.config.baseUrl}/rates/${token}/${amount}/${currency}?network=${network}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'API-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log(`PayCrest rates response (${response.status}):`, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayCrest rates API error:', errorText);
      throw new PaycrestError(`Failed to get rates: ${response.statusText}`, response.status);
    }

    const result = await response.json();
    console.log('PayCrest rates data:', result);

    if (result.status === 'success' && result.data) {
      return result.data;
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
    const secretKey = this.config.clientSecret; // Use CLIENT_SECRET as shown in PayCrest dashboard example
    
    // PayCrest webhook signature verification (matches dashboard example)
    const key = Buffer.from(secretKey);
    const hash = crypto.createHmac('sha256', key);
    hash.update(payload);
    const calculatedSignature = hash.digest('hex');
    
    console.log('PayCrest webhook signature verification:', {
      receivedSignature: signature,
      calculatedSignature: calculatedSignature,
      secretKeyPresent: secretKey ? 'yes' : 'no',
      payloadLength: payload.length,
      match: signature === calculatedSignature
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
  // Updated institution codes based on PayCrest API /v1/institutions/KES
  const institutionCode = provider === 'MPESA' ? 'SAFAKEPC' : 'AIRTKEPC';
  
  return {
    institution: institutionCode,
    accountIdentifier: phoneNumber,
    accountName,
    currency: 'KES',
    memo: 'MiniSend payment transfer'
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
    memo: 'MiniSend payment transfer'
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