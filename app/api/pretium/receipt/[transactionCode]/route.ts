import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';
import { generateReceiptPDF } from '@/lib/receipt-generator';
import type { OrderData } from '@/lib/types/order';

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
    const transactionFee = ('transaction_fee' in order ? order.transaction_fee : undefined) || 0;

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
    console.log('[Receipt API] Order data from database:', {
      receipt_number: receiptNumber,
      account_name: order.account_name,
      transaction_hash: transactionHash,
      status: order.status
    });

    // Convert order to OrderData format (handle both table structures)
    const orderData: OrderData = {
      id: order.id,
      paycrest_order_id: 'paycrest_order_id' in order ? order.paycrest_order_id : (txCode || transactionCode || ''),
      amount_in_usdc: order.amount_in_usdc,
      amount_in_local: order.amount_in_local,
      local_currency: order.local_currency,
      account_name: order.account_name || 'Unknown',
      phone_number: order.phone_number,
      account_number: 'account_number' in order ? order.account_number : undefined,
      bank_code: 'bank_code' in order ? order.bank_code : undefined,
      bank_name: 'bank_name' in order ? order.bank_name : undefined,
      wallet_address: order.wallet_address,
      rate: exchangeRate,
      sender_fee: order.sender_fee || 0,
      transaction_fee: transactionFee,
      status: order.status as 'completed' | 'pending' | 'failed',
      created_at: order.created_at,
      blockchain_tx_hash: transactionHash,
      pretium_receipt_number: receiptNumber,
      pretium_transaction_code: txCode,
      till_number: order.till_number,
      paybill_number: order.paybill_number,
      paybill_account: order.paybill_account,
    };

    console.log('[Receipt API] OrderData created with:', {
      pretium_receipt_number: orderData.pretium_receipt_number,
      account_name: orderData.account_name
    });

    // Generate PDF receipt
    const pdfBlob = await generateReceiptPDF(orderData);

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
