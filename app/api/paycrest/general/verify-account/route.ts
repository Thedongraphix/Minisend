import { NextRequest, NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const paycrestService = await getPaycrestService();
    const verification = await paycrestService.verifyBankAccount(body);

    return NextResponse.json({
      success: true,
      data: verification
    });

  } catch (error) {
    console.error('PayCrest account verification error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to verify account' },
      { status: 500 }
    );
  }
}