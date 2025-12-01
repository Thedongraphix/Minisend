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
    try {
      validatePretiumConfig();

      const url = `${this.baseUrl}${endpoint}`;
      const headers = getPretiumHeaders();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      // Check for API errors
      if (!response.ok || (data.code && data.code !== 200)) {
        const error: PretiumApiError = {
          code: data.code || response.status,
          message: data.message || 'Pretium API request failed',
          data: data.data,
        };
        throw error;
      }

      return data as T;
    } catch (error) {
      if ((error as PretiumApiError).code) {
        throw error;
      }
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
   * Initiate a disbursement (offramp) to M-Pesa
   */
  async disburse(
    request: PretiumDisburseRequest
  ): Promise<PretiumDisburseResponse> {
    return this.request<PretiumDisburseResponse>(
      `/v1/pay/${PRETIUM_CONFIG.CURRENCY}`,
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
    transactionCode: string
  ): Promise<PretiumStatusResponse> {
    const body: PretiumStatusRequest = {
      transaction_code: transactionCode,
    };

    return this.request<PretiumStatusResponse>(
      `/v1/status/${PRETIUM_CONFIG.CURRENCY}`,
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
