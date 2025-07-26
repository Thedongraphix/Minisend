import { NextRequest, NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';
import { PaycrestWebhookEvent, PaycrestOrder } from '@/lib/paycrest';
import { WebhookService } from '@/lib/supabase/webhooks';
import { OrderService } from '@/lib/supabase/orders';
import { AnalyticsService } from '@/lib/supabase/analytics';

// Force dynamic rendering and Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 PayCrest webhook endpoint called - processing settlement event');
    
    // Get the signature from headers
    const signature = request.headers.get('x-paycrest-signature');
    
    if (!signature) {
      console.log('⚠️ No signature header in webhook request');
      return NextResponse.json(
        { message: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    // Verify webhook signature
    const paycrestService = await getPaycrestService();
    const isValid = paycrestService.verifyWebhookSignature(rawBody, signature);
    
    if (!isValid) {
      console.error('PayCrest webhook: Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    let webhookEvent: PaycrestWebhookEvent;
    try {
      webhookEvent = JSON.parse(rawBody);
    } catch (error) {
      console.error('PayCrest webhook: Invalid JSON payload', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { event, data: order } = webhookEvent;
    
    console.log(`🎯 PayCrest webhook received: ${event} for order ${order.id}`, {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      amountPaid: order.amountPaid,
      txHash: order.txHash,
      token: order.token,
      network: order.network,
      reference: order.reference,
      recipient: order.recipient
    });

    // Handle different order status events
    switch (order.status) {
      case 'initiated':
        console.log(`📋 Order ${order.id} initiated - order created`);
        await handleOrderInitiated(order);
        break;
        
      case 'pending':
        console.log(`⏳ Order ${order.id} is pending - waiting for processing`);
        await handleOrderPending(order);
        break;
        
      case 'settled':
      case 'validated':
        console.log(`🎉 Order ${order.id} ${order.status} - payment completed successfully!`);
        await handleOrderSettled(order);
        break;
        
      case 'refunded':
        console.log(`⚠️ Order ${order.id} refunded to sender`);
        await handleOrderRefunded(order);
        break;
        
      case 'expired':
        console.log(`⏰ Order ${order.id} expired without completion`);
        await handleOrderExpired(order);
        break;
        
      default:
        console.log(`❓ Unknown order status: ${order.status} for order ${order.id}`);
    }

    // Store webhook event in database
    const webhookEventId = await WebhookService.storeWebhookEvent({
      event_type: event,
      paycrest_order_id: order.id,
      payload: webhookEvent as unknown as Record<string, unknown>,
      signature,
      headers: Object.fromEntries(request.headers.entries()),
      user_agent: request.headers.get('user-agent')
    });

    // Update order status in database with FULL settlement info
    try {
      const orderService = new OrderService();
      
      if (order.status === 'settled' || order.status === 'validated') {
        // For settled/validated orders, update with complete settlement information
        console.log('🎉 WEBHOOK: Updating order with settlement info:', {
          orderId: order.id,
          status: order.status,
          amountPaid: order.amountPaid,
          txHash: order.txHash,
          settledAt: new Date().toISOString()
        });
        
        await orderService.updateOrderStatus(order.id, 'settled', {
          settled_at: new Date(),
          tx_hash: order.txHash,
          amount_paid: order.amountPaid ? parseFloat(order.amountPaid.toString()) : undefined
        });

        // Also populate the settlements table directly
        const supabase = (await import('@/lib/supabase/config')).supabase;
        const dbOrder = await OrderService.getOrderByPaycrestId(order.id);
        
        if (dbOrder) {
          const settlementTime = Math.floor((new Date().getTime() - new Date(dbOrder.created_at).getTime()) / 1000);
          
          await supabase.from('settlements').insert({
            order_id: dbOrder.id,
            status: order.status,
            settlement_time_seconds: settlementTime,
            tx_hash: order.txHash,
            amount_paid: order.amountPaid ? parseFloat(order.amountPaid.toString()) : undefined,
            recipient_phone: order.recipient?.accountIdentifier,
            recipient_name: order.recipient?.accountName,
            currency: order.recipient?.currency
          });

          console.log('✅ WEBHOOK: Settlement record created in settlements table');
        }
      } else {
        // For other statuses, just update the status
        await orderService.updateOrderStatus(order.id, order.status);
      }
      
      await WebhookService.markWebhookProcessed(webhookEventId.id, true);
      console.log('✅ WEBHOOK: Database updated successfully for order:', order.id);
    } catch (dbError) {
      console.error('❌ WEBHOOK: Database update failed:', dbError);
      await WebhookService.markWebhookProcessed(
        webhookEventId.id, 
        false, 
        dbError instanceof Error ? dbError.message : 'Database update failed'
      );
    }

    return NextResponse.json(
      { 
        message: 'Webhook processed successfully',
        orderId: order.id,
        status: order.status
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('PayCrest webhook processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleOrderInitiated(order: PaycrestOrder) {
  // Order has been created and initiated
  console.log(`📋 Order ${order.id} initiated - order created successfully`);
}

async function handleOrderPending(order: PaycrestOrder) {
  // Order is pending processing 
  console.log(`⏳ Order ${order.id} is pending - waiting for provider processing`);
}

async function handleOrderSettled(order: PaycrestOrder) {
  // Order fully completed and settled - THIS IS SUCCESS!
  console.log(`🎉 Order ${order.id} settled - payment completed successfully!`);
  
  // Log success for debugging
  console.log('✅ SUCCESS: Payment settled successfully!', {
    orderId: order.id,
    amount: order.amount,
    recipient: order.recipient?.accountName,
    phone: order.recipient?.accountIdentifier,
    currency: order.recipient?.currency,
    timestamp: new Date().toISOString(),
    status: 'settled'
  });
  
  // Track success analytics - this is the main success event now
  try {
    const dbOrder = await OrderService.getOrderByPaycrestId(order.id);
    if (dbOrder) {
      const settlementTime = Math.floor(
        (new Date().getTime() - new Date(dbOrder.created_at).getTime()) / 1000
      );
      
      // Track payment completion
      await AnalyticsService.trackPaymentCompleted(
        dbOrder.wallet_address,
        dbOrder.id,
        Number(dbOrder.amount),
        dbOrder.currency,
        settlementTime
      );
      
      // Also track settlement event
      await AnalyticsService.trackEvent({
        event_name: 'order_settled',
        wallet_address: dbOrder.wallet_address,
        order_id: dbOrder.id,
        properties: {
          amount: dbOrder.amount,
          currency: dbOrder.currency,
          settlementTimeSeconds: settlementTime,
          phone: order.recipient?.accountIdentifier
        }
      });
      
      console.log(`📊 Analytics tracked for settled payment:`, {
        orderId: order.id,
        walletAddress: dbOrder.wallet_address,
        amount: dbOrder.amount,
        currency: dbOrder.currency,
        settlementTimeSeconds: settlementTime,
        phone: order.recipient?.accountIdentifier
      });
    }
  } catch (error) {
    console.error('Failed to track settlement analytics:', error);
  }
}

async function handleOrderRefunded(order: PaycrestOrder) {
  // Funds refunded to sender
  // Something went wrong with the transaction
  console.log(`⚠️ Order ${order.id} was refunded - transaction failed`);
  
  // Track refund analytics
  try {
    const dbOrder = await OrderService.getOrderByPaycrestId(order.id);
    if (dbOrder) {
      await AnalyticsService.trackEvent({
        event_name: 'order_refunded',
        wallet_address: dbOrder.wallet_address,
        order_id: dbOrder.id,
        properties: {
          amount: dbOrder.amount,
          currency: dbOrder.currency,
          refund_reason: 'payment_processing_failed'
        }
      });
    }
  } catch (error) {
    console.error('Failed to track refund analytics:', error);
  }
}

async function handleOrderExpired(order: PaycrestOrder) {
  // Order expired without completion
  console.log(`⏰ Order ${order.id} expired - no payment received in time`);
  
  // Track expiration analytics
  try {
    const dbOrder = await OrderService.getOrderByPaycrestId(order.id);
    if (dbOrder) {
      await AnalyticsService.trackEvent({
        event_name: 'order_expired',
        wallet_address: dbOrder.wallet_address,
        order_id: dbOrder.id,
        properties: {
          amount: dbOrder.amount,
          currency: dbOrder.currency,
          expiry_reason: 'no_payment_received'
        }
      });
    }
  } catch (error) {
    console.error('Failed to track expiration analytics:', error);
  }
}