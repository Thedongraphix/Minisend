import { NextRequest, NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const paycrestService = await getPaycrestService();
    const order = await paycrestService.getOrderStatus(orderId);

    // Enhanced status response for better debugging
    const response = {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        amount: order.amount,
        token: order.token,
        network: order.network,
        recipient: order.recipient,
        reference: order.reference,
        receiveAddress: order.receiveAddress,
        validUntil: order.validUntil,
        senderFee: order.senderFee,
        transactionFee: order.transactionFee,
      },
      // Add helper flags for easier status checking
      statusFlags: {
        isPending: order.status === 'payment_order.pending',
        isValidated: order.status === 'payment_order.validated',
        isSettled: order.status === 'payment_order.settled',
        isRefunded: order.status === 'payment_order.refunded',
        isExpired: order.status === 'payment_order.expired',
        isComplete: order.status === 'payment_order.validated' || order.status === 'payment_order.settled',
        isFailed: order.status === 'payment_order.refunded' || order.status === 'payment_order.expired'
      },
      confirmed: order.status === 'payment_order.validated' || order.status === 'payment_order.settled',
      timestamp: new Date().toISOString()
    };

    console.log(`Transaction status check for ${orderId}:`, {
      status: order.status,
      confirmed: response.confirmed,
      flags: response.statusFlags
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Transaction status check error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: error.message,
          confirmed: false,
          success: false 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to get transaction status',
        confirmed: false,
        success: false 
      },
      { status: 500 }
    );
  }
}