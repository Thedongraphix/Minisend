import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering and Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Mock response for testing - in production this would call PayCrest
    const mockOrder = {
      id: orderId,
      status: 'payment_order.pending', // Will change to validated after 30 seconds
      amount: '100',
      token: 'USDC',
      network: 'base',
      recipient: {
        institution: 'SAFARICOM',
        accountIdentifier: '254712345678',
        accountName: 'Test User',
        currency: 'KES'
      },
      receiveAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      senderFee: '0',
      transactionFee: '0.5'
    };

    return NextResponse.json({
      success: true,
      order: mockOrder,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Status check error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get transaction status',
        success: false 
      },
      { status: 500 }
    );
  }
}