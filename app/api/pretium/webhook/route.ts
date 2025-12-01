import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';
import type { PretiumWebhookPayload } from '@/lib/pretium/types';

export async function POST(request: NextRequest) {
  try {
    const payload: PretiumWebhookPayload = await request.json();

    console.log('Pretium webhook received:', JSON.stringify(payload, null, 2));

    const { transaction_code, status, receipt_number, public_name, message, is_released } =
      payload;

    if (!transaction_code) {
      return NextResponse.json({ error: 'Missing transaction_code' }, { status: 400 });
    }

    // Handle off-ramp payment confirmation webhook
    if (status === 'COMPLETE' && receipt_number) {
      console.log('Processing COMPLETE status:', {
        transaction_code,
        receipt_number,
        public_name,
      });

      try {
        // Update order status in database
        await DatabaseService.updatePretiumOrderStatus(
          transaction_code,
          'completed',
          status,
          receipt_number,
          public_name || undefined
        );

        console.log('Database updated successfully for:', transaction_code);

        // Log analytics event
        await DatabaseService.logAnalyticsEvent('pretium_payment_complete', '', {
          transaction_code,
          receipt_number,
          public_name,
        });

        // Send notification to user via Farcaster if FID exists
        try {
          const order = await DatabaseService.getOrderByPretiumTransactionCode(
            transaction_code
          );

          if (order?.fid) {
            const {
              sendNotificationToUser,
              createTransactionNotification,
            } = await import('@/lib/services/neynar-notifications');

            const notification = createTransactionNotification('validated', {
              currency: order.local_currency,
              amount: order.amount_in_local,
              orderId: transaction_code,
            });

            await sendNotificationToUser(order.fid, notification);
          }
        } catch {
          // Notification failed - continue processing webhook
        }
      } catch {
        // Log error but return success to Pretium to prevent retries
      }
    }

    // Handle failed transactions
    if (status === 'FAILED') {
      try {
        await DatabaseService.updatePretiumOrderStatus(
          transaction_code,
          'failed',
          status,
          undefined,
          undefined,
          message
        );

        await DatabaseService.logAnalyticsEvent('pretium_payment_failed', '', {
          transaction_code,
          message,
        });
      } catch {
        // Log error but return success
      }
    }

    // Handle asset release webhook (on-ramp only - not applicable for our off-ramp flow)
    if (is_released) {
      // We're using Pretium for off-ramp only, so this shouldn't occur
      // But log it for monitoring purposes
      await DatabaseService.logAnalyticsEvent('pretium_asset_released', '', {
        transaction_code,
        is_released,
      });
    }

    // Always return 200 to prevent Pretium from retrying
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
    });
  } catch {
    // Log the error but still return 200 to prevent retries
    return NextResponse.json({
      success: true,
      message: 'Webhook received',
    });
  }
}
