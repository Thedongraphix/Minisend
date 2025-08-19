import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { network, txHash } = await request.json();

    if (!network || !txHash) {
      return NextResponse.json(
        { error: 'Network and transaction hash are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.PAYCREST_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'PayCrest API key not configured' },
        { status: 500 }
      );
    }

    console.log(`Reindexing transaction ${txHash} on ${network}...`);

    const response = await fetch(`https://api.paycrest.io/v1/reindex/${network}/${txHash}`, {
      method: 'GET',
      headers: {
        'API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayCrest reindex error:', data);
      return NextResponse.json(
        { 
          error: 'Failed to reindex transaction', 
          details: data 
        },
        { status: response.status }
      );
    }

    console.log('✅ Reindex response:', data);

    return NextResponse.json({
      success: true,
      message: `Transaction ${txHash} reindexed successfully on ${network}`,
      data
    });

  } catch (error) {
    console.error('Reindex API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during reindex' },
      { status: 500 }
    );
  }
}