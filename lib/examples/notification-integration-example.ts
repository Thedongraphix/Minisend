/**
 * Example: Integrating Notifications into Minisend
 *
 * This file demonstrates how to integrate the notification system
 * into your existing Minisend components and API routes.
 *
 * Note: This is a documentation file with example code snippets.
 * The code is for reference and demonstration purposes.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useFarcasterFid } from '@/app/hooks/useFarcasterUser';
import { notifyTransactionCompleted } from '@/lib/utils/transaction-notifications';

// ============================================================================
// EXAMPLE 1: Capturing FID in a React Component
// ============================================================================

// Example component showing FID capture pattern
// In your actual component, import React and use this pattern:
/*
export function ExamplePaymentComponent() {
  const fid = useFarcasterFid();

  const handlePayment = async () => {
    const response = await fetch('/api/paycrest/orders/simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 1000,
        currency: 'KES',
        phoneNumber: '+254712345678',
        fid, // ← Include FID here
      }),
    });

    const data = await response.json();
    // Handle response...
  };

  return <button onClick={handlePayment}>Send Payment</button>;
}
*/

// ============================================================================
// EXAMPLE 2: Sending Notifications in an API Route
// ============================================================================

/**
 * Example: Update your order status endpoint to send notifications
 * Location: app/api/paycrest/status/[orderId]/route.ts
 */
export async function handleOrderStatusChange(
  orderId: string,
  newStatus: string,
  previousStatus: string,
  orderData: {
    fid?: number;
    amount: number;
    currency: string;
  }
) {
  // Update order in database
  // ... your existing code ...

  // Send notification based on status change
  if (newStatus === 'validated' && previousStatus !== 'validated') {
    // Transaction validated - funds delivered
    if (orderData.fid) {
      await notifyTransactionCompleted(
        orderData.fid,
        orderId,
        orderData.amount,
        orderData.currency
      );
    }
  }

  if (newStatus === 'failed') {
    // Transaction failed
    if (orderData.fid) {
      await notifyTransactionFailed(orderData.fid, orderId);
    }
  }
}

// ============================================================================
// EXAMPLE 3: Sending Bulk Notifications for Rate Updates
// ============================================================================

import { getNotificationService } from '@/lib/services/notification-service';

export async function sendRateUpdateNotification(
  newRate: number,
  currency: 'KES' | 'NGN'
) {
  const notificationService = getNotificationService();

  // Get all users with notifications enabled
  const users = await notificationService.getEnabledUsers();

  // Create template
  const template = notificationService.getNotificationTemplate('rate_update', {
    rate: newRate,
    currency,
  });

  // Send to all users
  const result = await notificationService.sendBulkNotifications(
    users.map((u) => u.fid),
    template
  );

  return {
    sent: result.successful,
    failed: result.failed,
  };
}

// ============================================================================
// EXAMPLE 4: Custom Notification Template
// ============================================================================

export async function sendCustomNotification(
  fid: number,
  title: string,
  body: string,
  targetUrl?: string
) {
  const notificationService = getNotificationService();

  const result = await notificationService.sendNotification(fid, {
    title: title.substring(0, 32), // Max 32 characters
    body: body.substring(0, 128), // Max 128 characters
    targetUrl: targetUrl || process.env.NEXT_PUBLIC_URL || 'https://minisend.xyz',
  });

  if (!result.success) {
    // Handle notification failure
    // Note: This is non-critical, log but don't throw
  }

  return result;
}

// ============================================================================
// EXAMPLE 5: Checking if User Has Notifications Enabled
// ============================================================================

export async function checkUserNotifications(fid: number): Promise<boolean> {
  const notificationService = getNotificationService();
  const userNotification = await notificationService.getNotificationDetails(fid);

  return userNotification?.enabled ?? false;
}

// ============================================================================
// EXAMPLE 6: Integration with Order Creation
// ============================================================================

/**
 * Example: Add this pattern to your order creation API route
 * Location: app/api/paycrest/orders/simple/route.ts
 */
export async function createOrderWithNotifications(orderData: {
  amount: number;
  currency: string;
  phoneNumber: string;
  fid?: number; // ← Include FID
}) {
  // Example pattern - replace with your actual database service
  // const order = await DatabaseService.createOrder({
  //   ...orderData,
  //   fid: orderData.fid, // Store FID
  // });

  // Order creation successful
  // Notifications will be sent automatically when status changes
  // via the status polling endpoint

  return { success: true, orderId: 'example-order-id' };
}

// ============================================================================
// EXAMPLE 7: Testing Notifications
// ============================================================================

/**
 * Test script to verify notifications are working
 * Run with: tsx lib/examples/test-notification.ts
 */
export async function testNotificationSystem() {
  const notificationService = getNotificationService();

  // Replace with your FID
  const TEST_FID = 12345;

  // Send test notification
  const result = await notificationService.sendNotification(TEST_FID, {
    title: 'Test Notification',
    body: 'This is a test from Minisend!',
    targetUrl: 'https://minisend.xyz',
  });

  if (result.success) {
    return 'Notification sent successfully!';
  } else {
    return `Failed: ${result.error}`;
  }
}

// ============================================================================
// EXAMPLE 8: Disable Notifications for a User
// ============================================================================

export async function disableUserNotifications(fid: number) {
  const notificationService = getNotificationService();
  await notificationService.disableNotifications(fid);
}

// Note: This is typically handled automatically via webhook
// when users disable notifications in the Farcaster app

// ============================================================================
// Type Imports for Reference
// ============================================================================

import type { NotificationEvent } from '@/lib/types/notification';
import { notifyTransactionFailed } from '@/lib/utils/transaction-notifications';

// Available notification events:
const AVAILABLE_EVENTS: NotificationEvent[] = [
  'transaction_completed',
  'transaction_failed',
  'transaction_validated',
  'welcome',
  'rate_update',
  'promotion',
];
