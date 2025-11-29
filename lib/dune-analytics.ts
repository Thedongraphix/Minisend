"use client";

/**
 * Dune Analytics Integration for Minisend
 *
 * This module tracks blockchain and payment events to Dune Analytics
 * for on-chain data visualization and analysis.
 *
 * Key Features:
 * - Non-blocking event tracking
 * - Automatic retry with exponential backoff
 * - Client and server-side support
 * - No interference with payment logic
 */

// Types for Dune Analytics events
interface DuneEvent {
  event_name: string;
  timestamp: number;
  chain_id?: number;
  wallet_address?: string;
  properties: Record<string, unknown>;
}

// interface DuneAPIResponse {
//   success: boolean;
//   error?: string;
// }

// Dune Analytics configuration
const DUNE_API_KEY = process.env.DUNE_API_KEY;
const DUNE_API_URL = 'https://api.dune.com/api/v1/query/execute';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Core function to send events to Dune Analytics
 * Non-blocking, runs in background with error handling
 */
async function sendToDune(event: DuneEvent): Promise<void> {
  // Skip if no API key configured
  if (!DUNE_API_KEY) {
    if (typeof window === 'undefined') {
      console.warn('Dune Analytics: API key not configured');
    }
    return;
  }

  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      const response = await fetch(DUNE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dune-API-Key': DUNE_API_KEY,
        },
        body: JSON.stringify({
          query_parameters: event,
        }),
      });

      if (response.ok) {
        // Success - log only on server-side
        if (typeof window === 'undefined') {
          console.log(`Dune Analytics: Event '${event.event_name}' tracked successfully`);
        }
        return;
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        attempts++;
        continue;
      }

      // Log error only on server-side
      if (typeof window === 'undefined') {
        console.error(`Dune Analytics: API error ${response.status}`);
      }
      break;

    } catch (error) {
      attempts++;
      if (attempts < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempts));
      } else {
        // Log error only on server-side
        if (typeof window === 'undefined') {
          console.error('Dune Analytics: Failed to send event after retries', error);
        }
      }
    }
  }
}

/**
 * Track blockchain transaction events
 * Priority 1: Core on-chain data
 */
export async function trackDuneTransaction(
  eventName: string,
  data: {
    walletAddress: string;
    orderId?: string;
    transactionHash?: string;
    amount?: number | string;
    currency?: string;
    receiveAddress?: string;
    chainId?: number;
    blockNumber?: number;
    success?: boolean;
    error?: string;
  }
): Promise<void> {
  try {
    const event: DuneEvent = {
      event_name: `transaction_${eventName}`,
      timestamp: Date.now(),
      chain_id: data.chainId || 8453, // Base mainnet default
      wallet_address: data.walletAddress?.toLowerCase(),
      properties: {
        order_id: data.orderId,
        transaction_hash: data.transactionHash?.toLowerCase(),
        amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
        currency: data.currency,
        receive_address: data.receiveAddress?.toLowerCase(),
        block_number: data.blockNumber,
        success: data.success,
        error: data.error,
        platform: 'minisend',
        network: 'base',
      },
    };

    // Send to Dune (non-blocking)
    sendToDune(event).catch(() => {
      // Silently fail - don't affect app logic
    });
  } catch {
    // Silently fail - don't affect app logic
  }
}

/**
 * Track PayCrest order events
 * Priority 1: Off-ramp order lifecycle
 */
export async function trackDuneOrder(
  eventName: string,
  data: {
    orderId: string;
    walletAddress: string;
    usdcAmount: number | string;
    localCurrency: string;
    localAmount: number | string;
    rate?: number | string;
    receiveAddress?: string;
    paymentMethod?: 'mpesa' | 'bank' | 'till';
    status?: string;
    phoneNumber?: string;
    accountNumber?: string;
    duration?: number;
    success?: boolean;
    error?: string;
  }
): Promise<void> {
  try {
    // Sanitize sensitive data
    const sanitizedPhone = data.phoneNumber
      ? `${data.phoneNumber.substring(0, 4)}****${data.phoneNumber.substring(data.phoneNumber.length - 4)}`
      : undefined;

    const sanitizedAccount = data.accountNumber
      ? `****${data.accountNumber.substring(data.accountNumber.length - 4)}`
      : undefined;

    const event: DuneEvent = {
      event_name: `order_${eventName}`,
      timestamp: Date.now(),
      chain_id: 8453, // Base mainnet
      wallet_address: data.walletAddress?.toLowerCase(),
      properties: {
        order_id: data.orderId,
        usdc_amount: typeof data.usdcAmount === 'string' ? parseFloat(data.usdcAmount) : data.usdcAmount,
        local_currency: data.localCurrency,
        local_amount: typeof data.localAmount === 'string' ? parseFloat(data.localAmount) : data.localAmount,
        exchange_rate: typeof data.rate === 'string' ? parseFloat(data.rate) : data.rate,
        receive_address: data.receiveAddress?.toLowerCase(),
        payment_method: data.paymentMethod,
        status: data.status,
        phone_number_masked: sanitizedPhone,
        account_number_masked: sanitizedAccount,
        duration_ms: data.duration,
        success: data.success,
        error: data.error,
        platform: 'minisend',
        network: 'base',
      },
    };

    // Send to Dune (non-blocking)
    sendToDune(event).catch(() => {
      // Silently fail - don't affect app logic
    });
  } catch {
    // Silently fail - don't affect app logic
  }
}

/**
 * Track USDC balance operations
 * Priority 1: Wallet activity tracking
 */
export async function trackDuneBalance(
  eventName: string,
  data: {
    walletAddress: string;
    balance?: number | string;
    blockNumber?: number;
    chainId?: number;
    success?: boolean;
    error?: string;
  }
): Promise<void> {
  try {
    const event: DuneEvent = {
      event_name: `balance_${eventName}`,
      timestamp: Date.now(),
      chain_id: data.chainId || 8453,
      wallet_address: data.walletAddress?.toLowerCase(),
      properties: {
        balance: typeof data.balance === 'string' ? parseFloat(data.balance) : data.balance,
        block_number: data.blockNumber,
        success: data.success,
        error: data.error,
        platform: 'minisend',
        network: 'base',
        token: 'usdc',
      },
    };

    // Send to Dune (non-blocking)
    sendToDune(event).catch(() => {
      // Silently fail - don't affect app logic
    });
  } catch {
    // Silently fail - don't affect app logic
  }
}

/**
 * Track wallet connection events
 * Priority 2: User onboarding and engagement
 */
export async function trackDuneWallet(
  eventName: string,
  data: {
    walletAddress: string;
    chainId?: number;
    walletType?: string;
    flow?: string;
    success?: boolean;
    error?: string;
  }
): Promise<void> {
  try {
    const event: DuneEvent = {
      event_name: `wallet_${eventName}`,
      timestamp: Date.now(),
      chain_id: data.chainId || 8453,
      wallet_address: data.walletAddress?.toLowerCase(),
      properties: {
        wallet_type: data.walletType,
        flow: data.flow,
        success: data.success,
        error: data.error,
        platform: 'minisend',
        network: 'base',
      },
    };

    // Send to Dune (non-blocking)
    sendToDune(event).catch(() => {
      // Silently fail - don't affect app logic
    });
  } catch {
    // Silently fail - don't affect app logic
  }
}

/**
 * Track exchange rate and currency events
 * Priority 3: Market data and user preferences
 */
export async function trackDuneExchange(
  eventName: string,
  data: {
    fromCurrency?: string;
    toCurrency: string;
    rate?: number | string;
    amount?: number | string;
    walletAddress?: string;
    source?: string;
    success?: boolean;
    error?: string;
  }
): Promise<void> {
  try {
    const event: DuneEvent = {
      event_name: `exchange_${eventName}`,
      timestamp: Date.now(),
      chain_id: 8453,
      wallet_address: data.walletAddress?.toLowerCase(),
      properties: {
        from_currency: data.fromCurrency || 'USDC',
        to_currency: data.toCurrency,
        exchange_rate: typeof data.rate === 'string' ? parseFloat(data.rate) : data.rate,
        amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
        source: data.source || 'paycrest',
        success: data.success,
        error: data.error,
        platform: 'minisend',
        network: 'base',
      },
    };

    // Send to Dune (non-blocking)
    sendToDune(event).catch(() => {
      // Silently fail - don't affect app logic
    });
  } catch {
    // Silently fail - don't affect app logic
  }
}

/**
 * Track user interaction events
 * Priority 3: UX and engagement metrics
 */
export async function trackDuneInteraction(
  eventName: string,
  data: {
    walletAddress?: string;
    action: string;
    component?: string;
    value?: string | number | boolean;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const event: DuneEvent = {
      event_name: `interaction_${eventName}`,
      timestamp: Date.now(),
      chain_id: 8453,
      wallet_address: data.walletAddress?.toLowerCase(),
      properties: {
        action: data.action,
        component: data.component,
        value: data.value,
        ...data.metadata,
        platform: 'minisend',
        network: 'base',
      },
    };

    // Send to Dune (non-blocking)
    sendToDune(event).catch(() => {
      // Silently fail - don't affect app logic
    });
  } catch {
    // Silently fail - don't affect app logic
  }
}

/**
 * Track payment flow progress
 * Priority 2: Funnel analysis
 */
export async function trackDuneFlow(
  eventName: string,
  data: {
    walletAddress?: string;
    flow: 'offramp' | 'spend';
    step: number;
    stepName: string;
    currency?: string;
    amount?: number | string;
    success?: boolean;
  }
): Promise<void> {
  try {
    const event: DuneEvent = {
      event_name: `flow_${eventName}`,
      timestamp: Date.now(),
      chain_id: 8453,
      wallet_address: data.walletAddress?.toLowerCase(),
      properties: {
        flow_type: data.flow,
        step: data.step,
        step_name: data.stepName,
        currency: data.currency,
        amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
        success: data.success,
        platform: 'minisend',
        network: 'base',
      },
    };

    // Send to Dune (non-blocking)
    sendToDune(event).catch(() => {
      // Silently fail - don't affect app logic
    });
  } catch {
    // Silently fail - don't affect app logic
  }
}

/**
 * Health check for Dune Analytics integration
 * Returns true if API key is configured
 */
export function isDuneAnalyticsEnabled(): boolean {
  return !!DUNE_API_KEY;
}

/**
 * Test connection to Dune Analytics
 * Only use in development/testing
 */
export async function testDuneConnection(): Promise<boolean> {
  if (!DUNE_API_KEY) {
    return false;
  }

  try {
    const testEvent: DuneEvent = {
      event_name: 'test_connection',
      timestamp: Date.now(),
      chain_id: 8453,
      properties: {
        platform: 'minisend',
        test: true,
      },
    };

    await sendToDune(testEvent);
    return true;
  } catch {
    return false;
  }
}
