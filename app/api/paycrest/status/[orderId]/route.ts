import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';

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

    console.log(`🔍 Checking PayCrest order status for ${orderId}`);

    // Get order status from PayCrest API
    const paycrestApiKey = process.env.PAYCREST_API_KEY;
    const paycrestBaseUrl = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';

    if (!paycrestApiKey) {
      return NextResponse.json(
        { error: 'PayCrest API secret not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${paycrestBaseUrl}/sender/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'API-Key': paycrestApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`PayCrest API error: ${response.status}`);
      return NextResponse.json(
        { error: 'Failed to get order status from PayCrest' },
        { status: response.status }
      );
    }

    const paycrestOrder = await response.json();
    console.log(`📊 PayCrest order status:`, {
      orderId,
      status: paycrestOrder.data?.status,
      response: paycrestOrder
    });

    const order = paycrestOrder.data;
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Simple response format with correct PayCrest status mapping
    const statusResponse = {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        amount: order.amount,
        token: order.token,
        network: order.network,
        currency: order.recipient?.currency || 'KES',
        recipient: order.recipient,
        reference: order.reference,
        receiveAddress: order.receiveAddress,
        validUntil: order.validUntil,
        senderFee: order.senderFee,
        transactionFee: order.transactionFee,
        // Settlement flags based on official PayCrest statuses
        isValidated: order.status === 'validated', // Funds sent to recipient's bank/mobile network
        isSettled: order.status === 'settled', // Order fully completed on blockchain
        isFailed: ['refunded', 'expired'].includes(order.status),
        isPending: order.status === 'pending', // Order created, waiting for provider assignment
        isProcessing: order.status === 'processing' || order.status === 'pending' // Handle legacy processing status
      }
    };

    console.log(`✅ Order status response for ${orderId}:`, {
      status: order.status,
      isValidated: statusResponse.order.isValidated,
      isSettled: statusResponse.order.isSettled,
      isFailed: statusResponse.order.isFailed
    });

    // 🗄️ Update database with latest status
    try {
      // Get existing order from database
      const dbOrder = await DatabaseService.getOrderByPaycrestId(orderId)
      
      if (dbOrder) {
        // Check if status changed
        if (dbOrder.paycrest_status !== order.status) {
          console.log(`🔄 Status changed from ${dbOrder.paycrest_status} to ${order.status}`)
          
          // Map Paycrest status to our status using official PayCrest statuses
          let ourStatus = dbOrder.status
          if (['validated', 'settled'].includes(order.status)) {
            ourStatus = 'completed'
          } else if (['refunded', 'expired'].includes(order.status)) {
            ourStatus = 'failed'
          } else if (order.status === 'pending') {
            ourStatus = 'processing'
          }

          // Update order status
          await DatabaseService.updateOrderStatus(
            orderId,
            ourStatus,
            order.status,
            {
              transaction_hash: order.txHash,
              completed_at: ['validated', 'settled'].includes(order.status) 
                ? new Date().toISOString() 
                : undefined
            }
          )

          // Create settlement record if order is completed (validated = funds delivered, settled = blockchain complete)
          if (['validated', 'settled'].includes(order.status)) {
            console.log(`💰 Creating settlement record for completed order ${orderId}`)
            
            try {
              await DatabaseService.createSettlement({
                order_id: dbOrder.id,
                paycrest_settlement_id: order.id, // Use Paycrest order ID as settlement ID
                settlement_amount: dbOrder.amount_in_local,
                settlement_currency: dbOrder.local_currency,
                settlement_method: dbOrder.carrier === 'MPESA' ? 'M-PESA' : 'Mobile Money',
                settled_at: new Date().toISOString()
              })
              console.log(`✅ Settlement record created for ${orderId}`)
            } catch (settlementError) {
              console.error(`❌ Failed to create settlement for ${orderId}:`, settlementError)
            }
          }

          // Log the polling attempt
          await DatabaseService.logPollingAttempt(
            dbOrder.id,
            orderId,
            1, // attempt number - could be enhanced to track actual attempts
            order.status,
            paycrestOrder
          )
        } else {
          // Still log the polling attempt even if status didn't change
          await DatabaseService.logPollingAttempt(
            dbOrder.id,
            orderId,
            1,
            order.status,
            { message: 'Status unchanged', timestamp: new Date().toISOString() }
          )
        }
      } else {
        console.log(`⚠️ Order ${orderId} not found in database`)
      }

    } catch (dbError) {
      console.error('❌ Database error during status update:', dbError)
      // Don't fail the API call if database fails
    }

    return NextResponse.json(statusResponse);

  } catch (error) {
    console.error('Order status check error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get order status' },
      { status: 500 }
    );
  }
}