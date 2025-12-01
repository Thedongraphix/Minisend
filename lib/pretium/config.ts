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
  MOBILE_NETWORK: 'Safaricom' as const,
  CURRENCY: 'KES' as const,

  // Fee configuration (1% platform fee)
  FEE_PERCENTAGE: 0.01,

  // Webhook configuration
  WEBHOOK_URL: process.env.NEXT_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_URL}/api/pretium/webhook`
    : 'https://app.minisend.xyz/api/pretium/webhook',
} as const;

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
