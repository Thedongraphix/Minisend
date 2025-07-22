import { PaycrestConfig } from './index';

export function getPaycrestConfig(): PaycrestConfig {
  const apiKey = process.env.PAYCREST_API_KEY;
  const webhookSecret = process.env.PAYCREST_WEBHOOK_SECRET;
  const baseUrl = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io';

  if (!apiKey) {
    throw new Error('PAYCREST_API_KEY environment variable is required');
  }

  if (!webhookSecret) {
    throw new Error('PAYCREST_WEBHOOK_SECRET environment variable is required');
  }

  return {
    apiKey,
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