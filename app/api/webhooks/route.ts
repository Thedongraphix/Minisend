import { NextRequest, NextResponse } from 'next/server';
import { getNotificationService } from '@/lib/services/notification-service';
import { FarcasterWebhookPayload } from '@/lib/types/notification';

/**
 * Webhook endpoint for Farcaster Mini App events
 * Handles: miniapp_added, miniapp_removed, notifications_enabled, notifications_disabled
 *
 * This endpoint receives webhook events from Farcaster when users interact with our Mini App
 * Events are signed with a JSON Farcaster Signature for security
 */

export async function POST(request: NextRequest) {
  try {
    const requestJson = await request.json();

    // Validate webhook signature
    const validatedData = await validateWebhookSignature(requestJson);

    if (!validatedData) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const { fid, event } = validatedData as FarcasterWebhookPayload;

    // Get notification service
    const notificationService = getNotificationService();

    // Handle different event types
    switch (event.event) {
      case 'miniapp_added': {
        // User added the Mini App - save notification details and send welcome notification
        if (event.notificationDetails) {
          await notificationService.saveNotificationDetails(
            fid,
            event.notificationDetails,
            true
          );

          // Send welcome notification
          const welcomeTemplate = notificationService.getNotificationTemplate('welcome');
          await notificationService.sendNotification(fid, welcomeTemplate);
        }

        return NextResponse.json({
          success: true,
          message: 'Mini app added successfully'
        });
      }

      case 'miniapp_removed': {
        // User removed the Mini App - delete all notification data
        await notificationService.deleteNotificationDetails(fid);

        return NextResponse.json({
          success: true,
          message: 'Mini app removed successfully'
        });
      }

      case 'notifications_enabled': {
        // User enabled notifications - save new notification details
        if (event.notificationDetails) {
          await notificationService.saveNotificationDetails(
            fid,
            event.notificationDetails
          );

          // Send confirmation notification
          const template = {
            title: '🔔 Notifications Enabled',
            body: 'You\'ll now receive updates about your transactions!',
            targetUrl: process.env.NEXT_PUBLIC_URL || 'https://minisend.xyz',
          };

          await notificationService.sendNotification(fid, template);
        }

        return NextResponse.json({
          success: true,
          message: 'Notifications enabled successfully'
        });
      }

      case 'notifications_disabled': {
        // User disabled notifications - disable but don't delete (they might re-enable)
        await notificationService.disableNotifications(fid);

        return NextResponse.json({
          success: true,
          message: 'Notifications disabled successfully'
        });
      }

      default: {
        return NextResponse.json(
          { error: 'Unknown event type' },
          { status: 400 }
        );
      }
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Webhook processing failed', details: message },
      { status: 500 }
    );
  }
}

/**
 * Validate webhook event signature from Farcaster
 * Events are signed by the app key of a user with a JSON Farcaster Signature
 *
 * @param data - The webhook payload
 * @returns Validated data or null if invalid
 */
async function validateWebhookSignature(
  data: unknown
): Promise<FarcasterWebhookPayload | null> {
  try {
    // Type check the basic structure
    if (!data || typeof data !== 'object') {
      return null;
    }

    const payload = data as Record<string, unknown>;

    // Validate required fields
    if (
      typeof payload.fid !== 'number' ||
      !payload.event ||
      typeof payload.event !== 'object'
    ) {
      return null;
    }

    const event = payload.event as Record<string, unknown>;

    if (typeof event.event !== 'string') {
      return null;
    }

    // TODO: Implement proper Farcaster signature verification
    // For now, we're doing basic structure validation
    // In production, you should verify the signature using Farcaster's verification library
    // Reference: https://docs.farcaster.xyz/developers/frames/v2/spec#signature-verification

    return payload as FarcasterWebhookPayload;

  } catch {
    return null;
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'Minisend Webhook Handler',
    timestamp: new Date().toISOString(),
  });
}
