import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering and Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking PayCrest order status for ${orderId}`);

    // Get order status from PayCrest API
    const paycrestApiKey = process.env.PAYCREST_API_KEY;
    const paycrestBaseUrl = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';

    if (!paycrestApiKey) {
      return NextResponse.json(
        { error: 'PayCrest API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${paycrestBaseUrl}/sender/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'API-Key': paycrestApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`PayCrest API error: ${response.status}`);
      return NextResponse.json(
        { error: 'Failed to get order status from PayCrest' },
        { status: response.status }
      );
    }

    const paycrestOrder = await response.json();
    console.log(`📊 PayCrest order status:`, {
      orderId,
      status: paycrestOrder.data?.status,
      response: paycrestOrder
    });

    const order = paycrestOrder.data;
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Simple response format
    const statusResponse = {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        amount: order.amount,
        token: order.token,
        network: order.network,
        currency: order.recipient?.currency || 'KES',
        recipient: order.recipient,
        reference: order.reference,
        receiveAddress: order.receiveAddress,
        validUntil: order.validUntil,
        senderFee: order.senderFee,
        transactionFee: order.transactionFee,
        // Settlement flags
        isSettled: ['fulfilled', 'validated', 'settled'].includes(order.status),
        isFailed: ['refunded', 'expired', 'cancelled'].includes(order.status),
        isProcessing: ['pending', 'processing'].includes(order.status)
      }
    };

    console.log(`✅ Order status response for ${orderId}:`, {
      status: order.status,
      isSettled: statusResponse.order.isSettled,
      isFailed: statusResponse.order.isFailed
    });

    return NextResponse.json(statusResponse);

  } catch (error) {
    console.error('Order status check error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get order status' },
      { status: 500 }
    );
  }
}