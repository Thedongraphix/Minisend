/**
 * Security utilities for production-grade dApp
 * Rate limiting, CSRF protection, and request validation
 */

import { NextRequest } from 'next/server';

/**
 * Server-side rate limiter using in-memory store
 * For production, use Redis or similar distributed cache
 */
class ServerRateLimiter {
  private requests = new Map<string, number[]>();

  check(
    identifier: string,
    maxRequests: number = 10,
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const timestamps = this.requests.get(identifier) || [];

    // Filter out expired timestamps
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

    const allowed = validTimestamps.length < maxRequests;
    const remaining = Math.max(0, maxRequests - validTimestamps.length - 1);
    const resetTime = validTimestamps[0] ? validTimestamps[0] + windowMs : now + windowMs;

    if (allowed) {
      validTimestamps.push(now);
      this.requests.set(identifier, validTimestamps);
    }

    return { allowed, remaining, resetTime };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < 60000);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}

export const rateLimiter = new ServerRateLimiter();

// Cleanup old entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 60000);
}

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers (considering proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';

  return ip;
}

/**
 * Validate request origin (CORS/CSRF protection)
 */
export function validateRequestOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_URL,
    'https://app.minisend.xyz',
    'https://minisend.xyz',
    'http://localhost:3000', // Development
  ].filter(Boolean);

  if (!origin && !referer) {
    // Allow requests without origin (e.g., same-origin or mobile apps)
    return true;
  }

  const requestOrigin = origin || new URL(referer!).origin;

  return allowedOrigins.some(allowed =>
    requestOrigin.startsWith(allowed!)
  );
}

/**
 * Sanitize database input to prevent SQL injection
 */
export function sanitizeDbInput(input: string): string {
  return input
    .replace(/['";\\]/g, '') // Remove SQL metacharacters
    .trim()
    .substring(0, 1000);
}

/**
 * Generate secure session token
 */
export function generateSessionToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Verify request is from allowed user agent (prevent bot abuse)
 */
export function isValidUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;

  const blockedPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
  ];

  return !blockedPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Log security event for monitoring
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>
): void {
  // In production, send to monitoring service (e.g., Sentry, DataDog)
  console.warn('[SECURITY]', event, JSON.stringify(details));

  // TODO: Integrate with your monitoring service
  // Example: Sentry.captureMessage(event, { level: 'warning', extra: details });
}
