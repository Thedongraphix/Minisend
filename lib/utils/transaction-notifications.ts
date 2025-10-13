import { getNotificationService } from '../services/notification-service';
import { NotificationEvent } from '../types/notification';

/**
 * Helper functions to send transaction-related notifications
 * These are non-blocking and won't fail the transaction if notifications fail
 */

interface TransactionNotificationData {
  orderId: string;
  amount?: number;
  currency?: string;
  status?: string;
  recipientName?: string;
}

/**
 * Send notification for a transaction status change
 * This is a fire-and-forget function that won't throw errors
 */
export async function sendTransactionNotification(
  fid: number | undefined,
  event: NotificationEvent,
  data: TransactionNotificationData
): Promise<void> {
  // If no FID provided, skip notification
  if (!fid) {
    return;
  }

  try {
    const notificationService = getNotificationService();
    const template = notificationService.getNotificationTemplate(event, data as unknown as Record<string, unknown>);

    // Send notification (non-blocking)
    await notificationService.sendNotification(fid, template);

  } catch {
    // Silently fail - notifications are non-critical
    // Note: No console.log per project guidelines
  }
}

/**
 * Send notification when transaction completes
 */
export async function notifyTransactionCompleted(
  fid: number | undefined,
  orderId: string,
  amount: number,
  currency: string
): Promise<void> {
  await sendTransactionNotification(fid, 'transaction_completed', {
    orderId,
    amount,
    currency,
  });
}

/**
 * Send notification when transaction is validated (funds delivered)
 */
export async function notifyTransactionValidated(
  fid: number | undefined,
  orderId: string,
  amount: number,
  currency: string
): Promise<void> {
  await sendTransactionNotification(fid, 'transaction_validated', {
    orderId,
    amount,
    currency,
  });
}

/**
 * Send notification when transaction fails
 */
export async function notifyTransactionFailed(
  fid: number | undefined,
  orderId: string
): Promise<void> {
  await sendTransactionNotification(fid, 'transaction_failed', {
    orderId,
  });
}

/**
 * Batch send notifications to multiple users
 * Useful for rate updates or promotional messages
 */
export async function sendBulkNotification(
  event: NotificationEvent,
  data?: Record<string, unknown>
): Promise<{ successful: number; failed: number }> {
  try {
    const notificationService = getNotificationService();
    const template = notificationService.getNotificationTemplate(event, data);

    // Get all users with notifications enabled
    const users = await notificationService.getEnabledUsers();
    const fids = users.map(user => user.fid);

    if (fids.length === 0) {
      return { successful: 0, failed: 0 };
    }

    // Send notifications
    const result = await notificationService.sendBulkNotifications(fids, template);

    return {
      successful: result.successful,
      failed: result.failed,
    };

  } catch {
    return { successful: 0, failed: 0 };
  }
}
