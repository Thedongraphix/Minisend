import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering and Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, phoneNumber, accountName, currency = 'KES', provider = 'M-Pesa', returnAddress } = body;

    // Validate required fields exactly as per PayCrest docs
    if (!amount || !phoneNumber || !accountName || !returnAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, phoneNumber, accountName, returnAddress' },
        { status: 400 }
      );
    }

    // Get PayCrest configuration exactly as per docs
    const clientId = process.env.PAYCREST_API_KEY; // This is YOUR_CLIENT_ID
    const baseUrl = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io';

    if (!clientId) {
      return NextResponse.json(
        { error: 'PayCrest Client ID not configured' },
        { status: 500 }
      );
    }

    // Get current rates from PayCrest API using new format
    const ratesResponse = await fetch(`${baseUrl}/v1/rates/USDC/${amount}/${currency}?network=base`, {
      headers: {
        'API-Key': clientId,
      },
    });

    let currentRate = "1.0"; // fallback rate
    if (ratesResponse.ok) {
      try {
        const ratesData = await ratesResponse.json();
        currentRate = ratesData.data || ratesData.rate || currentRate;
        console.log('Retrieved PayCrest rate:', currentRate);
      } catch {
        console.warn('Failed to parse rates response, using fallback rate');
      }
    } else {
      console.warn('Failed to get rates from PayCrest, using fallback rate');
    }

    // Map provider to institution exactly as per PayCrest standards
    let institution;
    if (currency === 'KES') {
      institution = provider === 'M-Pesa' ? 'SAFAKEPC' : 'SAFAKEPC'; // Correct code for Kenyan M-Pesa
    } else if (currency === 'NGN') {
      institution = 'GTB'; // As per their example
    } else {
      institution = 'SAFAKEPC'; // Default fallback for Kenya
    }

    // Create PayCrest order request EXACTLY as per documentation
    const orderRequest = {
      amount: amount.toString(),
      token: "USDC", // Using USDC as per your app
      network: "base",
      rate: currentRate, // Dynamic rate from PayCrest API
      recipient: {
        institution: institution,
        accountIdentifier: phoneNumber,
        accountName: accountName,
        currency: currency,
        memo: `USDC to ${currency} conversion via Minisend`
      },
      reference: `minisend-${Date.now()}`,
      returnAddress: returnAddress
    };

    console.log('PayCrest order request (using working orders endpoint):', {
      url: `${baseUrl}/v1/orders`,
      headers: { 'API-Key': clientId.substring(0, 8) + '...' },
      body: orderRequest
    });

    // Call PayCrest API using working orders endpoint 
    const paycrestResponse = await fetch(`${baseUrl}/v1/orders`, {
      method: 'POST',
      headers: {
        'API-Key': clientId, // Exactly as per docs: "API-Key: YOUR_CLIENT_ID"
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderRequest),
    });

    const responseText = await paycrestResponse.text();
    console.log('PayCrest raw response:', {
      status: paycrestResponse.status,
      statusText: paycrestResponse.statusText,
      body: responseText
    });

    if (!paycrestResponse.ok) {
      return NextResponse.json(
        { 
          error: `PayCrest API error: ${paycrestResponse.status} ${paycrestResponse.statusText}`,
          details: responseText,
          request: orderRequest
        },
        { status: paycrestResponse.status }
      );
    }

    let paycrestOrder;
    try {
      paycrestOrder = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { 
          error: 'Invalid JSON response from PayCrest',
          response: responseText
        },
        { status: 500 }
      );
    }
    
    console.log('PayCrest order created successfully:', paycrestOrder);
    console.log('PayCrest order keys:', Object.keys(paycrestOrder));
    console.log('PayCrest order structure:', JSON.stringify(paycrestOrder, null, 2));

    return NextResponse.json({
      success: true,
      order: paycrestOrder,
      message: 'Order created successfully via PayCrest API',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('PayCrest order creation error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create PayCrest order',
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

    const clientId = process.env.PAYCREST_API_KEY;
    const baseUrl = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io';

    if (!clientId) {
      return NextResponse.json(
        { error: 'PayCrest Client ID not configured' },
        { status: 500 }
      );
    }

    console.log('Getting PayCrest order status:', {
      url: `${baseUrl}/v1/orders/${orderId}`,
      clientId: clientId.substring(0, 8) + '...'
    });

    // Get order status using working orders endpoint
    const paycrestResponse = await fetch(`${baseUrl}/v1/orders/${orderId}`, {
      headers: {
        'API-Key': clientId, // Exactly as per docs
      },
    });

    const responseText = await paycrestResponse.text();
    console.log('PayCrest status response:', {
      status: paycrestResponse.status,
      body: responseText
    });

    if (!paycrestResponse.ok) {
      return NextResponse.json(
        { 
          error: `PayCrest API error: ${paycrestResponse.status}`,
          details: responseText
        },
        { status: paycrestResponse.status }
      );
    }

    let order;
    try {
      order = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { 
          error: 'Invalid JSON response from PayCrest',
          response: responseText
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      order,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('PayCrest order status error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get order status',
        success: false 
      },
      { status: 500 }
    );
  }
}