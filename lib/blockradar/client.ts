/**
 * Blockradar API Client
 * Handles all interactions with the Blockradar API for wallet and address management
 */

import { validateBlockradarConfig, getBlockradarHeaders, BLOCKRADAR_CONFIG } from './config';
import type {
  BlockradarApiError,
  BlockradarAddressResponse,
  BlockradarBalancesResponse,
  BlockradarWithdrawRequest,
  BlockradarWithdrawResponse,
  BlockradarAssetsResponse,
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
   * Get Address Balances
   * Retrieves the balances associated with a specific address in a wallet
   *
   * @param addressId - The address ID
   * @param walletId - Optional wallet ID (uses config default if not provided)
   * @returns Array of balance information for all assets
   */
  async getAddressBalances(
    addressId: string,
    walletId?: string
  ): Promise<BlockradarBalancesResponse> {
    const effectiveWalletId = walletId || BLOCKRADAR_CONFIG.WALLET_ID;

    if (!effectiveWalletId) {
      throw {
        statusCode: 400,
        message: 'Wallet ID is required',
        data: null,
      } as BlockradarApiError;
    }

    return this.request<BlockradarBalancesResponse>(
      `/wallets/${effectiveWalletId}/addresses/${addressId}/balances`,
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

  /**
   * Withdraw from a child address
   * Sends stablecoin assets from a child address to an external address
   *
   * @param addressId - The address ID to withdraw from
   * @param params - Withdrawal parameters
   * @param walletId - Optional wallet ID (uses config default if not provided)
   * @returns Withdrawal transaction information
   */
  async withdrawFromAddress(
    addressId: string,
    params: BlockradarWithdrawRequest,
    walletId?: string
  ): Promise<BlockradarWithdrawResponse> {
    const effectiveWalletId = walletId || BLOCKRADAR_CONFIG.WALLET_ID;

    if (!effectiveWalletId) {
      throw {
        statusCode: 400,
        message: 'Wallet ID is required',
        data: null,
      } as BlockradarApiError;
    }

    return this.request<BlockradarWithdrawResponse>(
      `/wallets/${effectiveWalletId}/addresses/${addressId}/withdraw`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  /**
   * Get supported assets
   * Retrieves a list of assets supported by Blockradar
   *
   * @param options - Filter options
   * @returns List of supported assets
   */
  async getAssets(options?: {
    network?: 'mainnet' | 'testnet';
    symbol?: string;
    blockchainId?: string;
  }): Promise<BlockradarAssetsResponse> {
    const queryParams = new URLSearchParams();

    if (options?.network) {
      queryParams.append('network', options.network);
    }
    if (options?.symbol) {
      queryParams.append('symbol', options.symbol);
    }
    if (options?.blockchainId) {
      queryParams.append('blockchainId', options.blockchainId);
    }

    const queryString = queryParams.toString();
    const endpoint = `/assets${queryString ? `?${queryString}` : ''}`;

    return this.request<BlockradarAssetsResponse>(endpoint, {
      method: 'GET',
    });
  }
}

// Export singleton instance
export const blockradarClient = new BlockradarApiClient();

