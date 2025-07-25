import { NextRequest, NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || 'USDC';
    const amount = searchParams.get('amount') || '1';
    const fiat = searchParams.get('fiat') || 'KES';
    const network = searchParams.get('network') || 'base';
    
    // Validate amount is a number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const paycrestService = await getPaycrestService();
    const rate = await paycrestService.getRates(token, amount, fiat, network);

    return NextResponse.json({
      success: true,
      data: {
        token,
        amount,
        fiat,
        network,
        rate,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('PayCrest rates error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get rates' },
      { status: 500 }
    );
  }
}