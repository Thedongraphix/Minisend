import { NextRequest, NextResponse } from 'next/server';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    let formattedPhone: string;
    let institution: string;

    if (currency === 'KES') {
      // Kenya phone number
      formattedPhone = cleanPhone.startsWith('254') ? cleanPhone : cleanPhone.replace(/^0/, '254');
      institution = 'MPESA';
    } else if (currency === 'NGN') {
      // Nigeria phone number
      formattedPhone = cleanPhone.startsWith('234') ? cleanPhone : cleanPhone.replace(/^0/, '234');
      institution = 'GTB'; // Default bank
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
        accountIdentifier: formattedPhone,
        accountName,
        currency,
      },
      reference: `order_${Date.now()}`,
      returnAddress,
    };

    const orderResponse = await fetch(`${PAYCREST_API_URL}/sender/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': PAYCREST_API_KEY!,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      throw new Error(errorData.message || 'Failed to create order');
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