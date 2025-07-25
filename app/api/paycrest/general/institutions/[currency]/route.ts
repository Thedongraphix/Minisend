import { NextRequest, NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ currency: string }> }
) {
  try {
    const { currency } = await params;
    
    if (!currency) {
      return NextResponse.json(
        { error: 'Currency parameter is required' },
        { status: 400 }
      );
    }

    const paycrestService = await getPaycrestService();
    const institutions = await paycrestService.getInstitutions(currency);

    return NextResponse.json({
      success: true,
      data: institutions
    });

  } catch (error) {
    console.error('PayCrest institutions error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get institutions' },
      { status: 500 }
    );
  }
}