/**
 * Blockradar API Client
 * Handles all interactions with the Blockradar API for wallet and address management
 */

import { validateBlockradarConfig, getBlockradarHeaders } from './config';
import type {
  BlockradarApiError,
  BlockradarAddressResponse,
  BlockradarBalanceResponse,
} from './types';

class BlockradarApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://api.blockradar.co/v1';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const requestId = Date.now().toString(36);

    try {
      validateBlockradarConfig();

      const url = `${this.baseUrl}${endpoint}`;
      const headers = getBlockradarHeaders();

      console.log(`[BlockradarClient:${requestId}] Making request:`, {
        method: options.method || 'GET',
        endpoint,
        full_url: url,
        timestamp: new Date().toISOString(),
      });

      if (options.body) {
        console.log(`[BlockradarClient:${requestId}] Request body:`, options.body);
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      console.log(`[BlockradarClient:${requestId}] Response received:`, {
        status: response.status,
        status_text: response.statusText,
        ok: response.ok,
      });

      const data = await response.json();

      console.log(
        `[BlockradarClient:${requestId}] Response data:`,
        JSON.stringify(data, null, 2)
      );

      // Check for API errors
      if (!response.ok || (data.statusCode && data.statusCode !== 200)) {
        const error: BlockradarApiError = {
          statusCode: data.statusCode || response.status,
          message: data.message || 'Blockradar API request failed',
          data: data.data,
        };

        console.error(`[BlockradarClient:${requestId}] API Error:`, {
          error_code: error.statusCode,
          error_message: error.message,
          error_data: error.data,
        });

        throw error;
      }

      console.log(`[BlockradarClient:${requestId}] Request successful`);
      return data as T;
    } catch (error) {
      if ((error as BlockradarApiError).statusCode) {
        throw error;
      }

      console.error(`[BlockradarClient:${requestId}] Request failed:`, error);
      throw {
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        data: null,
      } as BlockradarApiError;
    }
  }

  /**
   * Get Address Information
   * Retrieves information about a specific address within a wallet
   * 
   * @param walletId - The wallet ID
   * @param addressId - The address ID
   * @param showPrivateKey - If true, the response will include the private key
   * @returns Address information
   */
  async getAddress(
    walletId: string,
    addressId: string,
    showPrivateKey: boolean = false
  ): Promise<BlockradarAddressResponse> {
    const queryParams = showPrivateKey ? '?showPrivateKey=true' : '';
    return this.request<BlockradarAddressResponse>(
      `/wallets/${walletId}/addresses/${addressId}${queryParams}`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Get Gateway Balance
   * Retrieves the child address gateway total balance
   * 
   * @param addressId - The address ID
   * @returns Gateway balance information
   */
  async getGatewayBalance(addressId: string): Promise<BlockradarBalanceResponse> {
    return this.request<BlockradarBalanceResponse>(
      `/addresses/${addressId}/gateway/balance`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Create a new address for a wallet
   * 
   * @param walletId - The wallet ID
   * @param metadata - Optional metadata for the address
   * @param name - Optional name for the address
   * @returns Created address information
   */
  async createAddress(
    walletId: string,
    metadata?: Record<string, unknown>,
    name?: string
  ): Promise<BlockradarAddressResponse> {
    return this.request<BlockradarAddressResponse>(
      `/wallets/${walletId}/addresses`,
      {
        method: 'POST',
        body: JSON.stringify({
          metadata,
          name,
          disableAutoSweep: false,
          enableGaslessWithdraw: false,
        }),
      }
    );
  }
}

// Export singleton instance
export const blockradarClient = new BlockradarApiClient();

