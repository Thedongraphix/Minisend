import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';
import { generateModernReceipt } from '@/lib/modern-receipt-generator';

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
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only generate receipts for completed orders with receipt data
    if (order.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Receipt not available',
          message: 'Receipt can only be generated for completed transactions',
          status: order.status,
          hint: 'Transaction is still being processed. Please wait a few moments.'
        },
        { status: 400 }
      );
    }

    // Handle both new pretium_orders and legacy orders table structures
    const receiptNumber = 'receipt_number' in order
      ? order.receipt_number
      : ('pretium_receipt_number' in order ? order.pretium_receipt_number : undefined);

    const txCode = 'transaction_code' in order
      ? order.transaction_code
      : ('pretium_transaction_code' in order ? order.pretium_transaction_code : undefined);

    const transactionHash = order.transaction_hash || '';
    const exchangeRate = ('exchange_rate' in order ? order.exchange_rate : order.rate) || 0;

    // Check if webhook data has been received
    if (!receiptNumber) {
      return NextResponse.json(
        {
          error: 'Receipt not ready',
          message: 'Waiting for payment confirmation',
          status: order.status,
          hint: 'The M-Pesa confirmation is still being processed. Please wait a moment and try again.'
        },
        { status: 400 }
      );
    }

    // Log the order data from database
    // Format date with time in appropriate timezone based on currency
    // KES (Kenya) → EAT (Africa/Nairobi), GHS (Ghana) → GMT (Africa/Accra)
    const timezone = order.local_currency === 'KES' ? 'Africa/Nairobi' : 'Africa/Accra';
    const dateObj = new Date(order.created_at);
    const date = dateObj.toLocaleDateString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const time = dateObj.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const dateTime = `${date} at ${time}`;

    // Generate modern receipt
    const pdfBlob = await generateModernReceipt({
      transactionCode: txCode || transactionCode,
      receiptNumber: receiptNumber || '',
      recipientName: order.public_name || order.account_name || 'Unknown',
      phoneNumber: order.phone_number,
      tillNumber: order.till_number,
      paybillNumber: order.paybill_number,
      paybillAccount: order.paybill_account,
      amount: order.amount_in_local,
      currency: order.local_currency,
      usdcAmount: order.amount_in_usdc,
      exchangeRate: exchangeRate,
      fee: order.sender_fee || 0,
      date: dateTime,
      walletAddress: order.wallet_address,
      txHash: transactionHash
    });

    // Convert blob to buffer for Next.js response
    const buffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Log analytics event
    await DatabaseService.logAnalyticsEvent('pretium_receipt_generated', order.wallet_address, {
      transaction_code: transactionCode,
      order_id: order.id,
    });

    // Return PDF with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="minisend-receipt-${transactionCode}.pdf"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Receipt generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate receipt',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
