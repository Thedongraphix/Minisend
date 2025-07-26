import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get recent webhook events
    const { data: webhooks, error } = await supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Get recent orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, paycrest_order_id, status, settled_at, amount_paid, tx_hash, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError) throw ordersError;

    // Get settlements
    const { data: settlements, error: settlementsError } = await supabase
      .from('settlements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (settlementsError) throw settlementsError;

    return NextResponse.json({
      success: true,
      data: {
        webhook_events: webhooks || [],
        recent_orders: orders || [],
        settlements: settlements || [],
        summary: {
          webhook_events_count: webhooks?.length || 0,
          orders_count: orders?.length || 0,
          settlements_count: settlements?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Debug webhook events error:', error);
    return NextResponse.json(
      { error: 'Failed to get debug data' },
      { status: 500 }
    );
  }
}