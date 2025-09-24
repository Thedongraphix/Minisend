import { NextRequest, NextResponse } from 'next/server';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string; amount: string; currency: string }> }
) {
  try {
    const params = await context.params;
    const { token, amount, currency } = params;

    // Validate parameters
    if (!token || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required parameters: token, amount, currency' },
        { status: 400 }
      );
    }

    // Validate amount is a number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount parameter' },
        { status: 400 }
      );
    }

    // Validate supported tokens and currencies
    const supportedTokens = ['USDC', 'USDT', 'CUSD', 'CNGN'];
    const supportedCurrencies = ['KES', 'NGN'];

    if (!supportedTokens.includes(token.toUpperCase())) {
      return NextResponse.json(
        { error: `Unsupported token: ${token}. Supported tokens: ${supportedTokens.join(', ')}` },
        { status: 400 }
      );
    }

    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      return NextResponse.json(
        { error: `Unsupported currency: ${currency}. Supported currencies: ${supportedCurrencies.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch rate from PayCrest API
    const response = await fetch(`${PAYCREST_API_URL}/rates/${token}/${amount}/${currency}?network=base`, {
      headers: {
        'API-Key': PAYCREST_API_KEY!,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('PayCrest rates API error:', response.status, errorData);
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch exchange rate',
          details: errorData?.message || `HTTP ${response.status}`,
        },
        { status: response.status }
      );
    }

    const rateData = await response.json();

    // PayCrest API returns: { "status": "success", "message": "Rate fetched successfully", "data": "1250.50" }
    if (rateData.status === 'success' && rateData.data) {
      const rate = parseFloat(rateData.data);
      const localAmount = amountNum * rate;

      return NextResponse.json({
        success: true,
        rate: rate,
        token,
        amount: amountNum,
        currency,
        localAmount: parseFloat(localAmount.toFixed(2)),
        timestamp: new Date().toISOString(),
        validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Rate valid for 5 minutes
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid response from PayCrest rates API' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Rates API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching rates' },
      { status: 500 }
    );
  }
}