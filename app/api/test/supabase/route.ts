import { NextResponse } from 'next/server';
import { testSupabaseConnection, getSupabaseHealth } from '@/lib/supabase/config';
import { UserService } from '@/lib/supabase/users';
import { OrderService } from '@/lib/supabase/orders';
import { AnalyticsService } from '@/lib/supabase/analytics';

export async function GET() {
  try {
    console.log('Starting Supabase integration test...');
    
    // Test basic connection
    const connectionTest = await testSupabaseConnection();
    const healthCheck = await getSupabaseHealth();
    
    console.log('Connection test:', connectionTest);
    console.log('Health check:', healthCheck);
    
    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Supabase',
        health: healthCheck
      }, { status: 500 });
    }
    
    // Test user operations
    console.log('Testing user operations...');
    const testWallet = '0x1234567890123456789012345678901234567890';
    
    const user = await UserService.upsertUser({
      wallet_address: testWallet,
      farcaster_fid: 12345,
      farcaster_username: 'testuser'
    });
    
    console.log('User created/updated:', user.id);
    
    // Test order operations
    console.log('Testing order operations...');
    const testOrder = await OrderService.createOrder({
      paycrest_order_id: `test_${Date.now()}`,
      paycrest_reference: `ref_${Date.now()}`,
      user_id: user.id,
      wallet_address: testWallet,
      amount: 100.5,
      token: 'USDC',
      network: 'base',
      currency: 'KES',
      exchange_rate: 130.5,
      local_amount: 13120.25,
      sender_fee: 0,
      transaction_fee: 0.5,
      total_amount: 101,
      recipient_name: 'Test Recipient',
      recipient_phone: '254712345678',
      recipient_institution: 'SAFARICOM',
      recipient_currency: 'KES',
      receive_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      metadata: {
        test: true,
        created_by: 'supabase_test'
      }
    });
    
    console.log('Order created:', testOrder.id);
    
    // Test order status update
    console.log('Testing order status update...');
    const updatedOrder = await OrderService.updateOrderStatus(
      testOrder.paycrest_order_id,
      'payment_order.validated'
    );
    
    console.log('Order updated:', updatedOrder.status);
    
    // Test analytics
    console.log('Testing analytics...');
    await AnalyticsService.trackEvent({
      event_name: 'test_event',
      wallet_address: testWallet,
      order_id: testOrder.id,
      properties: {
        test: true,
        amount: 100.5,
        currency: 'KES'
      }
    });
    
    // Test carrier detection logging
    console.log('Testing carrier detection...');
    await AnalyticsService.logCarrierDetection({
      phone_number: '254712345678',
      detected_carrier: 'SAFARICOM',
      paycrest_provider: 'MPESA',
      order_id: testOrder.id,
      user_id: user.id
    });
    
    // Test fetching user data
    console.log('Testing data retrieval...');
    const userOrders = await OrderService.getOrdersByWallet(testWallet, 5);
    const walletStats = await OrderService.getWalletStats(testWallet);
    const userSummary = await UserService.getUserTransactionSummary(testWallet);
    
    console.log('Retrieved orders:', userOrders.length);
    console.log('Wallet stats:', walletStats);
    
    // Cleanup test data
    console.log('Cleaning up test data...');
    await OrderService.deleteOrder(testOrder.paycrest_order_id);
    await UserService.deleteUser(testWallet);
    
    return NextResponse.json({
      success: true,
      message: 'Supabase integration test passed!',
      results: {
        connection: connectionTest,
        health: healthCheck,
        user_created: user.id,
        order_created: testOrder.id,
        order_status_updated: updatedOrder.status,
        orders_retrieved: userOrders.length,
        wallet_stats: walletStats,
        user_summary: userSummary
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Supabase integration test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}