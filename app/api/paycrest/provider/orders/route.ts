import { NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const paycrestService = await getPaycrestService();
    const orders = await paycrestService.getProviderOrders();

    return NextResponse.json({
      success: true,
      data: orders
    });

  } catch (error) {
    console.error('PayCrest provider orders error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get provider orders' },
      { status: 500 }
    );
  }
}