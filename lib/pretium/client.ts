// Pretium API Client Service
import { PRETIUM_CONFIG, getPretiumHeaders, validatePretiumConfig } from './config';
import type {
  PretiumDisburseRequest,
  PretiumDisburseResponse,
  PretiumStatusRequest,
  PretiumStatusResponse,
  PretiumExchangeRateRequest,
  PretiumExchangeRateResponse,
  PretiumCountriesResponse,
  PretiumApiError,
} from './types';

class PretiumApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = PRETIUM_CONFIG.BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const requestId = Date.now().toString(36);

    try {
      validatePretiumConfig();

      const url = `${this.baseUrl}${endpoint}`;
      const headers = getPretiumHeaders();

      console.log(`[PretiumClient:${requestId}] Making request:`, {
        method: options.method || 'GET',
        endpoint,
        full_url: url,
        timestamp: new Date().toISOString()
      });

      if (options.body) {
        console.log(`[PretiumClient:${requestId}] Request body:`, options.body);
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      console.log(`[PretiumClient:${requestId}] Response received:`, {
        status: response.status,
        status_text: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      const data = await response.json();

      console.log(`[PretiumClient:${requestId}] Response data:`, JSON.stringify(data, null, 2));

      // Check for API errors
      if (!response.ok || (data.code && data.code !== 200)) {
        const error: PretiumApiError = {
          code: data.code || response.status,
          message: data.message || 'Pretium API request failed',
          data: data.data,
        };

        console.error(`[PretiumClient:${requestId}] API Error:`, {
          error_code: error.code,
          error_message: error.message,
          error_data: error.data
        });

        throw error;
      }

      console.log(`[PretiumClient:${requestId}] Request successful`);
      return data as T;
    } catch (error) {
      if ((error as PretiumApiError).code) {
        console.error(`[PretiumClient:${requestId}] Known API error, rethrowing`);
        throw error;
      }

      console.error(`[PretiumClient:${requestId}] Unknown error:`, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw {
        code: 500,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      } as PretiumApiError;
    }
  }

  /**
   * Get exchange rates for a currency
   */
  async getExchangeRate(
    currencyCode: string
  ): Promise<PretiumExchangeRateResponse> {
    const body: PretiumExchangeRateRequest = {
      currency_code: currencyCode,
    };

    return this.request<PretiumExchangeRateResponse>('/v1/exchange-rate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Get supported countries
   */
  async getCountries(): Promise<PretiumCountriesResponse> {
    return this.request<PretiumCountriesResponse>('/account/countries', {
      method: 'POST',
    });
  }

  /**
   * Initiate a disbursement (offramp) to mobile money or bank
   */
  async disburse(
    request: PretiumDisburseRequest,
    currency: 'KES' | 'GHS' | 'NGN'
  ): Promise<PretiumDisburseResponse> {
    return this.request<PretiumDisburseResponse>(
      `/v1/pay/${currency}`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Check transaction status
   */
  async getTransactionStatus(
    transactionCode: string,
    currency: 'KES' | 'GHS' | 'NGN'
  ): Promise<PretiumStatusResponse> {
    const body: PretiumStatusRequest = {
      transaction_code: transactionCode,
    };

    return this.request<PretiumStatusResponse>(
      `/v1/status/${currency}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  }
}

// Export singleton instance
export const pretiumClient = new PretiumApiClient();

// Export class for testing
export { PretiumApiClient };
