import { PaycrestConfig } from './index';

export function getPaycrestConfig(): PaycrestConfig {
  const apiKey = process.env.PAYCREST_CLIENT_ID || process.env.PAYCREST_API_KEY;
  const clientSecret = process.env.PAYCREST_CLIENT_SECRET;
  const webhookSecret = process.env.PAYCREST_WEBHOOK_SECRET || clientSecret;
  const baseUrl = process.env.NEXT_PUBLIC_PAYCREST_API_URL || 'https://api.paycrest.io';

  if (!apiKey) {
    throw new Error('PAYCREST_CLIENT_ID or PAYCREST_API_KEY environment variable is required');
  }

  if (!clientSecret) {
    throw new Error('PAYCREST_CLIENT_SECRET environment variable is required');
  }

  return {
    apiKey,
    clientSecret,
    webhookSecret,
    baseUrl,
  };
}

// Create singleton PayCrest service instance
let paycrestService: import('./index').PaycrestService | null = null;

export async function getPaycrestService() {
  if (!paycrestService) {
    const { PaycrestService } = await import('./index');
    const config = getPaycrestConfig();
    paycrestService = new PaycrestService(config);
  }
  
  return paycrestService;
}