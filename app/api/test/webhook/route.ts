import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST() {
  try {
    // Test webhook signature verification
    const testPayload = {
      event: 'payment_order.validated',
      orderId: 'test-order-123',
      status: 'validated',
      timestamp: new Date().toISOString(),
      data: {
        id: 'test-order-123',
        status: 'validated',
        amount: '10',
        token: 'USDC',
        network: 'base',
        txHash: '0x123abc...',
        amountPaid: '10',
        recipient: {
          accountName: 'Test User',
          accountIdentifier: '254700000000',
          currency: 'KES'
        }
      }
    };

    const payloadString = JSON.stringify(testPayload);
    const secret = process.env.PAYCREST_API_SECRET;

    if (!secret) {
      return NextResponse.json({
        success: false,
        error: 'PAYCREST_API_SECRET not configured'
      });
    }

    // Create test signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    const signature = hmac.digest('hex');

    // Test webhook endpoint
    const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'https://minisend.xyz'}/api/paycrest/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Paycrest-Signature': signature,
      },
      body: payloadString,
    });

    const webhookResult = await webhookResponse.json();

    return NextResponse.json({
      success: true,
      webhookStatus: webhookResponse.status,
      webhookResponse: webhookResult,
      testPayload,
      signatureUsed: signature,
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}