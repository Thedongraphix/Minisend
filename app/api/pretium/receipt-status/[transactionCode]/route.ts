import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';

/**
 * Check if receipt is ready for a Pretium transaction
 * This endpoint helps with race conditions between blockchain confirmation and webhook processing
 */
export async function GET(
  _request: NextRequest,
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

    // Fetch order from database
    const order = await DatabaseService.getOrderByPretiumTransactionCode(transactionCode);

    if (!order) {
      return NextResponse.json(
        {
          ready: false,
          error: 'Order not found',
          status: 'not_found'
        },
        { status: 404 }
      );
    }

    // Check if receipt is ready
    const isReady = order.status === 'completed' && !!order.pretium_receipt_number;

    return NextResponse.json({
      ready: isReady,
      status: order.status,
      hasReceiptNumber: !!order.pretium_receipt_number,
      receiptNumber: order.pretium_receipt_number,
      transactionCode: order.pretium_transaction_code,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ready: false,
        error: 'Failed to check receipt status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
