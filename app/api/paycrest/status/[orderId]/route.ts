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

    // First try to get order from our database (updated by webhooks)
    let dbOrder;
    try {
      dbOrder = await OrderService.getOrderByPaycrestId(orderId);
    } catch (dbError) {
      console.error('Failed to get order from database:', dbError);
    }

    // Also get fresh status from PayCrest API
    let paycrestOrder;
    try {
      const paycrestService = await getPaycrestService();
      paycrestOrder = await paycrestService.getOrderStatus(orderId);
    } catch (paycrestError) {
      console.error('Failed to get order from PayCrest API:', paycrestError);
    }

    // Use the most recent status (prefer PayCrest if available, fallback to DB)
    const currentOrder = paycrestOrder || dbOrder;
    
    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update database if PayCrest status is newer
    if (paycrestOrder && dbOrder && dbOrder.status !== paycrestOrder.status) {
      try {
        await OrderService.updateOrderStatus(orderId, paycrestOrder.status);
        console.log(`Updated order ${orderId} status from ${dbOrder.status} to ${paycrestOrder.status}`);
      } catch (updateError) {
        console.error('Failed to update order status:', updateError);
      }
    }

    // Handle different response formats between PayCrest API and database
    const isPaycrestOrder = 'id' in currentOrder && 'receiveAddress' in currentOrder;
    const isDatabaseOrder = 'paycrest_order_id' in currentOrder && 'wallet_address' in currentOrder;

    const response = {
      success: true,
      order: {
        id: isPaycrestOrder ? currentOrder.id : isDatabaseOrder ? (currentOrder as { paycrest_order_id: string }).paycrest_order_id : 'unknown',
        status: currentOrder.status,
        amount: isPaycrestOrder ? currentOrder.amount : isDatabaseOrder ? (currentOrder as { amount: number }).amount : 0,
        token: isPaycrestOrder ? currentOrder.token : 'USDC',
        network: isPaycrestOrder ? currentOrder.network : 'base',
        currency: isPaycrestOrder ? currentOrder.recipient?.currency : isDatabaseOrder ? (currentOrder as { currency: string }).currency : 'KES',
        recipient: isPaycrestOrder ? currentOrder.recipient : isDatabaseOrder ? {
          accountName: (currentOrder as { recipient_name: string }).recipient_name,
          accountIdentifier: (currentOrder as { recipient_phone: string }).recipient_phone,
          currency: (currentOrder as { currency: string }).currency
        } : undefined,
        reference: isPaycrestOrder ? currentOrder.reference : isDatabaseOrder ? (currentOrder as { paycrest_reference: string }).paycrest_reference : undefined,
        receiveAddress: isPaycrestOrder ? currentOrder.receiveAddress : isDatabaseOrder ? (currentOrder as { receive_address: string }).receive_address : undefined,
        validUntil: isPaycrestOrder ? currentOrder.validUntil : isDatabaseOrder ? (currentOrder as { valid_until: string }).valid_until : undefined,
        senderFee: isPaycrestOrder ? currentOrder.senderFee : isDatabaseOrder ? (currentOrder as { sender_fee: number }).sender_fee : 0,
        transactionFee: isPaycrestOrder ? currentOrder.transactionFee : isDatabaseOrder ? (currentOrder as { transaction_fee: number }).transaction_fee : 0,
        created_at: isDatabaseOrder ? (currentOrder as { created_at: string }).created_at : undefined,
        updated_at: isDatabaseOrder ? (currentOrder as { updated_at: string }).updated_at : new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Order status check error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get order status' },
      { status: 500 }
    );
  }
}