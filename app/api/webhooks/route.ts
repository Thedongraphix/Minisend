import { NextRequest, NextResponse } from 'next/server';
import { getNotificationService } from '@/lib/services/notification-service';
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from '@farcaster/miniapp-node';

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

    // Parse and verify the webhook event
    let data;
    try {
      data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
      // Events are signed by the app key of a user with a JSON Farcaster Signature.
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Webhook verification failed';
      return NextResponse.json(
        { error: 'Invalid webhook signature', details: errorMessage },
        { status: 401 }
      );
    }

    // Extract webhook data
    const fid = data.fid;
    const appFid = data.appFid; // The FID of the client app that the user added the Mini App to
    const event = data.event;

    // Get notification service
    const notificationService = getNotificationService();

    // Handle different event types
    try {
      switch (event.event) {
        case 'miniapp_added': {
          // User added the Mini App - save notification details and send welcome notification
          if (event.notificationDetails) {
            await notificationService.saveNotificationDetails(
              fid,
              appFid,
              event.notificationDetails,
              true
            );

            // Send welcome notification
            await notificationService.sendNotification(
              fid,
              appFid,
              {
                title: '🎉 Welcome to Minisend!',
                body: 'Mini app is now added to your client',
                targetUrl: process.env.NEXT_PUBLIC_URL || 'https://minisend.xyz',
              }
            );
          }

          return NextResponse.json({
            success: true,
            message: 'Mini app added successfully'
          });
        }

        case 'miniapp_removed': {
          // User removed the Mini App - delete all notification data
          await notificationService.deleteNotificationDetails(fid, appFid);

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
              appFid,
              event.notificationDetails
            );

            // Send confirmation notification
            await notificationService.sendNotification(
              fid,
              appFid,
              {
                title: 'Ding ding ding',
                body: 'Notifications are now enabled',
                targetUrl: process.env.NEXT_PUBLIC_URL || 'https://minisend.xyz',
              }
            );
          }

          return NextResponse.json({
            success: true,
            message: 'Notifications enabled successfully'
          });
        }

        case 'notifications_disabled': {
          // User disabled notifications - delete notification details
          await notificationService.deleteNotificationDetails(fid, appFid);

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
        { error: 'Event processing failed', details: message },
        { status: 500 }
      );
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
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'Minisend Webhook Handler',
    timestamp: new Date().toISOString(),
  });
}
