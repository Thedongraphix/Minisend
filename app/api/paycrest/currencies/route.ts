import { NextResponse } from 'next/server';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;

export async function GET() {
  try {
    // Fetch supported currencies from PayCrest API
    const response = await fetch(`${PAYCREST_API_URL}/currencies`, {
      headers: {
        'API-Key': PAYCREST_API_KEY!,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('PayCrest currencies API error:', response.status, errorData);
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch supported currencies',
          details: errorData?.message || `HTTP ${response.status}`,
        },
        { status: response.status }
      );
    }

    const currenciesData = await response.json();

    return NextResponse.json({
      success: true,
      currencies: currenciesData.data || currenciesData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Currencies API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching currencies' },
      { status: 500 }
    );
  }
}