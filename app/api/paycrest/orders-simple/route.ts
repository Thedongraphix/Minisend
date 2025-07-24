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

    // Get PayCrest configuration
    const apiKey = process.env.PAYCREST_API_KEY;
    const baseUrl = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'PayCrest API key not configured' },
        { status: 500 }
      );
    }

    // Create PayCrest order request
    const orderRequest = {
      amount: amount.toString(),
      token: 'USDC',
      network: 'base',
      rate: '130', // KES rate for testing
      recipient: {
        institution: provider === 'M-Pesa' ? 'SAFARICOM' : 'MPESA',
        accountIdentifier: phoneNumber,
        accountName,
        currency,
        memo: `USDC to ${currency} conversion`
      },
      reference: `order_${Date.now()}`,
      returnAddress: '0x1234567890123456789012345678901234567890'
    };

    console.log('Creating PayCrest order:', orderRequest);

    // Call PayCrest API
    const paycrestResponse = await fetch(`${baseUrl}/v1/orders`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderRequest),
    });

    if (!paycrestResponse.ok) {
      const errorText = await paycrestResponse.text();
      console.error('PayCrest API error:', errorText);
      return NextResponse.json(
        { error: `PayCrest API error: ${paycrestResponse.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const paycrestOrder = await paycrestResponse.json();
    
    console.log('PayCrest order created:', paycrestOrder);

    return NextResponse.json({
      success: true,
      order: paycrestOrder,
      message: 'Order created successfully',
      timestamp: new Date().toISOString()
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

    // Get PayCrest configuration
    const apiKey = process.env.PAYCREST_API_KEY;
    const baseUrl = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'PayCrest API key not configured' },
        { status: 500 }
      );
    }

    // Get order status from PayCrest
    const paycrestResponse = await fetch(`${baseUrl}/v1/orders/${orderId}`, {
      headers: {
        'API-Key': apiKey,
      },
    });

    if (!paycrestResponse.ok) {
      const errorText = await paycrestResponse.text();
      console.error('PayCrest status error:', errorText);
      return NextResponse.json(
        { error: `PayCrest API error: ${paycrestResponse.status}` },
        { status: 500 }
      );
    }

    const order = await paycrestResponse.json();
    
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