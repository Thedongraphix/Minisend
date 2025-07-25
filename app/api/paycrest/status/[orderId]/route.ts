import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/supabase/orders';
import { getPaycrestService } from '@/lib/paycrest/config';

// Force dynamic rendering and Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
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

    console.log(`🔍 RESEARCH-BASED: Checking order status for ${orderId}`);

    // RESEARCH-BASED: Get fresh status from PayCrest API (primary source)
    let paycrestOrder;
    try {
      const paycrestService = await getPaycrestService();
      paycrestOrder = await paycrestService.getOrderStatus(orderId);
      console.log(`📊 PayCrest API status for ${orderId}:`, paycrestOrder.status);
    } catch (paycrestError) {
      console.error('Failed to get order from PayCrest API:', paycrestError);
      // RESEARCH-BASED: Fallback to database if API fails
      try {
        const orderService = new OrderService();
        const dbOrder = await orderService.getOrderByPaycrestId(orderId);
        if (dbOrder) {
          console.log(`📊 Database fallback status for ${orderId}:`, dbOrder.status);
          paycrestOrder = {
            id: dbOrder.paycrest_order_id,
            status: dbOrder.status,
            amount: dbOrder.amount.toString(),
            token: 'USDC',
            network: 'base',
            recipient: {
              accountName: dbOrder.recipient_name,
              accountIdentifier: dbOrder.recipient_phone,
              currency: dbOrder.currency
            },
            reference: dbOrder.paycrest_reference,
            receiveAddress: dbOrder.receive_address,
            validUntil: dbOrder.valid_until,
            senderFee: dbOrder.sender_fee.toString(),
            transactionFee: dbOrder.transaction_fee.toString()
          };
        }
      } catch (dbError) {
        console.error('Database fallback also failed:', dbError);
      }
    }

    if (!paycrestOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // RESEARCH-BASED: Update database with fresh PayCrest status
    try {
      const orderService = new OrderService();
      const dbOrder = await orderService.getOrderByPaycrestId(orderId);
      if (dbOrder && dbOrder.status !== paycrestOrder.status) {
        await orderService.updateOrderStatus(orderId, paycrestOrder.status);
        console.log(`📊 Updated order ${orderId} status from ${dbOrder.status} to ${paycrestOrder.status}`);
      }
    } catch (updateError) {
      console.error('Failed to update order status in database:', updateError);
      // Don't fail the request if DB update fails
    }

    // RESEARCH-BASED: Enhanced response with settlement detection
    const response = {
      success: true,
      order: {
        id: paycrestOrder.id,
        status: paycrestOrder.status,
        amount: paycrestOrder.amount,
        token: paycrestOrder.token,
        network: paycrestOrder.network,
        currency: paycrestOrder.recipient?.currency || 'KES',
        recipient: paycrestOrder.recipient,
        reference: paycrestOrder.reference,
        receiveAddress: paycrestOrder.receiveAddress,
        validUntil: paycrestOrder.validUntil,
        senderFee: paycrestOrder.senderFee,
        transactionFee: paycrestOrder.transactionFee,
        // RESEARCH-BASED: Add settlement-specific fields
        isSettled: paycrestOrder.status === 'settled',
        isFailed: ['failed', 'cancelled'].includes(paycrestOrder.status),
        isProcessing: ['initiated', 'pending'].includes(paycrestOrder.status),
        // Add transaction hash if available for settlement verification
        txHash: paycrestOrder.txHash,
        // Add settlement timestamp
        settledAt: paycrestOrder.status === 'settled' ? new Date().toISOString() : undefined
      }
    };

    console.log(`✅ RESEARCH-BASED: Order status response for ${orderId}:`, {
      status: paycrestOrder.status,
      isSettled: response.order.isSettled,
      isFailed: response.order.isFailed,
      isProcessing: response.order.isProcessing
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Order status check error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get order status' },
      { status: 500 }
    );
  }
}