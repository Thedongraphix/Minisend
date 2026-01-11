/**
 * Production-Grade API Client with Retry Logic and Error Handling
 * Follows best practices for large-scale dApps
 */

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Exponential backoff delay calculation
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );

  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // HTTP status codes that are retryable
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (error instanceof APIError && error.statusCode && retryableStatusCodes.includes(error.statusCode)) {
    return true;
  }

  return false;
}

/**
 * Fetch with automatic retry and exponential backoff
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new APIError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code,
          errorData
        );
      }

      // Success - return parsed response
      return await response.json();

    } catch (error) {
      lastError = error as Error;

      // Don't retry if this is the last attempt or error is not retryable
      if (attempt === config.maxRetries || !isRetryableError(error)) {
        break;
      }

      // Wait before retrying
      const delay = calculateDelay(attempt, config);
      console.warn(`Request failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms...`, error);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw lastError!;
}

/**
 * Typed API client for internal endpoints
 */
export const apiClient = {
  /**
   * Assign Minisend wallet to user
   */
  async assignWallet(data: {
    userId: string;
    platform: 'farcaster' | 'baseapp' | 'web';
    walletAddress?: string;
    token?: string;
    email?: string;
  }) {
    return fetchWithRetry<{
      minisendWallet: string;
      blockradarAddressId?: string;
      displayName?: string;
      avatarUrl?: string;
      existing: boolean;
    }>('/api/auth/assign-wallet', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Verify Base Account signature
   */
  async verifyBaseSignature(data: {
    address: string;
    message: string;
    signature: string;
  }) {
    return fetchWithRetry<{
      success: boolean;
      address: string;
      authenticated: boolean;
    }>('/api/auth/verify-base', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Rate limiter for client-side API calls
 */
class RateLimiter {
  private queue: Array<(value: unknown) => void> = [];
  private activeRequests = 0;

  constructor(
    private maxConcurrent: number = 5,
    private minDelay: number = 100
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Wait for available slot
    while (this.activeRequests >= this.maxConcurrent) {
      await new Promise(resolve => {
        this.queue.push(resolve);
      });
    }

    this.activeRequests++;

    try {
      const result = await fn();

      // Enforce minimum delay between requests
      await new Promise(resolve => setTimeout(resolve, this.minDelay));

      return result;
    } finally {
      this.activeRequests--;

      // Release next queued request
      const next = this.queue.shift();
      if (next) {
        next(undefined);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();
