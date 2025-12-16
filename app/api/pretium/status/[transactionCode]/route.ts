import { NextRequest, NextResponse } from 'next/server';
import { pretiumClient } from '@/lib/pretium/client';
import { DatabaseService } from '@/lib/supabase/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionCode: string }> }
) {
  try {
    const { transactionCode } = await params;

    if (!transactionCode) {
      return NextResponse.json(
        { error: 'Transaction code is required' },
        { status: 400 }
      );
    }

    // Look up the order to get the currency
    const order = await DatabaseService.getOrderByPretiumTransactionCode(transactionCode);

    if (!order) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Get currency from the order (ensure it's a valid Pretium currency)
    const currency = 'local_currency' in order ? order.local_currency : 'KES';

    if (currency !== 'KES' && currency !== 'GHS' && currency !== 'NGN') {
      return NextResponse.json(
        { error: 'Invalid currency for Pretium transaction' },
        { status: 400 }
      );
    }

    const statusResponse = await pretiumClient.getTransactionStatus(transactionCode, currency);

    if (statusResponse.code !== 200) {
      return NextResponse.json(
        { error: statusResponse.message },
        { status: statusResponse.code }
      );
    }

    return NextResponse.json({
      success: true,
      transaction: statusResponse.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch transaction status',
      },
      { status: 500 }
    );
  }
}
