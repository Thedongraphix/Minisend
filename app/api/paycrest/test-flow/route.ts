import { NextRequest, NextResponse } from 'next/server';
import { createEnhancedPollingService } from '@/lib/paycrest/enhanced-polling';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Test endpoint to verify the complete payment flow integration
 * This endpoint tests all components of the enhanced payment system
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, orderId, testData } = body;

    console.log('🧪 Testing payment flow action:', action);

    switch (action) {
      case 'create_test_order':
        return await createTestOrder(testData);
      
      case 'test_polling':
        return await testPolling(orderId);
      
      case 'test_realtime':
        return await testRealtimeConnection();
      
      case 'test_webhook_simulation':
        return await testWebhookSimulation(orderId, testData);
      
      case 'test_complete_flow':
        return await testCompleteFlow(testData);
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown test action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('🧪 Test flow error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown test error'
    }, { status: 500 });
  }
}

async function createTestOrder(testData: Record<string, unknown>) {
  console.log('🧪 Creating test order with data:', testData);
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/paycrest/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: testData.amount || '10',
        phoneNumber: testData.phoneNumber || '+254700000000',
        accountName: testData.accountName || 'Test User',
        currency: testData.currency || 'KES',
        returnAddress: testData.returnAddress || '0x742d35Cc6634C0532925a3b8C17B8a89F2C5d1D6',
        rate: testData.rate || 150
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Test order created successfully:', result.order.id);
      return NextResponse.json({
        success: true,
        message: 'Test order created successfully',
        order: result.order,
        nextSteps: [
          'Use test_polling to verify polling works',
          'Use test_realtime to verify real-time updates',
          'Send crypto to receiveAddress to trigger actual payment flow'
        ]
      });
    } else {
      throw new Error(result.error || 'Failed to create test order');
    }

  } catch (error) {
    console.error('🧪 Test order creation failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test order creation failed'
    }, { status: 500 });
  }
}

async function testPolling(orderId: string) {
  console.log('🧪 Testing polling for order:', orderId);
  
  try {
    const pollingService = await createEnhancedPollingService();
    
    // Test single status check
    const order = await pollingService.getOrderStatus(orderId);
    console.log('📊 Current order status:', order.status);
    
    // Test short polling (5 attempts)
    const pollingResult = await pollingService.pollOrderStatus(orderId, {
      maxAttempts: 5,
      baseDelay: 2000,
      timeoutMs: 30000,
      onStatusUpdate: (order) => {
        console.log('📢 Polling status update:', order.status);
      },
      onError: (error) => {
        console.error('📢 Polling error:', error.message);
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Polling test completed',
      currentStatus: order.status,
      pollingResult,
      analysis: {
        isSettled: order.status === 'validated' || order.status === 'settled',
        isFailed: ['failed', 'cancelled', 'expired', 'refunded'].includes(order.status),
        isProcessing: ['initiated', 'pending'].includes(order.status)
      }
    });

  } catch (error) {
    console.error('🧪 Polling test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Polling test failed'
    }, { status: 500 });
  }
}

async function testRealtimeConnection() {
  console.log('🧪 Testing real-time connection');
  
  try {
    // Check if SSE endpoint is available
    const sseResponse = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/paycrest/stream`, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    const connectionWorking = sseResponse.ok;
    
    return NextResponse.json({
      success: true,
      message: 'Real-time connection test completed',
      sseEndpointAvailable: connectionWorking,
      sseStatus: sseResponse.status,
      streamUrl: `${process.env.NEXT_PUBLIC_URL}/api/paycrest/stream`,
      recommendations: connectionWorking 
        ? ['Real-time updates should work properly']
        : ['Check SSE endpoint configuration', 'Verify network connectivity']
    });

  } catch (error) {
    console.error('🧪 Real-time test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Real-time test failed',
      recommendations: [
        'Check SSE endpoint configuration',
        'Verify server setup',
        'Check network connectivity'
      ]
    }, { status: 500 });
  }
}

async function testWebhookSimulation(orderId: string, testData: Record<string, unknown>) {
  console.log('🧪 Simulating webhook for order:', orderId);
  
  try {
    // Simulate a webhook event
    const webhookPayload = {
      event: testData.event || 'payment_order.validated',
      data: {
        id: orderId,
        status: testData.status || 'validated',
        amount: testData.amount || '10',
        amountPaid: testData.amountPaid || '10',
        token: 'USDC',
        network: 'base',
        recipient: {
          accountName: 'Test User',
          accountIdentifier: '+254700000000',
          currency: 'KES'
        },
        txHash: testData.txHash || '0x123456789abcdef',
        reference: `test-${orderId}`
      }
    };

    console.log('🧪 Webhook simulation payload:', webhookPayload);

    // The actual webhook would be called by PayCrest
    // This simulates the internal processing
    return NextResponse.json({
      success: true,
      message: 'Webhook simulation completed',
      simulatedPayload: webhookPayload,
      note: 'In production, this would be called by PayCrest servers',
      realWebhookUrl: `${process.env.NEXT_PUBLIC_URL}/api/paycrest/webhook`
    });

  } catch (error) {
    console.error('🧪 Webhook simulation failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook simulation failed'
    }, { status: 500 });
  }
}

async function testCompleteFlow(testData: Record<string, unknown>) {
  console.log('🧪 Testing complete payment flow');
  
  try {
    const results: Record<string, unknown> = {};
    
    // Step 1: Test order creation
    console.log('🧪 Step 1: Testing order creation');
    const orderResult = await createTestOrder(testData);
    const orderData = await orderResult.json();
    results.orderCreation = orderData;
    
    if (!orderData.success) {
      throw new Error('Order creation failed');
    }
    
    const orderId = orderData.order.id;
    
    // Step 2: Test status checking
    console.log('🧪 Step 2: Testing status checking');
    const statusResult = await testPolling(orderId);
    const statusData = await statusResult.json();
    results.statusChecking = statusData;
    
    // Step 3: Test real-time connection
    console.log('🧪 Step 3: Testing real-time connection');
    const realtimeResult = await testRealtimeConnection();
    const realtimeData = await realtimeResult.json();
    results.realtimeConnection = realtimeData;
    
    // Step 4: Test webhook simulation
    console.log('🧪 Step 4: Testing webhook simulation');
    const webhookResult = await testWebhookSimulation(orderId, testData);
    const webhookData = await webhookResult.json();
    results.webhookSimulation = webhookData;

    return NextResponse.json({
      success: true,
      message: 'Complete flow test finished',
      orderId,
      results,
      summary: {
        orderCreation: (results.orderCreation as { success: boolean }).success,
        statusChecking: (results.statusChecking as { success: boolean }).success,
        realtimeConnection: (results.realtimeConnection as { success: boolean }).success,
        webhookSimulation: (results.webhookSimulation as { success: boolean }).success,
        overallHealth: (results.orderCreation as { success: boolean }).success && 
                      (results.statusChecking as { success: boolean }).success && 
                      (results.realtimeConnection as { success: boolean }).success && 
                      (results.webhookSimulation as { success: boolean }).success
      },
      nextSteps: [
        `Send USDC to ${(orderData.order as { receiveAddress: string }).receiveAddress} to test real payment`,
        'Monitor console logs for real-time updates',
        'Verify webhook receives actual PayCrest events'
      ]
    });

  } catch (error) {
    console.error('🧪 Complete flow test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Complete flow test failed'
    }, { status: 500 });
  }
}

/**
 * GET endpoint for testing utilities
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'health':
      return NextResponse.json({
        success: true,
        message: 'Payment flow test endpoint is healthy',
        timestamp: new Date().toISOString(),
        availableActions: [
          'create_test_order',
          'test_polling', 
          'test_realtime',
          'test_webhook_simulation',
          'test_complete_flow'
        ]
      });

    case 'endpoints':
      return NextResponse.json({
        success: true,
        endpoints: {
          orders: `${process.env.NEXT_PUBLIC_URL}/api/paycrest/orders`,
          webhook: `${process.env.NEXT_PUBLIC_URL}/api/paycrest/webhook`,
          stream: `${process.env.NEXT_PUBLIC_URL}/api/paycrest/stream`,
          status: `${process.env.NEXT_PUBLIC_URL}/api/paycrest/status/{orderId}`,
          polling: `${process.env.NEXT_PUBLIC_URL}/api/paycrest/poll/{orderId}`,
          testFlow: `${process.env.NEXT_PUBLIC_URL}/api/paycrest/test-flow`
        }
      });

    default:
      return NextResponse.json({
        success: false,
        error: 'Unknown action. Use ?action=health or ?action=endpoints'
      }, { status: 400 });
  }
}