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

    // Check if API key is configured
    if (!PAYCREST_API_KEY) {
      return NextResponse.json(
        { error: 'PayCrest API key not configured' },
        { status: 500 }
      );
    }

    // Fetch rate from PayCrest API
    // According to PayCrest API docs: GET /rates/{token}/{amount}/{fiat}?network=base
    // Note: The /rates endpoint is currently experiencing issues, so we use /currencies as fallback
    let rateData;

    try {
      // Try the rates endpoint first
      const ratesResponse = await fetch(
        `${PAYCREST_API_URL}/rates/${token.toUpperCase()}/${amount}/${currency.toUpperCase()}?network=base`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (ratesResponse.ok) {
        rateData = await ratesResponse.json();
      } else {
        throw new Error('Rates endpoint failed');
      }
    } catch {
      // Fallback to currencies endpoint which provides market rates
      const currenciesResponse = await fetch(`${PAYCREST_API_URL}/currencies`, {
        method: 'GET',
        headers: {
          'API-Key': PAYCREST_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!currenciesResponse.ok) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch exchange rate',
            details: `Both rates and currencies endpoints failed`,
          },
          { status: 500 }
        );
      }

      const currenciesData = await currenciesResponse.json();

      if (currenciesData.status === 'success' && currenciesData.data) {
        const currencyInfo = currenciesData.data.find(
          (c: { code: string; marketRate: string }) => c.code === currency.toUpperCase()
        );

        if (currencyInfo && currencyInfo.marketRate) {
          // Transform to expected format
          rateData = {
            status: 'success',
            message: 'Rate fetched from currencies endpoint',
            data: currencyInfo.marketRate,
          };
        } else {
          return NextResponse.json(
            {
              success: false,
              error: 'Currency not found in currencies endpoint',
            },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid response from currencies endpoint',
          },
          { status: 500 }
        );
      }
    }

    // PayCrest API returns: { "status": "success", "message": "Rate fetched successfully", "data": "1250.50" }
    // According to API docs, the response format is consistent
    if (rateData.status === 'success' && rateData.data) {
      const rate = parseFloat(rateData.data);

      // Validate the rate is a valid number
      if (isNaN(rate) || rate <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid rate received from PayCrest API',
            details: `Received rate: ${rateData.data}`,
          },
          { status: 500 }
        );
      }

      const localAmount = amountNum * rate;

      return NextResponse.json({
        success: true,
        rate: rate,
        token: token.toUpperCase(),
        amount: amountNum,
        currency: currency.toUpperCase(),
        localAmount: parseFloat(localAmount.toFixed(2)),
        timestamp: new Date().toISOString(),
        validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Rate valid for 5 minutes
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid response from PayCrest rates API',
          details: `Status: ${rateData.status}, Data: ${JSON.stringify(rateData.data)}`,
        },
        { status: 500 }
      );
    }

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while fetching rates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}