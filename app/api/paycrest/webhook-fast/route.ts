import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paycrest-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify webhook signature
    const webhookSecret = process.env.PAYCREST_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== `sha256=${expectedSignature}`) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    
    // Handle different event types
    switch (event.event) {
      case 'order.validated':
        // Order has been validated and is being processed
        console.log('Order validated:', event.data.id);
        break;
        
      case 'order.settled':
        // Payment has been sent to recipient
        console.log('Order settled:', event.data.id);
        
        // TODO: Add real-time notification to user via WebSocket/SSE
        // For now, just log for immediate status updates
        break;
        
      case 'order.refunded':
        // Order was refunded
        console.log('Order refunded:', event.data.id);
        break;
        
      case 'order.expired':
        // Order expired
        console.log('Order expired:', event.data.id);
        break;
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}