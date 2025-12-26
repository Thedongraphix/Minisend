import { NextRequest, NextResponse } from 'next/server';
import { calculateWrappedStats } from '@/lib/wrapped/stats';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate address format (basic Ethereum address validation)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Calculate wrapped stats with timeout protection
    const statsPromise = calculateWrappedStats(address);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout - please try again')), 15000)
    );

    const stats = await Promise.race([statsPromise, timeoutPromise]);

    // Check if stats were successfully calculated
    if (!stats) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to fetch stats at this time. Please try again.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      stats,
    }, {
      headers: {
        // Cache for 5 minutes for faster subsequent loads
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error calculating wrapped stats:', error);

    // Provide user-friendly error message
    const errorMessage = error instanceof Error && error.message.includes('timeout')
      ? 'Request timed out. Please refresh and try again.'
      : 'Unable to load your wrapped stats. Please try again in a moment.';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
