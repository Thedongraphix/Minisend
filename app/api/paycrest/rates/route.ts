import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering and Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || 'USDC';
    const amount = searchParams.get('amount') || '1';
    const currency = searchParams.get('currency') || 'KES';
    const network = searchParams.get('network') || 'base';

    // Get PayCrest configuration
    const clientId = process.env.PAYCREST_API_KEY;
    const baseUrl = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io';

    if (!clientId) {
      return NextResponse.json(
        { error: 'PayCrest Client ID not configured' },
        { status: 500 }
      );
    }

    console.log('Getting PayCrest rates:', {
      url: `${baseUrl}/v1/rates/${token}/${amount}/${currency}?network=${network}`,
      token,
      amount,
      currency,
      network
    });

    // Get rates from PayCrest API using new format
    const paycrestResponse = await fetch(`${baseUrl}/v1/rates/${token}/${amount}/${currency}?network=${network}`, {
      headers: {
        'API-Key': clientId,
      },
    });

    const responseText = await paycrestResponse.text();
    console.log('PayCrest rates response:', {
      status: paycrestResponse.status,
      body: responseText
    });

    if (!paycrestResponse.ok) {
      return NextResponse.json(
        { 
          error: `PayCrest rates API error: ${paycrestResponse.status}`,
          details: responseText
        },
        { status: paycrestResponse.status }
      );
    }

    let rates;
    try {
      rates = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { 
          error: 'Invalid JSON response from PayCrest rates API',
          response: responseText
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      rates,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('PayCrest rates error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get PayCrest rates',
        success: false 
      },
      { status: 500 }
    );
  }
}