import { NextRequest, NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';
import { PaycrestWebhookEvent, PaycrestOrder } from '@/lib/paycrest';
import { WebhookService } from '@/lib/supabase/webhooks';
import { OrderService } from '@/lib/supabase/orders';
import { AnalyticsService } from '@/lib/supabase/analytics';

export async function POST(request: NextRequest) {
  try {
    // Get the signature from headers
    const signature = request.headers.get('x-paycrest-signature');
    
    if (!signature) {
      console.error('PayCrest webhook: Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
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
    
    console.log(`PayCrest webhook received: ${event} for order ${order.id}`, {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      token: order.token,
      network: order.network,
      reference: order.reference,
      recipient: order.recipient
    });

    // Handle different order status events (updated for correct Paycrest format)
    switch (order.status) {
      case 'payment_order.pending':
        console.log(`Order ${order.id} is pending provider assignment`);
        await handleOrderPending(order);
        break;
        
      case 'payment_order.validated':
        console.log(`Order ${order.id} validated - funds sent to recipient`);
        await handleOrderValidated(order);
        break;
        
      case 'payment_order.settled':
        console.log(`Order ${order.id} settled - completed on blockchain`);
        await handleOrderSettled(order);
        break;
        
      case 'payment_order.refunded':
        console.log(`Order ${order.id} refunded to sender`);
        await handleOrderRefunded(order);
        break;
        
      case 'payment_order.expired':
        console.log(`Order ${order.id} expired without completion`);
        await handleOrderExpired(order);
        break;
        
      default:
        console.log(`Unknown order status: ${order.status} for order ${order.id}`);
    }

    // Store webhook event in database
    const webhookEventId = await WebhookService.storeWebhookEvent({
      event_type: event,
      paycrest_order_id: order.id,
      payload: webhookEvent,
      signature,
      headers: Object.fromEntries(request.headers.entries()),
      user_agent: request.headers.get('user-agent')
    });

    // Update order status in database
    try {
      await OrderService.updateOrderStatus(order.id, order.status);
      await WebhookService.markWebhookProcessed(webhookEventId.id, true);
    } catch (dbError) {
      console.error('Database update failed:', dbError);
      await WebhookService.markWebhookProcessed(
        webhookEventId.id, 
        false, 
        dbError instanceof Error ? dbError.message : 'Database update failed'
      );
    }

    return NextResponse.json(
      { message: 'Webhook received successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('PayCrest webhook processing error:', error);
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleOrderPending(order: PaycrestOrder) {
  // Order created, waiting for provider assignment
  // You might want to update UI status or notify user
  console.log(`Order ${order.id} is pending, waiting for provider assignment`);
}

async function handleOrderValidated(order: PaycrestOrder) {
  // Funds have been sent to recipient's bank/mobile network
  // This is when you can consider the transaction successful from user perspective
  console.log(`Order ${order.id} validated - recipient should have received funds`);
  
  // Log success for debugging the 50% stuck issue
  console.log('SUCCESS: Transaction completed successfully!', {
    orderId: order.id,
    amount: order.amount,
    recipient: order.recipient?.accountName,
    phone: order.recipient?.accountIdentifier,
    timestamp: new Date().toISOString()
  });
  
  // Track analytics event
  try {
    const dbOrder = await OrderService.getOrderByPaycrestId(order.id);
    if (dbOrder) {
      await AnalyticsService.trackPaymentCompleted(
        dbOrder.wallet_address,
        dbOrder.id,
        Number(dbOrder.amount),
        dbOrder.currency,
        0 // Settlement time - could be calculated from created_at to now
      );
    }
  } catch (error) {
    console.error('Failed to track payment completion analytics:', error);
  }
}

async function handleOrderSettled(order: PaycrestOrder) {
  // Order fully completed on blockchain
  // Provider has received the stablecoin
  console.log(`Order ${order.id} settled on blockchain`);
  
  // Track settlement analytics
  try {
    const dbOrder = await OrderService.getOrderByPaycrestId(order.id);
    if (dbOrder) {
      await AnalyticsService.trackEvent({
        event_name: 'order_settled',
        wallet_address: dbOrder.wallet_address,
        order_id: dbOrder.id,
        properties: {
          amount: dbOrder.amount,
          currency: dbOrder.currency,
          settlement_time: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Failed to track settlement analytics:', error);
  }
}

async function handleOrderRefunded(order: PaycrestOrder) {
  // Funds refunded to sender
  // Something went wrong with the transaction
  console.log(`Order ${order.id} was refunded - transaction failed`);
  
  // TODO: Notify user of refund
  // TODO: Update transaction status
  // TODO: Handle refund logic
}

async function handleOrderExpired(order: PaycrestOrder) {
  // Order expired without completion
  // User didn't send funds within the time limit
  console.log(`Order ${order.id} expired - user didn't send funds in time`);
  
  // TODO: Notify user that order expired
  // TODO: Clean up any pending state
}