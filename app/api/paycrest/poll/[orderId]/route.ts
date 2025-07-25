import { NextRequest, NextResponse } from 'next/server';
import { createPollingService } from '@/lib/paycrest/polling';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * RESEARCH-BASED PayCrest Polling Endpoint
 * Implements intelligent polling with exponential backoff
 * Only returns success when order.status === 'settled'
 */
export async function POST(
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

    console.log('🔄 RESEARCH-BASED POLLING STARTED for order:', orderId);

    // Get polling options from request body (optional)
    const body = await request.json().catch(() => ({}));
    const pollingOptions = {
      maxAttempts: body.maxAttempts || 20,
      baseDelay: body.baseDelay || 3000,
      timeoutMs: body.timeoutMs || 600000, // 10 minutes
      ...body
    };

    // Create polling service and start polling
    const pollingService = await createPollingService();
    const result = await pollingService.pollOrderStatus(orderId, pollingOptions);

    // RESEARCH-BASED: Different responses based on result
    if (result.success && result.completed) {
      // Payment settled successfully
      console.log('🎉 POLLING SUCCESS - Payment settled:', {
        orderId,
        status: result.order?.status,
        message: result.message
      });

      return NextResponse.json({
        success: true,
        completed: true,
        settled: true,
        order: result.order,
        message: result.message || 'Payment successfully delivered to recipient',
        research_note: 'Settlement detected through intelligent polling'
      });
    }

    if (!result.success && result.completed) {
      // Payment failed or timeout
      console.log('❌ POLLING FAILED:', {
        orderId,
        error: result.error,
        timeoutReached: result.timeoutReached
      });

      return NextResponse.json({
        success: false,
        completed: true,
        settled: false,
        error: result.error,
        message: result.message,
        timeoutReached: result.timeoutReached,
        research_note: result.timeoutReached 
          ? 'Polling timeout reached - manual verification required'
          : 'Payment processing failed'
      });
    }

    // This shouldn't happen with the current implementation
    return NextResponse.json({
      success: false,
      completed: false,
      error: 'Unexpected polling state',
      research_note: 'Polling returned incomplete state'
    }, { status: 500 });

  } catch (error) {
    console.error('PayCrest polling endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      completed: true,
      error: 'Polling service failed',
      message: error instanceof Error ? error.message : 'Unknown polling error',
      research_note: 'Use direct status endpoint as fallback'
    }, { status: 500 });
  }
}

/**
 * GET endpoint for quick status check (without full polling)
 */
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

    console.log('📋 Quick status check for order:', orderId);

    // Create polling service for single status check
    const pollingService = await createPollingService();
    const paycrestService = pollingService.getPaycrestService();
    
    // Get current order status
    const order = await paycrestService.getOrderStatus(orderId);

    // RESEARCH-BASED: Check if settled
    const isSettled = order.status === 'settled';
    const isFailed = ['failed', 'cancelled'].includes(order.status);

    console.log('📊 Status check result:', {
      orderId,
      status: order.status,
      isSettled,
      isFailed,
      txHash: order.txHash,
      amountPaid: order.amountPaid
    });

    return NextResponse.json({
      success: true,
      order,
      settled: isSettled,
      failed: isFailed,
      completed: isSettled || isFailed,
      message: isSettled 
        ? 'Payment completed successfully' 
        : isFailed 
          ? `Payment ${order.status}` 
          : 'Payment processing...',
      research_note: isSettled 
        ? 'Settlement confirmed - no polling needed'
        : 'Use polling endpoint for continuous monitoring'
    });

  } catch (error) {
    console.error('PayCrest status check error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      research_note: 'Direct PayCrest API unavailable'
    }, { status: 500 });
  }
}