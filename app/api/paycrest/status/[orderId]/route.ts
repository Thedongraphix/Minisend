import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';
import { fixPaycrestAccountName } from '@/lib/utils/accountNameExtractor';

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

    console.log(`🔍 Checking PayCrest order status`);

    // Get order status from PayCrest API
    const paycrestApiKey = process.env.PAYCREST_API_KEY;
    const paycrestBaseUrl = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';

    if (!paycrestApiKey) {
      return NextResponse.json(
        { error: 'PayCrest API secret not configured' },
        { status: 500 }
      );
    }

    // Helper function to fetch with timeout and retry
    const fetchWithRetry = async (maxRetries = 2, timeoutMs = 10000): Promise<Response> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📡 Attempt ${attempt}/${maxRetries} - Checking PayCrest order status`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const response = await fetch(`${paycrestBaseUrl}/sender/orders/${orderId}`, {
            method: 'GET',
            headers: {
              'API-Key': paycrestApiKey,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return response;

        } catch (error) {
          console.error(`❌ Attempt ${attempt} failed:`, error);

          if (attempt === maxRetries) {
            throw error;
          }

          // Wait before retry with exponential backoff
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // This should never be reached due to the throw above, but TypeScript needs it
      throw new Error('All retry attempts failed');
    };

    const response = await fetchWithRetry();

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

    // Fix account name (PayCrest returns "OK" instead of actual names)
    const fixedOrder = fixPaycrestAccountName(order);

    // Simple response format with correct PayCrest status mapping
    const statusResponse = {
      success: true,
      order: {
        id: fixedOrder.id,
        status: fixedOrder.status,
        amount: fixedOrder.amount,
        token: fixedOrder.token,
        network: fixedOrder.network,
        currency: fixedOrder.recipient?.currency || 'KES',
        recipient: fixedOrder.recipient,
        reference: fixedOrder.reference,
        receiveAddress: fixedOrder.receiveAddress,
        validUntil: fixedOrder.validUntil,
        senderFee: fixedOrder.senderFee,
        transactionFee: fixedOrder.transactionFee,
        // Settlement flags based on official PayCrest statuses - optimized for speed
        isValidated: fixedOrder.status === 'validated', // Funds sent to recipient's bank/mobile network
        isSettled: fixedOrder.status === 'settled', // Order fully completed on blockchain
        isDelivered: fixedOrder.status === 'validated' || fixedOrder.status === 'settled', // Either status means delivery success
        isFailed: ['refunded', 'expired'].includes(fixedOrder.status),
        isPending: fixedOrder.status === 'pending', // Order created, waiting for provider assignment
        isProcessing: fixedOrder.status === 'processing' || fixedOrder.status === 'pending' // Handle legacy processing status
      }
    };

    console.log(`✅ Order status response:`, {
      status: order.status,
      isValidated: statusResponse.order.isValidated,
      isSettled: statusResponse.order.isSettled,
      isDelivered: statusResponse.order.isDelivered,
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
            console.log(`💰 Creating settlement record for completed order`)

            try {
              await DatabaseService.createSettlement({
                order_id: dbOrder.id,
                paycrest_settlement_id: order.id, // Use Paycrest order ID as settlement ID
                settlement_amount: dbOrder.amount_in_local,
                settlement_currency: dbOrder.local_currency,
                settlement_method: dbOrder.carrier === 'MPESA' ? 'M-PESA' : 'Mobile Money',
                settled_at: new Date().toISOString()
              })
              console.log(`✅ Settlement record created`)
            } catch (settlementError) {
              console.error(`❌ Failed to create settlement for ${orderId}:`, settlementError)
            }

            // 🔔 Send notification to Farcaster users (only if FID was saved during order creation)
            // Web users won't have FID, so this is safely skipped for them
            // Non-blocking: notification failures won't affect status updates
            if (dbOrder.fid) {
              try {
                const { getNotificationService } = await import('@/lib/services/notification-service');
                const notificationService = getNotificationService();

                await notificationService.sendNotification(
                  dbOrder.fid,
                  309857, // Base app FID
                  {
                    title: '✅ Payment Delivered',
                    body: `Your ${dbOrder.local_currency} ${dbOrder.amount_in_local.toFixed(2)} payment has been delivered!`,
                    targetUrl: `${process.env.NEXT_PUBLIC_URL || 'https://minisend.xyz'}`,
                  }
                );
              } catch {
                // Notification failed, but don't fail the status check
              }
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
        console.log(`⚠️ Order not found in database`)
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