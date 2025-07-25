import { NextRequest, NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; amount: string; fiat: string }> }
) {
  try {
    const { token, amount, fiat } = await params;
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') || 'base';
    
    if (!token || !amount || !fiat) {
      return NextResponse.json(
        { error: 'Token, amount, and fiat parameters are required' },
        { status: 400 }
      );
    }

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