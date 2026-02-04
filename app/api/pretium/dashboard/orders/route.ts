import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status')?.split(',').filter(Boolean) || undefined,
      paymentType: searchParams.get('payment_type')?.split(',').filter(Boolean) || undefined,
      provider: (searchParams.get('provider') as 'all' | 'pretium' | 'paycrest') || 'all',
      currency: searchParams.get('currency')?.split(',').filter(Boolean) || undefined,
      startDate: searchParams.get('start_date') || undefined,
      endDate: searchParams.get('end_date') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 200),
    };

    const result = await DatabaseService.getUnifiedFilteredOrders(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching dashboard orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard orders' },
      { status: 500 }
    );
  }
}
