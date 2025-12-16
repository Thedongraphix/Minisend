// Pretium API Configuration

export const PRETIUM_CONFIG = {
  BASE_URL: process.env.PRETIUM_BASE_URL || 'https://api.xwift.africa',
  CONSUMER_KEY: process.env.PRETIUM_CONSUMER_KEY,
  SECRET_KEY: process.env.PRETIUM_SECRET_KEY,
  CHECKOUT_KEY: process.env.PRETIUM_CHECKOUT_KEY,

  // Fixed settlement address for receiving USDC payments
  SETTLEMENT_ADDRESS: '0x8005ee53e57ab11e11eaa4efe07ee3835dc02f98',

  // Supported configuration
  CHAIN: 'BASE' as const,

  // Fee configuration (1% platform fee)
  FEE_PERCENTAGE: 0.01,

  // Webhook configuration
  WEBHOOK_URL: process.env.NEXT_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_URL}/api/pretium/webhook`
    : 'https://app.minisend.xyz/api/pretium/webhook',

  // Supported currencies
  SUPPORTED_CURRENCIES: ['KES', 'GHS', 'NGN'] as const,
} as const;

// Currency-specific configuration
export const CURRENCY_CONFIG = {
  KES: {
    DEFAULT_NETWORK: 'Safaricom',
    SUPPORTED_NETWORKS: ['Safaricom', 'Airtel', 'Telkom'] as const,
    PAYMENT_TYPES: ['MOBILE', 'BUY_GOODS', 'PAYBILL'] as const,
  },
  GHS: {
    DEFAULT_NETWORK: 'MTN',
    SUPPORTED_NETWORKS: ['MTN', 'Vodafone', 'AirtelTigo'] as const,
    PAYMENT_TYPES: ['MOBILE', 'BANK'] as const,
  },
  NGN: {
    DEFAULT_NETWORK: 'BANK',
    SUPPORTED_NETWORKS: ['BANK'] as const,
    PAYMENT_TYPES: ['BANK'] as const,
  },
} as const;

// Type exports for supported currencies
export type SupportedCurrency = 'KES' | 'GHS' | 'NGN';
export type KESNetwork = (typeof CURRENCY_CONFIG.KES.SUPPORTED_NETWORKS)[number];
export type GHSNetwork = (typeof CURRENCY_CONFIG.GHS.SUPPORTED_NETWORKS)[number];
export type NGNNetwork = (typeof CURRENCY_CONFIG.NGN.SUPPORTED_NETWORKS)[number];
export type PaymentNetwork = KESNetwork | GHSNetwork | NGNNetwork;

export function validatePretiumConfig(): void {
  const requiredVars = [
    'PRETIUM_CONSUMER_KEY',
    'PRETIUM_SECRET_KEY',
    'PRETIUM_CHECKOUT_KEY',
  ];

  const missing = requiredVars.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required Pretium environment variables: ${missing.join(', ')}`
    );
  }
}

export function getPretiumHeaders(): Record<string, string> {
  if (!PRETIUM_CONFIG.CONSUMER_KEY) {
    throw new Error('PRETIUM_CONSUMER_KEY is not configured');
  }

  return {
    'Content-Type': 'application/json',
    'x-api-key': PRETIUM_CONFIG.CONSUMER_KEY,
  };
}

/**
 * Check if a currency is supported by Pretium
 */
export function isCurrencySupported(currency: string): currency is SupportedCurrency {
  return PRETIUM_CONFIG.SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}

/**
 * Get Pretium banks endpoint URL
 */
export function getBanksEndpoint(): string {
  return `${PRETIUM_CONFIG.BASE_URL}/v1/banks`;
}

/**
 * Get currency-specific configuration
 */
export function getCurrencyConfig(currency: SupportedCurrency) {
  return CURRENCY_CONFIG[currency];
}

/**
 * Get default network for a currency
 */
export function getDefaultNetwork(currency: SupportedCurrency): string {
  return CURRENCY_CONFIG[currency].DEFAULT_NETWORK;
}

/**
 * Check if a payment type is supported for a currency
 */
export function isPaymentTypeSupported(
  currency: SupportedCurrency,
  paymentType: string
): boolean {
  return CURRENCY_CONFIG[currency].PAYMENT_TYPES.includes(paymentType as never);
}
