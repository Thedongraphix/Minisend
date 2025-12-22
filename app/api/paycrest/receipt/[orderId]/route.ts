import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';
import { generateModernReceipt } from '@/lib/modern-receipt-generator';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Fetch order from database
    const order = await DatabaseService.getOrderByPaycrestId(orderId);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only generate receipts for validated or settled orders
    if (!['validated', 'settled', 'completed'].includes(order.status)) {
      return NextResponse.json(
        {
          error: 'Receipt not available',
          message: 'Receipt can only be generated for delivered payments',
          status: order.status,
          hint: 'Payment is still being processed. Please wait a few moments.'
        },
        { status: 400 }
      );
    }

    // Format date
    const date = new Date(order.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate modern receipt
    const pdfBlob = await generateModernReceipt({
      transactionCode: order.reference_id || orderId,
      receiptNumber: `NGN-${orderId.slice(0, 8).toUpperCase()}`,
      recipientName: order.account_name || 'Unknown',
      phoneNumber: undefined,
      tillNumber: undefined,
      paybillNumber: undefined,
      paybillAccount: order.account_number,
      amount: order.amount_in_local,
      currency: order.local_currency,
      usdcAmount: order.amount_in_usdc,
      exchangeRate: order.rate || 0,
      fee: order.sender_fee || 0,
      date,
      walletAddress: order.wallet_address,
      txHash: order.transaction_hash || '',
      bankName: order.bank_name
    });

    // Convert blob to buffer for Next.js response
    const buffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Log analytics event
    await DatabaseService.logAnalyticsEvent('paycrest_receipt_generated', order.wallet_address, {
      order_id: orderId,
      currency: order.local_currency,
      amount: order.amount_in_local
    });

    // Return PDF
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="minisend-receipt-${orderId.slice(0, 8)}.pdf"`,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });

  } catch (error) {
    console.error('Error generating PayCrest receipt:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate receipt',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
