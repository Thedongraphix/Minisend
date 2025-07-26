import { PaycrestConfig } from './index';

export function getPaycrestConfig(): PaycrestConfig {
  const apiKey = process.env.PAYCREST_API_KEY;
  const clientSecret = process.env.PAYCREST_API_SECRET;
  const baseUrl = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';

  if (!apiKey) {
    throw new Error('PAYCREST_API_KEY environment variable is required');
  }

  if (!clientSecret) {
    throw new Error('PAYCREST_API_SECRET environment variable is required');
  }

  // Use explicit webhook secret or fallback to client secret
  const webhookSecret = process.env.PAYCREST_WEBHOOK_SECRET || clientSecret;

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