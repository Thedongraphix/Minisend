import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';
import crypto from 'crypto';

// Force dynamic rendering and Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PayCrest webhook event types - ACTUAL format (differs from apiguide.md)
// The documentation shows a different structure, but this is what PayCrest actually sends
interface PaycrestWebhookEvent {
  event: string; // e.g., 'payment_order.pending', 'payment_order.validated', etc.
  data: {
    id: string; // Order ID
    status: string; // Order status
    amount: string;
    amountInUsd: string;
    amountPaid: string;
    rate: string;
    network: string;
    txHash?: string;
    providerId?: string;
    reference: string;
    updatedAt: string;
    createdAt: string;
    recipient: {
      institution: string;
      accountIdentifier: string;
      accountName: string;
      currency: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

function verifyPaycrestSignature(requestBody: string, signatureHeader: string, secretKey: string): boolean {
  try {
    const calculatedSignature = calculateHmacSignature(requestBody, secretKey);
    return signatureHeader === calculatedSignature;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

function calculateHmacSignature(data: string, secretKey: string): string {
  const key = Buffer.from(secretKey);
  const hash = crypto.createHmac('sha256', key);
  hash.update(data);
  return hash.digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Webhook received from PayCrest');
    
    // Get the raw body as text for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('X-Paycrest-Signature');
    
    if (!signature) {
      console.error('❌ Missing X-Paycrest-Signature header');
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }

    // Verify signature with API secret
    const apiSecret = process.env.PAYCREST_API_SECRET || process.env.PAYCREST_API_KEY;
    if (!apiSecret) {
      console.error('❌ PayCrest API secret not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!verifyPaycrestSignature(rawBody, signature, apiSecret)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('✅ Webhook signature verified');

    // Parse the webhook payload
    const webhookEvent: PaycrestWebhookEvent = JSON.parse(rawBody);

    // Log the FULL raw payload for debugging
    console.log('📨 Full webhook payload:', JSON.stringify(webhookEvent, null, 2));

    console.log('📨 Webhook event received:', {
      event: webhookEvent.event,
      orderId: webhookEvent.data.id,
      status: webhookEvent.data.status,
      reference: webhookEvent.data.reference
    });

    // Handle the webhook event
    await handleWebhookEvent(webhookEvent);

    // Respond with success
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleWebhookEvent(event: PaycrestWebhookEvent) {
  // Extract data from actual PayCrest webhook structure
  const orderId = event.data.id;
  const eventType = event.data.status;
  const data = event.data;

  try {
    // Get the order from database
    const dbOrder = await DatabaseService.getOrderByPaycrestId(orderId);

    if (!dbOrder) {
      console.log(`⚠️ Order not found in database - this may be from another system`);
      return;
    }

    console.log(`🔄 Processing webhook: ${event.event} with status ${eventType}`);

    // Map PayCrest webhook events to our order statuses
    let ourStatus = dbOrder.status;
    let shouldCreateSettlement = false;

    // Normalize event name: 'payment_order.X' -> 'order.X'
    const normalizedEvent = event.event.replace('payment_order.', 'order.');

    // Map PayCrest webhook events to our order statuses
    switch (normalizedEvent) {
      case 'order.initiated':
        // Order initiated via API (before Gateway creation)
        ourStatus = 'pending';
        console.log(`📝 Order initiated via API`);
        break;

      case 'order.pending':
        // Order awaiting provider assignment
        ourStatus = 'processing';
        console.log(`⏳ Order awaiting provider assignment`);
        break;

      case 'order.validated':
        // Order validated and ready for settlement
        // THIS IS WHEN THE USER SHOULD CONSIDER THE TRANSACTION SUCCESSFUL
        ourStatus = 'completed';
        shouldCreateSettlement = true;
        console.log(`✅ Order validated and ready for settlement`);
        break;

      case 'order.settled':
        // Order settled on blockchain
        ourStatus = 'completed';
        shouldCreateSettlement = true;
        console.log(`🏦 Order settled on blockchain`);
        break;

      case 'order.refunded':
        // Order refunded to sender
        ourStatus = 'failed';
        console.log(`🔄 Order refunded to sender`);
        break;

      case 'order.expired':
        // Order expired because no transfer was made to the receive address within the time limit
        ourStatus = 'failed';
        console.log(`⏰ Order expired - no transfer made within time limit`);
        break;

      default:
        console.log(`⚠️ Unknown webhook event type: ${event.event}`);
        return;
    }

    // Update order status in database
    await DatabaseService.updateOrderStatus(
      orderId,
      ourStatus,
      eventType, // Store the PayCrest event type as paycrest_status
      {
        transaction_hash: data.txHash,
        completed_at: shouldCreateSettlement ? new Date().toISOString() : undefined,
        provider_id: data.providerId,
        webhook_received_at: new Date().toISOString()
      }
    );

    // Create settlement record for validated/settled orders
    if (shouldCreateSettlement && (normalizedEvent === 'order.validated' || normalizedEvent === 'order.settled')) {
      console.log(`💰 Creating settlement record for ${event.event}`);

      try {
        // Calculate settlement amount from webhook data
        const settlementAmount = parseFloat(data.amountPaid || data.amount || dbOrder.amount_in_local.toString());

        await DatabaseService.createSettlement({
          order_id: dbOrder.id,
          paycrest_settlement_id: orderId,
          settlement_amount: settlementAmount,
          settlement_currency: data.recipient.currency,
          settlement_method: dbOrder.carrier === 'MPESA' ? 'M-PESA' : 'Mobile Money',
          settled_at: new Date().toISOString()
        });
        console.log(`✅ Settlement record created`);
      } catch (settlementError) {
        console.error(`❌ Failed to create settlement:`, settlementError);
      }
    }

    // Log the webhook event for debugging
    try {
      await DatabaseService.logPollingAttempt(
        dbOrder.id,
        orderId,
        0, // 0 indicates webhook (not polling)
        eventType,
        {
          webhook_event: event.event,
          webhook_data: data,
          processed_at: new Date().toISOString()
        }
      );
    } catch (logError) {
      console.error(`❌ Failed to log webhook event:`, logError);
    }

    console.log(`✅ Webhook event ${event.event} processed successfully`);

  } catch (error) {
    console.error(`❌ Error processing webhook:`, error);
    throw error;
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'PayCrest webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}