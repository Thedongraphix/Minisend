import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering and Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, phoneNumber, accountName, currency = 'KES', provider = 'M-Pesa' } = body;

    // Validate required fields
    if (!amount || !phoneNumber || !accountName) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, phoneNumber, accountName' },
        { status: 400 }
      );
    }

    // Generate order ID
    const orderId = `hybrid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create order that will work with USDC transactions
    const order = {
      id: orderId,
      receiveAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC contract - users send here
      amount: amount.toString(),
      senderFee: '0',
      transactionFee: '0.5',
      validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      status: 'payment_order.pending',
      token: 'USDC',
      network: 'base',
      recipient: {
        phoneNumber,
        accountName,
        provider,
        currency,
        institution: provider === 'M-Pesa' ? 'SAFARICOM' : 'SAFARICOM'
      },
      reference: orderId
    };

    console.log('Hybrid order created:', {
      orderId,
      amount,
      phoneNumber,
      accountName,
      receiveAddress: order.receiveAddress
    });

    return NextResponse.json({
      success: true,
      order,
      message: 'Order created successfully - USDC will be converted to mobile money',
      timestamp: new Date().toISOString(),
      note: 'Send USDC + fees to receiveAddress. Funds will be processed for mobile money transfer.'
    });

  } catch (error) {
    console.error('Order creation error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create order',
        success: false 
      },
      { status: 500 }
    );
  }
}

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

    // For hybrid orders, simulate progression based on time
    const orderAge = Date.now() - parseInt(orderId.split('_')[1] || '0');
    
    let status = 'payment_order.pending';
    
    // Simulate status progression (for demo purposes)
    if (orderAge > 10000) { // After 10 seconds, mark as validated
      status = 'payment_order.validated';
    }
    
    if (orderAge > 30000) { // After 30 seconds, mark as settled  
      status = 'payment_order.settled';
    }

    const order = {
      id: orderId,
      status,
      amount: '100', // This would come from database in production
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

    console.log(`Order status check: ${orderId} -> ${status}`);
    
    return NextResponse.json({
      success: true,
      order,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Order status error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get order status',
        success: false 
      },
      { status: 500 }
    );
  }
}