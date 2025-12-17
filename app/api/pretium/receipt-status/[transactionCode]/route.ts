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

    // Fetch order from pretium_orders table (with legacy fallback)
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

    // Handle both PretiumOrder (new) and Order (legacy) structures
    const isPretiumOrder = 'transaction_code' in order;

    const receiptNumber = isPretiumOrder
      ? order.receipt_number
      : order.pretium_receipt_number;

    const isReady = order.status === 'completed' && !!receiptNumber;

    const txCode = isPretiumOrder
      ? order.transaction_code
      : order.pretium_transaction_code;

    const recipientName = isPretiumOrder && order.public_name
      ? order.public_name
      : order.account_name;

    const amount = order.amount_in_local;
    const currency = order.local_currency;

    // Log receipt status check for debugging
    console.log('[Receipt-Status] Checking receipt readiness:', {
      transactionCode,
      currency,
      status: order.status,
      hasReceiptNumber: !!receiptNumber,
      receiptNumber,
      isReady,
      payment_type: isPretiumOrder ? order.payment_type : 'legacy'
    });

    return NextResponse.json({
      ready: isReady,
      status: order.status,
      hasReceiptNumber: !!receiptNumber,
      receiptNumber: receiptNumber,
      transactionCode: txCode,
      recipientName,
      amount,
      currency,
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
