import { NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const paycrestService = await getPaycrestService();
    const stats = await paycrestService.getSenderStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('PayCrest sender stats error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get sender stats' },
      { status: 500 }
    );
  }
}