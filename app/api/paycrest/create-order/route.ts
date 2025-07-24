import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering and Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, phoneNumber, accountName, currency, provider } = body;

    // Validate required fields
    if (!amount || !phoneNumber || !accountName) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, phoneNumber, accountName' },
        { status: 400 }
      );
    }

    // Generate a mock order for testing
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const mockOrder = {
      id: orderId,
      receiveAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC contract
      amount: amount.toString(),
      senderFee: '0',
      transactionFee: '0.5',
      validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      status: 'payment_order.pending',
      recipient: {
        phoneNumber,
        accountName,
        provider: provider || 'M-Pesa',
        currency: currency || 'KES'
      }
    };

    console.log('Mock order created:', {
      orderId,
      amount,
      phoneNumber,
      accountName
    });

    return NextResponse.json({
      success: true,
      order: mockOrder,
      message: 'Order created successfully (test mode)',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Order creation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create order',
        success: false 
      },
      { status: 500 }
    );
  }
}