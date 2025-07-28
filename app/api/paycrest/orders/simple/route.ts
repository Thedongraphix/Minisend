import { NextRequest, NextResponse } from 'next/server';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Check API key first
    if (!PAYCREST_API_KEY) {
      console.error('PAYCREST_API_SECRET not configured');
      return NextResponse.json(
        { error: 'PayCrest API secret not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('Received order request:', body);
    
    const { 
      amount, 
      phoneNumber, 
      accountName, 
      currency,
      returnAddress
    } = body;

    // Validate required fields
    if (!amount || !phoneNumber || !accountName || !currency || !returnAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get rate first
    const rateResponse = await fetch(`${PAYCREST_API_URL}/rates/USDC/${amount}/${currency}`, {
      headers: {
        'API-Key': PAYCREST_API_KEY!,
      },
    });

    if (!rateResponse.ok) {
      throw new Error('Failed to fetch rate');
    }

    const rateData = await rateResponse.json();
    const rate = parseFloat(rateData.data);

    // Format phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    let accountIdentifier: string;
    let institution: string;

    if (currency === 'KES') {
      // Kenya phone number
      accountIdentifier = cleanPhone.startsWith('254') ? cleanPhone : cleanPhone.replace(/^0/, '254');
      institution = 'SAFAKEPC'; // M-PESA code
    } else if (currency === 'NGN') {
      // Nigeria phone number  
      accountIdentifier = cleanPhone.startsWith('234') ? cleanPhone : cleanPhone.replace(/^0/, '234');
      institution = 'GTB'; // Default bank - need to check correct code
    } else {
      throw new Error('Unsupported currency');
    }

    // Create PayCrest order
    const orderData = {
      amount: amount.toString(),
      token: 'USDC',
      network: 'base',
      rate: rate.toString(),
      recipient: {
        institution,
        accountIdentifier,
        accountName,
        currency,
        memo: `Payment to ${accountName} - ${phoneNumber}`
      },
      reference: `order_${Date.now()}`,
      returnAddress,
    };

    console.log('Sending order to PayCrest:', JSON.stringify(orderData, null, 2));

    const orderResponse = await fetch(`${PAYCREST_API_URL}/sender/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': PAYCREST_API_KEY!,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json().catch(() => ({}));
      console.error('PayCrest API Error:', {
        status: orderResponse.status,
        statusText: orderResponse.statusText,
        errorData,
        orderData
      });
      throw new Error(errorData.message || `PayCrest API error: ${orderResponse.status}`);
    }

    const order = await orderResponse.json();

    return NextResponse.json({
      success: true,
      order: order.data,
    });

  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    );
  }
}