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

    // Only generate receipts for completed orders
    if (order.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Receipt not available',
          message: 'Receipt can only be generated for completed transactions',
          status: order.status
        },
        { status: 400 }
      );
    }

    // Convert order to OrderData format
    const orderData: OrderData = {
      id: order.id,
      paycrest_order_id: order.paycrest_order_id,
      amount_in_usdc: order.amount_in_usdc,
      amount_in_local: order.amount_in_local,
      local_currency: order.local_currency,
      account_name: order.account_name || 'Unknown',
      phone_number: order.phone_number,
      account_number: order.account_number,
      bank_code: order.bank_code,
      bank_name: order.bank_name,
      wallet_address: order.wallet_address,
      rate: order.rate || 0,
      sender_fee: order.sender_fee || 0,
      transaction_fee: order.transaction_fee || 0,
      status: order.status as 'completed' | 'pending' | 'failed',
      created_at: order.created_at,
      blockchain_tx_hash: order.transaction_hash,
      pretium_receipt_number: order.pretium_receipt_number,
      pretium_transaction_code: order.pretium_transaction_code,
    };

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
