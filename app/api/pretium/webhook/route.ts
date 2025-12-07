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

          // Generate and log receipt data for completed transactions
          if (order) {
            console.log('Receipt data available:', {
              transaction_code,
              receipt_number,
              public_name,
              order_id: order.id,
              amount_local: order.amount_in_local,
              currency: order.local_currency,
            });

            // Log analytics event for receipt generation readiness
            await DatabaseService.logAnalyticsEvent('pretium_receipt_ready', order.wallet_address, {
              transaction_code,
              receipt_number,
              public_name,
              order_id: order.id,
            });
          }
        } catch (notificationError) {
          console.error('Notification failed:', notificationError);
          // Continue processing webhook
        }
      } catch (dbError) {
        console.error('DATABASE UPDATE FAILED:', {
          transaction_code,
          error: dbError instanceof Error ? dbError.message : dbError,
          stack: dbError instanceof Error ? dbError.stack : undefined
        });
        // Return success to Pretium to prevent retries, but log the error
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
      } catch (failedError) {
        console.error('Failed status update error:', {
          transaction_code,
          error: failedError instanceof Error ? failedError.message : failedError
        });
        // Return success to prevent retries
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
  } catch (webhookError) {
    console.error('WEBHOOK PROCESSING ERROR:', {
      error: webhookError instanceof Error ? webhookError.message : webhookError,
      stack: webhookError instanceof Error ? webhookError.stack : undefined
    });
    // Still return 200 to prevent retries
    return NextResponse.json({
      success: true,
      message: 'Webhook received',
    });
  }
}
