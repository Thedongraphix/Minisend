import { NextRequest, NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; fiat: string }> }
) {
  try {
    const { token, fiat } = await params;
    
    if (!token || !fiat) {
      return NextResponse.json(
        { error: 'Token and fiat parameters are required' },
        { status: 400 }
      );
    }

    const paycrestService = await getPaycrestService();
    const rates = await paycrestService.getProviderRates(token, fiat);

    return NextResponse.json({
      success: true,
      data: rates
    });

  } catch (error) {
    console.error('PayCrest provider rates error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get provider rates' },
      { status: 500 }
    );
  }
}