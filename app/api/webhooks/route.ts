import { NextResponse } from 'next/server';

/**
 * Webhook endpoint for Farcaster Mini App events
 *
 * ⚠️ IMPORTANT: This endpoint is NOT currently used
 *
 * Our app uses Neynar-managed notifications, which means:
 * - Webhooks are sent to Neynar (configured in manifest)
 * - Neynar handles token storage and management
 * - We send notifications via Neynar API by FID only
 *
 * This endpoint is kept for reference if switching to self-managed notifications.
 *
 * Events that would be handled:
 * - miniapp_added: User adds the Mini App
 * - miniapp_removed: User removes the Mini App
 * - notifications_enabled: User enables notifications
 * - notifications_disabled: User disables notifications
 *
 * Security: Events are signed with a JSON Farcaster Signature
 *
 * Required imports for self-managed notifications:
 * import { NextRequest } from 'next/server';
 * import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/miniapp-node';
 */

export async function POST() {
  // This endpoint is not actively used with Neynar-managed notifications
  // Return a helpful message explaining the setup
  return NextResponse.json(
    {
      message: 'Webhook endpoint available but not in use',
      details: 'This app uses Neynar-managed notifications. Webhooks are handled by Neynar.',
      configuration: {
        webhookUrl: 'https://api.neynar.com/f/app/6169a7fa-658f-4d01-b6a5-ec7fb4bd802e/event',
        notificationService: 'Neynar Managed'
      }
    },
    { status: 200 }
  );

  /*
   * The following code is preserved for reference if switching to self-managed notifications:
   *
   * try {
   *   const requestJson = await request.json();
   *
   *   // Parse and verify the webhook event
   *   let data;
   *   try {
   *     data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
   *   } catch (e: unknown) {
   *     const errorMessage = e instanceof Error ? e.message : 'Webhook verification failed';
   *     return NextResponse.json(
   *       { error: 'Invalid webhook signature', details: errorMessage },
   *       { status: 401 }
   *     );
   *   }
   *
   *   const fid = data.fid;
   *   const appFid = data.appFid;
   *   const event = data.event;
   *
   *   // Handle events: miniapp_added, miniapp_removed, notifications_enabled, notifications_disabled
   *   // Store tokens in database, send welcome notifications, etc.
   *
   *   return NextResponse.json({ success: true });
   * } catch (error) {
   *   return NextResponse.json(
   *     { error: 'Webhook processing failed' },
   *     { status: 500 }
   *   );
   * }
   */
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
