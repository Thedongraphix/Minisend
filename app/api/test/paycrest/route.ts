import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.PAYCREST_API_KEY;
    
    const baseUrl = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
    
    // Test rate API
    const rateResponse = await fetch(`${baseUrl}/rates/USDC/5/KES`, {
      headers: {
        'API-Key': apiKey!,
      },
    });

    const rateData = await rateResponse.json();

    return NextResponse.json({
      success: true,
      hasApiKey: !!apiKey,
      rateResponse: {
        status: rateResponse.status,
        data: rateData,
      },
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      hasApiKey: !!process.env.PAYCREST_API_KEY,
    });
  }
}