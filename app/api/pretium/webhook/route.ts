import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';
import type { PretiumWebhookPayload } from '@/lib/pretium/types';

export async function POST(request: NextRequest) {
  try {
    const payload: PretiumWebhookPayload = await request.json();

    console.log('='.repeat(80));
    console.log('[Webhook] PRETIUM WEBHOOK RECEIVED');
    console.log('='.repeat(80));
    console.log('[Webhook] Timestamp:', new Date().toISOString());
    console.log('[Webhook] Raw payload:', JSON.stringify(payload, null, 2));

    const { transaction_code, status, receipt_number, public_name, message, is_released } =
      payload;

    if (!transaction_code) {
      console.error('[Webhook] ERROR: Missing transaction_code in payload');
      console.log('='.repeat(80));
      return NextResponse.json({ error: 'Missing transaction_code' }, { status: 400 });
    }

    // Fetch order to log currency for debugging
    let order;
    try {
      order = await DatabaseService.getPretiumOrderByTransactionCode(transaction_code);
      if (order) {
        console.log('='.repeat(80));
        console.log(`[Webhook] ${order.local_currency} ORDER FOUND - Status: ${status}`);
        console.log('='.repeat(80));
        console.log('[Webhook] Order details:', {
          order_id: order.id,
          transaction_code,
          currency: order.local_currency,
          payment_type: order.payment_type,
          amount_usdc: order.amount_in_usdc,
          amount_local: order.amount_in_local,
          current_status: order.status,
          webhook_status: status,
          created_at: order.created_at
        });

        // Special logging for NGN transactions
        if (order.local_currency === 'NGN') {
          console.log('[Webhook] NGN TRANSACTION DETAILS:', {
            bank_name: order.bank_name,
            bank_code: order.bank_code,
            account_number: order.account_number,
            account_name: order.account_name,
            transaction_hash: order.transaction_hash
          });
        }
      } else {
        console.log('='.repeat(80));
        console.warn('[Webhook] WARNING: Order not found for transaction_code:', transaction_code);
        console.log('='.repeat(80));
      }
    } catch (lookupError) {
      console.log('='.repeat(80));
      console.error('[Webhook] ERROR looking up order:', {
        transaction_code,
        error: lookupError instanceof Error ? lookupError.message : lookupError
      });
      console.log('='.repeat(80));
    }

    // Handle off-ramp payment confirmation webhook
    if (status === 'COMPLETE' && receipt_number) {
      console.log('='.repeat(80));
      console.log(`[Webhook] ${order?.local_currency || 'UNKNOWN'} TRANSACTION COMPLETE`);
      console.log('='.repeat(80));
      console.log('[Webhook] Complete status details:', {
        transaction_code,
        receipt_number,
        public_name,
        currency: order?.local_currency,
        payment_type: order?.payment_type,
        timestamp: new Date().toISOString()
      });

      try {
        // Update order status in database (now using new pretium_orders table)
        await DatabaseService.updatePretiumOrderStatus(
          transaction_code,
          'completed',
          status,
          receipt_number,
          public_name || undefined,
          undefined, // no error message
          payload as unknown as Record<string, unknown> // store raw webhook payload
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
          const order = await DatabaseService.getPretiumOrderByTransactionCode(
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
      console.log('='.repeat(80));
      console.error(`[Webhook] ${order?.local_currency || 'UNKNOWN'} TRANSACTION FAILED`);
      console.log('='.repeat(80));
      console.error('[Webhook] Failed status details:', {
        transaction_code,
        failure_message: message,
        currency: order?.local_currency,
        payment_type: order?.payment_type,
        amount_usdc: order?.amount_in_usdc,
        amount_local: order?.amount_in_local,
        timestamp: new Date().toISOString()
      });

      // Log NGN-specific details if applicable
      if (order?.local_currency === 'NGN') {
        console.error('[Webhook] NGN FAILURE DETAILS:', {
          bank_name: order.bank_name,
          bank_code: order.bank_code,
          account_number: order.account_number,
          raw_disburse_request: order.raw_disburse_request,
          raw_disburse_response: order.raw_disburse_response
        });
      }
      console.log('='.repeat(80));

      try {
        await DatabaseService.updatePretiumOrderStatus(
          transaction_code,
          'failed',
          status,
          undefined,
          undefined,
          message,
          payload as unknown as Record<string, unknown> // store raw webhook payload
        );

        await DatabaseService.logAnalyticsEvent('pretium_payment_failed', '', {
          transaction_code,
          message,
          currency: order?.local_currency,
          payment_type: order?.payment_type
        });

        console.log('[Webhook] Failed status updated in database successfully');
      } catch (failedError) {
        console.log('='.repeat(80));
        console.error('[Webhook] ERROR: Failed to update failed status in database:', {
          transaction_code,
          error: failedError instanceof Error ? failedError.message : failedError
        });
        console.log('='.repeat(80));
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
