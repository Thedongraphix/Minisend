import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await DatabaseService.getDashboardStats();

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
