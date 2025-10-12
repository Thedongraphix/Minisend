import { NextRequest, NextResponse } from 'next/server';
import { getNotificationService } from '@/lib/services/notification-service';
import { NotificationEvent } from '@/lib/types/notification';

/**
 * API endpoint to send notifications to users
 * This is an internal API that should be protected with authentication
 */

export async function POST(request: NextRequest) {
  try {
    // Verify API key for security
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.INTERNAL_API_KEY;

    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fid, event, data } = body as {
      fid?: number;
      fids?: number[];
      event: NotificationEvent;
      data?: Record<string, unknown>;
    };

    const notificationService = getNotificationService();
    const template = notificationService.getNotificationTemplate(event, data);

    // Send to single user or multiple users
    if (fid) {
      const result = await notificationService.sendNotification(fid, template);

      return NextResponse.json({
        success: result.success,
        status: result.status,
        error: result.error,
      });
    }

    if (body.fids && Array.isArray(body.fids)) {
      const result = await notificationService.sendBulkNotifications(
        body.fids,
        template
      );

      return NextResponse.json({
        success: result.successful > 0,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
      });
    }

    return NextResponse.json(
      { error: 'Either fid or fids array is required' },
      { status: 400 }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to send notification', details: message },
      { status: 500 }
    );
  }
}
