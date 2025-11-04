import { createClient } from '@supabase/supabase-js';
import {
  NotificationDetails,
  SendNotificationRequest,
  SendNotificationResponse,
  NotificationTemplate,
  NotificationEvent,
  NotificationStatus,
  UserNotification
} from '../types/notification';

/**
 * NotificationService handles all notification operations for Farcaster Mini App
 * Implements the Farcaster Frame Notifications specification
 */
export class NotificationService {
  private supabase;
  private appUrl: string;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.appUrl = process.env.NEXT_PUBLIC_URL || 'https://minisend.xyz';
  }

  /**
   * Store or update notification details for a user-client combination
   * @param fid - User's FID
   * @param appFid - Client's FID (e.g., Base app is 309857)
   * @param notificationDetails - Notification URL and token
   * @param miniappAdded - Whether this is a miniapp_added event
   */
  async saveNotificationDetails(
    fid: number,
    appFid: number,
    notificationDetails: NotificationDetails,
    miniappAdded: boolean = false
  ): Promise<void> {
    const data: Record<string, unknown> = {
      fid,
      app_fid: appFid,
      notification_url: notificationDetails.url,
      notification_token: notificationDetails.token,
      enabled: true,
      updated_at: new Date().toISOString(),
    };

    if (miniappAdded) {
      data.miniapp_added_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('user_notifications')
      .upsert(data, {
        onConflict: 'fid,app_fid',
      });

    if (error) {
      throw new Error(`Failed to save notification details: ${error.message}`);
    }
  }

  /**
   * Get notification details for a user-client combination
   * @param fid - User's FID
   * @param appFid - Client's FID
   */
  async getNotificationDetails(fid: number, appFid: number): Promise<UserNotification | null> {
    const { data, error } = await this.supabase
      .from('user_notifications')
      .select('*')
      .eq('fid', fid)
      .eq('app_fid', appFid)
      .eq('enabled', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as UserNotification;
  }

  /**
   * Disable notifications for a user-client combination
   * @param fid - User's FID
   * @param appFid - Client's FID
   */
  async disableNotifications(fid: number, appFid: number): Promise<void> {
    const { error } = await this.supabase
      .from('user_notifications')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('fid', fid)
      .eq('app_fid', appFid);

    if (error) {
      throw new Error(`Failed to disable notifications: ${error.message}`);
    }
  }

  /**
   * Delete all notification data for a user-client combination
   * @param fid - User's FID
   * @param appFid - Client's FID
   */
  async deleteNotificationDetails(fid: number, appFid: number): Promise<void> {
    const { error } = await this.supabase
      .from('user_notifications')
      .delete()
      .eq('fid', fid)
      .eq('app_fid', appFid);

    if (error) {
      throw new Error(`Failed to delete notification details: ${error.message}`);
    }
  }

  /**
   * Send a notification to a specific user-client combination
   * @param fid - User's FID
   * @param appFid - Client's FID
   * @param template - Notification content
   */
  async sendNotification(
    fid: number,
    appFid: number,
    template: NotificationTemplate
  ): Promise<{ success: boolean; status: NotificationStatus; error?: string }> {
    const userNotification = await this.getNotificationDetails(fid, appFid);

    if (!userNotification) {
      return { success: false, status: 'invalid_token', error: 'No notification token found' };
    }

    const notificationId = crypto.randomUUID();

    // Validate field lengths per Farcaster spec
    const title = template.title.substring(0, 32);
    const body = template.body.substring(0, 128);
    const targetUrl = template.targetUrl.substring(0, 1024);

    const request: SendNotificationRequest = {
      notificationId,
      title,
      body,
      targetUrl,
      tokens: [userNotification.notification_token],
    };

    try {
      // Get Neynar API key for authentication
      const neynarApiKey = process.env.NEYNAR_API_KEY;

      if (!neynarApiKey) {
        throw new Error('NEYNAR_API_KEY not configured');
      }

      const response = await fetch(userNotification.notification_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_key': neynarApiKey,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: SendNotificationResponse = await response.json();

      // Determine status based on response
      let status: NotificationStatus = 'success';
      let errorMessage: string | undefined;

      if (result.result.invalidTokens.length > 0) {
        status = 'invalid_token';
        errorMessage = 'Token is invalid';
        // Disable notifications for this user-client combination
        await this.disableNotifications(fid, appFid);
      } else if (result.result.rateLimitedTokens.length > 0) {
        status = 'rate_limited';
        errorMessage = 'Rate limit exceeded';
      } else if (result.result.successfulTokens.length === 0) {
        status = 'failed';
        errorMessage = 'No tokens succeeded';
      }

      // Log notification to history
      await this.logNotificationHistory({
        fid,
        app_fid: appFid,
        notification_id: notificationId,
        title,
        body,
        target_url: targetUrl,
        status,
        error_message: errorMessage,
      });

      // Update last notification sent timestamp
      await this.supabase
        .from('user_notifications')
        .update({ last_notification_sent_at: new Date().toISOString() })
        .eq('fid', fid)
        .eq('app_fid', appFid);

      return {
        success: status === 'success',
        status,
        error: errorMessage,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed notification
      await this.logNotificationHistory({
        fid,
        app_fid: appFid,
        notification_id: notificationId,
        title,
        body,
        target_url: targetUrl,
        status: 'failed',
        error_message: errorMessage,
      });

      return {
        success: false,
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Send notifications to multiple user-client combinations
   * @param recipients - Array of {fid, appFid} objects
   * @param template - Notification content
   */
  async sendBulkNotifications(
    recipients: Array<{ fid: number; appFid: number }>,
    template: NotificationTemplate
  ): Promise<{ successful: number; failed: number; results: Record<string, NotificationStatus> }> {
    const results: Record<string, NotificationStatus> = {};
    let successful = 0;
    let failed = 0;

    // Send notifications concurrently with a limit
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const promises = batch.map(async ({ fid, appFid }) => {
        const result = await this.sendNotification(fid, appFid, template);
        const key = `${fid}-${appFid}`;
        results[key] = result.status;
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      });

      await Promise.all(promises);
    }

    return { successful, failed, results };
  }

  /**
   * Log notification to history table
   */
  private async logNotificationHistory(data: {
    fid: number;
    app_fid: number;
    notification_id: string;
    title: string;
    body: string;
    target_url: string;
    status: NotificationStatus;
    error_message?: string;
  }): Promise<void> {
    await this.supabase.from('notification_history').insert({
      ...data,
      sent_at: new Date().toISOString(),
    });
  }

  /**
   * Get notification templates for different events
   */
  getNotificationTemplate(event: NotificationEvent, data?: Record<string, unknown>): NotificationTemplate {
    switch (event) {
      case 'welcome':
        return {
          title: '🎉 Welcome to Minisend!',
          body: 'Convert USDC to KES or NGN instantly. Your crypto, your cash.',
          targetUrl: this.appUrl,
        };

      case 'transaction_completed':
        return {
          title: '✅ Transaction Complete',
          body: `${data?.amount || ''} ${data?.currency || ''} delivered successfully!`,
          targetUrl: `${this.appUrl}?view=receipt&id=${data?.orderId || ''}`,
        };

      case 'transaction_validated':
        return {
          title: '✓ Payment Validated',
          body: `Your ${data?.currency || ''} transfer has been validated and delivered!`,
          targetUrl: `${this.appUrl}?view=receipt&id=${data?.orderId || ''}`,
        };

      case 'transaction_failed':
        return {
          title: '❌ Transaction Failed',
          body: `Your transaction couldn't be completed. Tap to view details.`,
          targetUrl: `${this.appUrl}?view=support&id=${data?.orderId || ''}`,
        };

      case 'rate_update':
        return {
          title: '📊 Rate Update',
          body: `New rates: 1 USDC = ${data?.rate || ''} ${data?.currency || ''}`,
          targetUrl: this.appUrl,
        };

      case 'promotion':
        return {
          title: data?.title as string || '🎁 Special Offer',
          body: data?.body as string || 'Check out our latest promotion!',
          targetUrl: this.appUrl,
        };

      default:
        return {
          title: 'Minisend Update',
          body: 'You have a new update from Minisend.',
          targetUrl: this.appUrl,
        };
    }
  }

  /**
   * Get all users with notifications enabled
   */
  async getEnabledUsers(): Promise<UserNotification[]> {
    const { data, error } = await this.supabase
      .from('user_notifications')
      .select('*')
      .eq('enabled', true);

    if (error) {
      throw new Error(`Failed to fetch enabled users: ${error.message}`);
    }

    return (data as UserNotification[]) || [];
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}
