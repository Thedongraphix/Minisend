import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/supabase/analytics';
import { UserService } from '@/lib/supabase/users';
import { OrderService } from '@/lib/supabase/orders';
import { WebhookService } from '@/lib/supabase/webhooks';

// Admin dashboard analytics endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const adminKey = searchParams.get('admin_key');

    // Simple admin key check (in production, use proper authentication)
    if (adminKey !== process.env.ADMIN_DASHBOARD_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all dashboard data in parallel
    const [
      dailyAnalytics,
      eventAnalytics,
      userStats,
      carrierStats,
      userFunnel,
      webhookStats,
      recentOrders
    ] = await Promise.all([
      AnalyticsService.getDailyAnalytics(days),
      AnalyticsService.getEventAnalytics(undefined, days),
      UserService.getUserStats(),
      AnalyticsService.getCarrierDetectionStats(),
      AnalyticsService.getUserFunnel(days),
      WebhookService.getWebhookStats(),
      OrderService.getRecentOrders(20)
    ]);

    // Calculate additional metrics
    const totalVolume = dailyAnalytics.reduce((sum, day) => sum + day.total_volume_usdc, 0);
    const avgOrderSize = dailyAnalytics.length > 0 
      ? totalVolume / dailyAnalytics.reduce((sum, day) => sum + day.total_orders, 0)
      : 0;

    const successRate = dailyAnalytics.length > 0
      ? dailyAnalytics.reduce((sum, day) => sum + day.successful_orders, 0) / 
        dailyAnalytics.reduce((sum, day) => sum + day.total_orders, 0)
      : 0;

    // Group orders by status for quick overview
    const ordersByStatus = recentOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dashboard = {
      overview: {
        total_orders: dailyAnalytics.reduce((sum, day) => sum + day.total_orders, 0),
        successful_orders: dailyAnalytics.reduce((sum, day) => sum + day.successful_orders, 0),
        total_volume_usdc: totalVolume,
        unique_users: dailyAnalytics.reduce((sum, day) => sum + day.unique_users, 0),
        avg_order_size: avgOrderSize,
        success_rate: successRate,
        period_days: days
      },
      
      daily_analytics: dailyAnalytics,
      
      user_metrics: {
        ...userStats,
        funnel: userFunnel
      },
      
      transaction_metrics: {
        orders_by_status: ordersByStatus,
        recent_orders: recentOrders.slice(0, 10), // Only return top 10 for dashboard
        carrier_detection: carrierStats
      },
      
      system_metrics: {
        webhook_stats: webhookStats,
        event_analytics: eventAnalytics
      },
      
      generated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      dashboard
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: error.message,
          success: false 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard analytics',
        success: false 
      },
      { status: 500 }
    );
  }
}