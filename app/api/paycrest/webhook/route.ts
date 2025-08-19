import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';
import crypto from 'crypto';

// Force dynamic rendering and Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PayCrest webhook event types as per documentation
interface PaycrestWebhookEvent {
  event: 'order.initiated' | 'order.pending' | 'order.validated' | 'order.settled' | 'order.refunded' | 'order.expired';
  orderId: string;
  status: string;
  timestamp: string;
  data: {
    txHash?: string;
    providerId?: string;
    settlementAmount?: string;
    [key: string]: any;
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
    
    console.log('📨 Webhook event received:', {
      event: webhookEvent.event,
      orderId: webhookEvent.orderId,
      status: webhookEvent.status,
      timestamp: webhookEvent.timestamp
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
  const { orderId, status: eventType, data } = event;
  
  try {
    // Get the order from database
    const dbOrder = await DatabaseService.getOrderByPaycrestId(orderId);
    
    if (!dbOrder) {
      console.log(`⚠️ Order ${orderId} not found in database - this may be from another system`);
      return;
    }

    console.log(`🔄 Processing webhook for order ${orderId}: ${eventType}`);

    // Map PayCrest webhook events to our order statuses
    let ourStatus = dbOrder.status;
    let shouldCreateSettlement = false;
    
    switch (event.event) {
      case 'order.initiated':
        // Order initiated via API (before Gateway creation)
        ourStatus = 'pending';
        console.log(`📝 Order ${orderId} initiated`);
        break;
        
      case 'order.pending':
        // Order awaiting provider assignment
        ourStatus = 'processing';
        console.log(`⏳ Order ${orderId} pending provider assignment`);
        break;
        
      case 'order.validated':
        // Funds have been sent to recipient's bank/mobile network (value transfer confirmed)
        // THIS IS WHEN THE USER SHOULD CONSIDER THE TRANSACTION SUCCESSFUL
        ourStatus = 'completed';
        shouldCreateSettlement = true;
        console.log(`✅ Order ${orderId} validated - funds delivered to recipient`);
        break;
        
      case 'order.settled':
        // Order fully completed on blockchain (provider received stablecoin)
        // This is separate from sender-to-recipient money flow
        ourStatus = 'completed';
        shouldCreateSettlement = true;
        console.log(`🏦 Order ${orderId} settled on blockchain`);
        break;
        
      case 'order.refunded':
        // Funds refunded to sender
        ourStatus = 'failed';
        console.log(`🔄 Order ${orderId} refunded to sender`);
        break;
        
      case 'order.expired':
        // Order expired without completion
        ourStatus = 'failed';
        console.log(`⏰ Order ${orderId} expired without completion`);
        break;
        
      default:
        console.log(`⚠️ Unknown webhook event type: ${event.event} for order ${orderId}`);
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
    if (shouldCreateSettlement && (event.event === 'order.validated' || event.event === 'order.settled')) {
      console.log(`💰 Creating settlement record for ${event.event} order ${orderId}`);
      
      try {
        await DatabaseService.createSettlement({
          order_id: dbOrder.id,
          paycrest_settlement_id: orderId,
          settlement_amount: data.settlementAmount || dbOrder.amount_in_local,
          settlement_currency: dbOrder.local_currency,
          settlement_method: dbOrder.carrier === 'MPESA' ? 'M-PESA' : 'Mobile Money',
          settled_at: new Date().toISOString(),
          provider_id: data.providerId
        });
        console.log(`✅ Settlement record created for ${orderId}`);
      } catch (settlementError) {
        console.error(`❌ Failed to create settlement for ${orderId}:`, settlementError);
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
      console.error(`❌ Failed to log webhook event for ${orderId}:`, logError);
    }

    console.log(`✅ Webhook event ${event.event} processed successfully for order ${orderId}`);

  } catch (error) {
    console.error(`❌ Error processing webhook for order ${orderId}:`, error);
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