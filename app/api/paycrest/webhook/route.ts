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
    console.log('🎯 PayCrest webhook endpoint called - processing payment order event');
    
    // Get the signature from headers (official PayCrest header name)
    const signature = request.headers.get('X-Paycrest-Signature');
    
    if (!signature) {
      console.log('⚠️ No X-Paycrest-Signature header in webhook request');
      return NextResponse.json(
        { message: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    // Verify webhook signature using official PayCrest method
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
      event: event,
      amount: order.amount,
      amountPaid: order.amountPaid,
      txHash: order.txHash,
      token: order.token,
      network: order.network,
      reference: order.reference,
      recipient: order.recipient
    });

    // Handle different payment order events (following official PayCrest specification)
    switch (event) {
      case 'payment_order.pending':
        console.log(`⏳ Order ${order.id} pending - waiting for provider assignment`);
        await handleOrderPending(order);
        break;
        
      case 'payment_order.validated':
        console.log(`🎉 Order ${order.id} validated - funds sent to recipient's bank/mobile network!`);
        console.log(`✅ TRANSACTION SUCCESSFUL - User can be notified of successful payment`);
        await handleOrderValidated(order);
        break;
        
      case 'payment_order.settled':
        console.log(`🔗 Order ${order.id} settled - order fully completed on blockchain`);
        await handleOrderSettled(order);
        break;
        
      case 'payment_order.refunded':
        console.log(`⚠️ Order ${order.id} refunded - funds refunded to sender`);
        await handleOrderRefunded(order);
        break;
        
      case 'payment_order.expired':
        console.log(`⏰ Order ${order.id} expired - order expired without completion`);
        await handleOrderExpired(order);
        break;
        
      default:
        console.log(`❓ Unknown payment order event: ${event} for order ${order.id}`);
        // Still handle the order based on status for backward compatibility
        if (order.status === 'validated' || order.status === 'settled') {
          await handleOrderValidated(order);
        }
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

    // Update order status in database following PayCrest specification
    try {
      const orderService = new OrderService();
      
      // Handle validated status (TRANSACTION SUCCESS - funds sent to recipient)
      if (event === 'payment_order.validated' || order.status === 'validated') {
        console.log('🎉 WEBHOOK: Processing VALIDATED order - transaction successful:', {
          orderId: order.id,
          event: event,
          status: order.status,
          amountPaid: order.amountPaid,
          txHash: order.txHash,
          validatedAt: new Date().toISOString()
        });
        
        // Update order as settled since validated means successful transaction
        await orderService.updateOrderStatus(order.id, 'settled', {
          settled_at: new Date(),
          tx_hash: order.txHash,
          amount_paid: order.amountPaid ? parseFloat(order.amountPaid.toString()) : undefined
        });

        // Create settlement record for validated orders
        const supabase = (await import('@/lib/supabase/config')).supabase;
        const dbOrder = await OrderService.getOrderByPaycrestId(order.id);
        
        if (dbOrder) {
          const settlementTime = Math.floor((new Date().getTime() - new Date(dbOrder.created_at).getTime()) / 1000);
          
          await supabase.from('settlements').insert({
            order_id: dbOrder.id,
            status: 'validated', // Keep original status for tracking
            settlement_time_seconds: settlementTime,
            tx_hash: order.txHash,
            amount_paid: order.amountPaid ? parseFloat(order.amountPaid.toString()) : undefined,
            recipient_phone: order.recipient?.accountIdentifier,
            recipient_name: order.recipient?.accountName,
            currency: order.recipient?.currency
          });

          console.log('✅ WEBHOOK: Settlement record created for VALIDATED transaction');
        }
      }
      // Handle settled status (blockchain completion)
      else if (event === 'payment_order.settled' || order.status === 'settled') {
        console.log('🔗 WEBHOOK: Processing SETTLED order - blockchain completion:', {
          orderId: order.id,
          event: event,
          status: order.status,
          txHash: order.txHash
        });
        
        // Just update the database record - transaction was already successful at validated
        await orderService.updateOrderStatus(order.id, 'settled', {
          settled_at: new Date(),
          tx_hash: order.txHash,
          amount_paid: order.amountPaid ? parseFloat(order.amountPaid.toString()) : undefined
        });
      }
      // Handle other statuses
      else {
        console.log('📋 WEBHOOK: Updating order status:', {
          orderId: order.id,
          event: event,
          status: order.status
        });
        
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

async function handleOrderPending(order: PaycrestOrder) {
  // Order created, waiting for provider assignment (official PayCrest specification)
  console.log(`⏳ Order ${order.id} pending - waiting for provider assignment`);
  
  // Track pending event
  try {
    const dbOrder = await OrderService.getOrderByPaycrestId(order.id);
    if (dbOrder) {
      await AnalyticsService.trackEvent({
        event_name: 'order_pending',
        wallet_address: dbOrder.wallet_address,
        order_id: dbOrder.id,
        properties: {
          amount: dbOrder.amount,
          currency: dbOrder.currency,
          phone: order.recipient?.accountIdentifier
        }
      });
    }
  } catch (error) {
    console.error('Failed to track pending analytics:', error);
  }
}

async function handleOrderValidated(order: PaycrestOrder) {
  // Funds have been sent to recipient's bank/mobile network (TRANSACTION SUCCESS!)
  console.log(`🎉 Order ${order.id} validated - transaction successful!`);
  console.log(`✅ SUCCESS: Funds sent to recipient's bank/mobile network`, {
    orderId: order.id,
    amount: order.amount,
    amountPaid: order.amountPaid,
    recipient: order.recipient?.accountName,
    phone: order.recipient?.accountIdentifier,
    currency: order.recipient?.currency,
    timestamp: new Date().toISOString(),
    status: 'validated'
  });
  
  // Track success analytics - this is the main success event for PayCrest
  try {
    const dbOrder = await OrderService.getOrderByPaycrestId(order.id);
    if (dbOrder) {
      const settlementTime = Math.floor(
        (new Date().getTime() - new Date(dbOrder.created_at).getTime()) / 1000
      );
      
      // Track payment completion (validated = successful transaction)
      await AnalyticsService.trackPaymentCompleted(
        dbOrder.wallet_address,
        dbOrder.id,
        Number(dbOrder.amount),
        dbOrder.currency,
        settlementTime
      );
      
      // Track validation event
      await AnalyticsService.trackEvent({
        event_name: 'order_validated',
        wallet_address: dbOrder.wallet_address,
        order_id: dbOrder.id,
        properties: {
          amount: dbOrder.amount,
          currency: dbOrder.currency,
          settlementTimeSeconds: settlementTime,
          phone: order.recipient?.accountIdentifier,
          txHash: order.txHash,
          amountPaid: order.amountPaid
        }
      });
      
      console.log(`📊 Analytics tracked for validated payment:`, {
        orderId: order.id,
        walletAddress: dbOrder.wallet_address,
        amount: dbOrder.amount,
        currency: dbOrder.currency,
        settlementTimeSeconds: settlementTime,
        phone: order.recipient?.accountIdentifier
      });
    }
  } catch (error) {
    console.error('Failed to track validation analytics:', error);
  }
}

async function handleOrderSettled(order: PaycrestOrder) {
  // Order fully completed on blockchain (following official PayCrest specification)
  console.log(`🔗 Order ${order.id} settled - order fully completed on blockchain`);
  console.log('📋 NOTE: Blockchain completion event (transaction was already successful at validated status)');
  
  // Log blockchain completion for debugging
  console.log('🔗 BLOCKCHAIN: Order completed on blockchain', {
    orderId: order.id,
    amount: order.amount,
    txHash: order.txHash,
    recipient: order.recipient?.accountName,
    phone: order.recipient?.accountIdentifier,
    currency: order.recipient?.currency,
    timestamp: new Date().toISOString(),
    status: 'settled'
  });
  
  // Track blockchain settlement analytics (separate from transaction success)
  try {
    const dbOrder = await OrderService.getOrderByPaycrestId(order.id);
    if (dbOrder) {
      const settlementTime = Math.floor(
        (new Date().getTime() - new Date(dbOrder.created_at).getTime()) / 1000
      );
      
      // Track blockchain settlement event (not transaction success - that happened at validated)
      await AnalyticsService.trackEvent({
        event_name: 'order_blockchain_settled',
        wallet_address: dbOrder.wallet_address,
        order_id: dbOrder.id,
        properties: {
          amount: dbOrder.amount,
          currency: dbOrder.currency,
          settlementTimeSeconds: settlementTime,
          phone: order.recipient?.accountIdentifier,
          txHash: order.txHash,
          blockchain_completion: true
        }
      });
      
      console.log(`📊 Analytics tracked for blockchain settlement:`, {
        orderId: order.id,
        walletAddress: dbOrder.wallet_address,
        amount: dbOrder.amount,
        currency: dbOrder.currency,
        settlementTimeSeconds: settlementTime,
        phone: order.recipient?.accountIdentifier,
        txHash: order.txHash
      });
    }
  } catch (error) {
    console.error('Failed to track blockchain settlement analytics:', error);
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