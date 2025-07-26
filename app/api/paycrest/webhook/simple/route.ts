import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.PAYCREST_WEBHOOK_SECRET;

// Simple in-memory store for order status
const orderStatuses = new Map<string, {
  status: string;
  timestamp: string;
  data?: any;
}>();

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paycrest-signature');

    if (!signature || !WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 401 });
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature, WEBHOOK_SECRET)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(body);
    const { event, orderId, status, timestamp, data } = webhookData;

    console.log('📨 Webhook received:', { event, orderId, status });

    // Store order status
    orderStatuses.set(orderId, {
      status,
      timestamp,
      data,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Get order status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
  }

  const status = orderStatuses.get(orderId);
  
  if (!status) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    order: {
      id: orderId,
      status: status.status,
      timestamp: status.timestamp,
      data: status.data,
    },
  });
}