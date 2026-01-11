/**
 * Input validation utilities for security
 * Prevents injection attacks and ensures data integrity
 */

/**
 * Validates Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 1000); // Limit length
}

/**
 * Validates Farcaster FID
 */
export function isValidFid(fid: string | number): boolean {
  const fidNum = typeof fid === 'string' ? parseInt(fid, 10) : fid;
  return !isNaN(fidNum) && fidNum > 0 && fidNum < Number.MAX_SAFE_INTEGER;
}

/**
 * Validates platform type
 */
export function isValidPlatform(platform: string): platform is 'farcaster' | 'baseapp' | 'web' {
  return ['farcaster', 'baseapp', 'web'].includes(platform);
}

/**
 * Validates authentication data
 */
export function validateAuthData(data: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.userId || typeof data.userId !== 'string') {
    errors.push('Invalid userId');
  }

  if (!data.platform || typeof data.platform !== 'string' || !isValidPlatform(data.platform)) {
    errors.push('Invalid platform');
  }

  if (data.walletAddress && typeof data.walletAddress === 'string' && !isValidAddress(data.walletAddress)) {
    errors.push('Invalid wallet address');
  }

  if (data.email && typeof data.email === 'string' && !isValidEmail(data.email)) {
    errors.push('Invalid email address');
  }

  if (data.platform === 'farcaster' && typeof data.userId === 'string' && !isValidFid(data.userId)) {
    errors.push('Invalid Farcaster FID');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Rate limiting check (client-side)
 */
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];

  // Filter out old timestamps
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

  if (validTimestamps.length >= maxRequests) {
    return false; // Rate limit exceeded
  }

  // Add current timestamp
  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);

  return true;
}

/**
 * Cleans up old rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const validTimestamps = timestamps.filter(ts => now - ts < 60000);
    if (validTimestamps.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, validTimestamps);
    }
  }
}, 60000);
