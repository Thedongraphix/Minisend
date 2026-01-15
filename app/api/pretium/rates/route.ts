import { NextRequest, NextResponse } from 'next/server';
import { pretiumClient } from '@/lib/pretium/client';
import { isCurrencySupported } from '@/lib/pretium/config';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currency = searchParams.get('currency') || 'KES';

    // Validate currency is supported
    if (!isCurrencySupported(currency)) {
      return NextResponse.json(
        { error: `Currency ${currency} is not supported. Supported currencies: KES, GHS, NGN, UGX` },
        { status: 400 }
      );
    }

    const rateResponse = await pretiumClient.getExchangeRate(currency);

    if (rateResponse.code !== 200) {
      return NextResponse.json(
        { error: rateResponse.message },
        { status: rateResponse.code }
      );
    }

    // Use buying_rate for offramp (we're buying local currency from Pretium)
    const buyingRate = rateResponse.data.buying_rate;

    return NextResponse.json({
      success: true,
      currency,
      rates: {
        ...rateResponse.data,
        quoted_rate: buyingRate, // Use buying_rate only
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch exchange rate',
      },
      { status: 500 }
    );
  }
}
