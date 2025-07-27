import { NextRequest, NextResponse } from 'next/server';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ currency: string }> }
) {
  try {
    const params = await context.params;
    const { currency } = params;

    // Validate currency parameter
    if (!currency) {
      return NextResponse.json(
        { error: 'Missing required parameter: currency' },
        { status: 400 }
      );
    }

    // Validate supported currencies
    const supportedCurrencies = ['KES', 'NGN'];
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      return NextResponse.json(
        { error: `Unsupported currency: ${currency}. Supported currencies: ${supportedCurrencies.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch institutions from PayCrest API
    const response = await fetch(`${PAYCREST_API_URL}/institutions/${currency}`, {
      headers: {
        'API-Key': PAYCREST_API_KEY!,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('PayCrest institutions API error:', response.status, errorData);
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch supported institutions',
          details: errorData?.message || `HTTP ${response.status}`,
        },
        { status: response.status }
      );
    }

    const institutionsData = await response.json();

    return NextResponse.json({
      success: true,
      currency: currency.toUpperCase(),
      institutions: institutionsData.data || institutionsData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Institutions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching institutions' },
      { status: 500 }
    );
  }
}