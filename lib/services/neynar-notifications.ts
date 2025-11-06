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
 */

// Initialize Neynar client
function getNeynarClient(): NeynarAPIClient {
  if (!process.env.NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY not configured');
  }
  return new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY });
}

export interface NotificationPayload {
  title: string;
  body: string;
  targetUrl: string;
}

/**
 * Send notification to a specific Farcaster user
 * @param fid - User's Farcaster ID
 * @param notification - Notification content
 * @returns Promise with success status
 */
export async function sendNotificationToUser(
  fid: number,
  notification: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getNeynarClient();

    // Send notification via Neynar - they handle token lookup
    await client.publishFrameNotifications({
      targetFids: [fid], // Target specific user
      filters: {}, // No additional filters
      notification: {
        title: notification.title,
        body: notification.body,
        target_url: notification.targetUrl,
      },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to send notification to FID ${fid}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send notification to multiple users
 * @param fids - Array of Farcaster IDs
 * @param notification - Notification content
 * @returns Promise with success status
 */
export async function sendNotificationToUsers(
  fids: number[],
  notification: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getNeynarClient();

    // Send notification via Neynar
    await client.publishFrameNotifications({
      targetFids: fids,
      filters: {},
      notification: {
        title: notification.title,
        body: notification.body,
        target_url: notification.targetUrl,
      },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to send notification to ${fids.length} users:`, errorMessage);
    return { success: false, error: errorMessage };
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
    const client = getNeynarClient();

    // Broadcast to all users (empty targetFids array)
    await client.publishFrameNotifications({
      targetFids: [], // Empty = all users with notifications enabled
      filters: filters || {},
      notification: {
        title: notification.title,
        body: notification.body,
        target_url: notification.targetUrl,
      },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to broadcast notification:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
