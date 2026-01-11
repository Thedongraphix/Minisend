/**
 * Blockradar Configuration and Validation
 */

export const BLOCKRADAR_CONFIG = {
  BASE_URL: 'https://api.blockradar.co/v1',
  API_KEY: process.env.BLOCKRADAR_API_KEY,
  WALLET_ID: process.env.BLOCKRADAR_WALLET_ID,
} as const;

/**
 * Validates that all required Blockradar configuration is present
 * @throws Error if configuration is missing
 */
export function validateBlockradarConfig(): void {
  if (!BLOCKRADAR_CONFIG.API_KEY) {
    throw new Error('BLOCKRADAR_API_KEY environment variable is not set');
  }

  if (!BLOCKRADAR_CONFIG.WALLET_ID) {
    throw new Error('BLOCKRADAR_WALLET_ID environment variable is not set');
  }
}

/**
 * Returns headers required for Blockradar API requests
 */
export function getBlockradarHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-api-key': BLOCKRADAR_CONFIG.API_KEY!,
  };
}

