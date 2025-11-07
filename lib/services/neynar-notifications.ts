import { NeynarAPIClient } from '@neynar/nodejs-sdk';

/**
 * Neynar Notification Service
 *
 * Simplified notification service that uses Neynar's managed infrastructure.
 * Neynar handles:
 * - Token storage and management
 * - Webhook processing (miniapp_added, notifications_enabled, etc.)
 * - Token validation and expiration
 *
 * We just need to:
 * - Call Neynar's API with the user's FID
 * - Neynar looks up the token and sends the notification
 *
 * Security Features:
 * - Input validation and sanitization
 * - Length limits per Farcaster spec (title: 32, body: 128, URL: 1024)
 * - FID validation
 * - URL validation (must match app domain)
 * - Error handling without data leakage
 */

// Farcaster notification length limits
const MAX_TITLE_LENGTH = 32;
const MAX_BODY_LENGTH = 128;
const MAX_URL_LENGTH = 1024;

// Get app domain for URL validation
const APP_DOMAIN = new URL(process.env.NEXT_PUBLIC_URL || 'https://minisend.xyz').hostname;

/**
 * Singleton Neynar client instance
 */
let neynarClientInstance: NeynarAPIClient | null = null;

function getNeynarClient(): NeynarAPIClient {
  if (!process.env.NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY not configured');
  }

  if (!neynarClientInstance) {
    neynarClientInstance = new NeynarAPIClient({
      apiKey: process.env.NEYNAR_API_KEY
    });
  }

  return neynarClientInstance;
}

export interface NotificationPayload {
  title: string;
  body: string;
  targetUrl: string;
}

/**
 * Validate FID is a positive integer
 */
function isValidFid(fid: number): boolean {
  return Number.isInteger(fid) && fid > 0;
}

/**
 * Sanitize and validate notification content per Farcaster spec
 */
function sanitizeNotification(notification: NotificationPayload): {
  valid: boolean;
  sanitized?: NotificationPayload;
  error?: string;
} {
  // Validate title
  if (!notification.title || typeof notification.title !== 'string') {
    return { valid: false, error: 'Title is required and must be a string' };
  }

  // Validate body
  if (!notification.body || typeof notification.body !== 'string') {
    return { valid: false, error: 'Body is required and must be a string' };
  }

  // Validate targetUrl
  if (!notification.targetUrl || typeof notification.targetUrl !== 'string') {
    return { valid: false, error: 'Target URL is required and must be a string' };
  }

  // Validate URL format and domain
  try {
    const url = new URL(notification.targetUrl);

    // Security: Ensure URL is HTTPS (except for localhost in development)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
      return { valid: false, error: 'Target URL must use HTTPS' };
    }

    // Security: Ensure URL matches app domain (prevents redirect attacks)
    if (url.hostname !== APP_DOMAIN && url.hostname !== 'localhost') {
      return {
        valid: false,
        error: `Target URL must be on the same domain (${APP_DOMAIN})`
      };
    }

    // Security: Check for path traversal attempts
    if (notification.targetUrl.includes('..')) {
      return { valid: false, error: 'Invalid URL path' };
    }

  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Truncate to Farcaster limits and sanitize
  const sanitized: NotificationPayload = {
    title: notification.title.substring(0, MAX_TITLE_LENGTH).trim(),
    body: notification.body.substring(0, MAX_BODY_LENGTH).trim(),
    targetUrl: notification.targetUrl.substring(0, MAX_URL_LENGTH).trim(),
  };

  return { valid: true, sanitized };
}

/**
 * Send notification to a specific Farcaster user
 * @param fid - User's Farcaster ID (must be positive integer)
 * @param notification - Notification content
 * @returns Promise with success status
 */
export async function sendNotificationToUser(
  fid: number,
  notification: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate FID
    if (!isValidFid(fid)) {
      return {
        success: false,
        error: 'Invalid FID: must be a positive integer'
      };
    }

    // Sanitize and validate notification content
    const validation = sanitizeNotification(notification);
    if (!validation.valid || !validation.sanitized) {
      return {
        success: false,
        error: validation.error || 'Invalid notification content'
      };
    }

    const client = getNeynarClient();

    // Send notification via Neynar - they handle token lookup
    await client.publishFrameNotifications({
      targetFids: [fid], // Target specific user
      filters: {}, // No additional filters
      notification: {
        title: validation.sanitized.title,
        body: validation.sanitized.body,
        target_url: validation.sanitized.targetUrl,
      },
    });

    return { success: true };
  } catch {
    // Error handling without sensitive data leakage
    return { success: false, error: 'Failed to send notification' };
  }
}

/**
 * Send notification to multiple users
 * @param fids - Array of Farcaster IDs (max 100)
 * @param notification - Notification content
 * @returns Promise with success status
 */
export async function sendNotificationToUsers(
  fids: number[],
  notification: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input
    if (!Array.isArray(fids) || fids.length === 0) {
      return {
        success: false,
        error: 'FIDs array is required and must not be empty'
      };
    }

    // Limit to 100 FIDs per Farcaster spec
    if (fids.length > 100) {
      return {
        success: false,
        error: 'Maximum 100 FIDs per request'
      };
    }

    // Validate all FIDs
    const invalidFids = fids.filter(fid => !isValidFid(fid));
    if (invalidFids.length > 0) {
      return {
        success: false,
        error: 'All FIDs must be positive integers'
      };
    }

    // Sanitize and validate notification content
    const validation = sanitizeNotification(notification);
    if (!validation.valid || !validation.sanitized) {
      return {
        success: false,
        error: validation.error || 'Invalid notification content'
      };
    }

    const client = getNeynarClient();

    // Send notification via Neynar
    await client.publishFrameNotifications({
      targetFids: fids,
      filters: {},
      notification: {
        title: validation.sanitized.title,
        body: validation.sanitized.body,
        target_url: validation.sanitized.targetUrl,
      },
    });

    return { success: true };
  } catch {
    // Error handling without sensitive data leakage
    return { success: false, error: 'Failed to send notifications' };
  }
}

/**
 * Broadcast notification to all users with notifications enabled
 * @param notification - Notification content
 * @param filters - Optional filters (exclude_fids, following_fid, etc.)
 * @returns Promise with success status
 */
export async function broadcastNotification(
  notification: NotificationPayload,
  filters?: {
    exclude_fids?: number[];
    following_fid?: number;
    minimum_user_score?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Sanitize and validate notification content
    const validation = sanitizeNotification(notification);
    if (!validation.valid || !validation.sanitized) {
      return {
        success: false,
        error: validation.error || 'Invalid notification content'
      };
    }

    // Validate filters if provided
    if (filters) {
      if (filters.exclude_fids && !Array.isArray(filters.exclude_fids)) {
        return { success: false, error: 'exclude_fids must be an array' };
      }

      if (filters.following_fid && !isValidFid(filters.following_fid)) {
        return { success: false, error: 'following_fid must be a positive integer' };
      }

      if (filters.minimum_user_score &&
          (typeof filters.minimum_user_score !== 'number' || filters.minimum_user_score < 0)) {
        return { success: false, error: 'minimum_user_score must be a positive number' };
      }
    }

    const client = getNeynarClient();

    // Broadcast to all users (empty targetFids array)
    await client.publishFrameNotifications({
      targetFids: [], // Empty = all users with notifications enabled
      filters: filters || {},
      notification: {
        title: validation.sanitized.title,
        body: validation.sanitized.body,
        target_url: validation.sanitized.targetUrl,
      },
    });

    return { success: true };
  } catch {
    // Error handling without sensitive data leakage
    return { success: false, error: 'Failed to broadcast notification' };
  }
}

/**
 * Create notification for transaction events
 * Helper function to generate consistent notification content
 */
export function createTransactionNotification(event: 'created' | 'validated' | 'failed', data: {
  currency: string;
  amount: number;
  orderId?: string;
}): NotificationPayload {
  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://minisend.xyz';

  switch (event) {
    case 'created':
      return {
        title: '🎯 Order Created',
        body: `Your ${data.currency} ${data.amount.toFixed(2)} order is ready!`,
        targetUrl: appUrl,
      };

    case 'validated':
      return {
        title: '✅ Payment Delivered',
        body: `Your ${data.currency} ${data.amount.toFixed(2)} payment has been delivered!`,
        targetUrl: appUrl,
      };

    case 'failed':
      return {
        title: '❌ Transaction Failed',
        body: 'Your transaction could not be completed. Please try again.',
        targetUrl: appUrl,
      };

    default:
      return {
        title: 'Transaction Update',
        body: 'Your transaction status has been updated.',
        targetUrl: appUrl,
      };
  }
}
