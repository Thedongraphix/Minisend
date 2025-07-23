import { supabaseAdmin } from './config';
import { AnalyticsEvent, AnalyticsEventInsert, CarrierDetectionLog, CarrierDetectionLogInsert } from './types';

export class AnalyticsService {
  
  /**
   * Track an analytics event
   */
  static async trackEvent(eventData: AnalyticsEventInsert): Promise<AnalyticsEvent> {
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .insert(eventData)
      .select()
      .single();

    if (error) {
      console.error('Error tracking analytics event:', error);
      // Don't throw error for analytics - log and continue
      return eventData as AnalyticsEvent;
    }

    console.log('Analytics event tracked:', {
      id: data.id,
      event_name: data.event_name,
      wallet_address: data.wallet_address
    });

    return data;
  }

  /**
   * Track user journey event
   */
  static async trackUserJourney(
    eventName: string,
    walletAddress: string,
    properties: Record<string, any> = {},
    farcasterContext?: Record<string, any>,
    sessionId?: string
  ): Promise<void> {
    try {
      await this.trackEvent({
        event_name: eventName,
        wallet_address: walletAddress,
        properties,
        farcaster_context: farcasterContext,
        session_id: sessionId
      });
    } catch (error) {
      console.error('Failed to track user journey:', error);
    }
  }

  /**
   * Track order creation
   */
  static async trackOrderCreated(
    walletAddress: string,
    orderId: string,
    amount: number,
    currency: string,
    recipientPhone: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackUserJourney(
      'order_created',
      walletAddress,
      {
        order_id: orderId,
        amount,
        currency,
        recipient_phone: recipientPhone
      },
      undefined,
      sessionId
    );
  }

  /**
   * Track transaction started
   */
  static async trackTransactionStarted(
    walletAddress: string,
    orderId: string,
    transactionHash: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackUserJourney(
      'transaction_started',
      walletAddress,
      {
        order_id: orderId,
        transaction_hash: transactionHash
      },
      undefined,
      sessionId
    );
  }

  /**
   * Track payment completed
   */
  static async trackPaymentCompleted(
    walletAddress: string,
    orderId: string,
    amount: number,
    currency: string,
    settlementTime: number,
    sessionId?: string
  ): Promise<void> {
    await this.trackUserJourney(
      'payment_completed',
      walletAddress,
      {
        order_id: orderId,
        amount,
        currency,
        settlement_time_seconds: settlementTime
      },
      undefined,
      sessionId
    );
  }

  /**
   * Track Farcaster frame interactions
   */
  static async trackFarcasterInteraction(
    eventName: string,
    walletAddress: string,
    farcasterContext: Record<string, any>,
    properties: Record<string, any> = {}
  ): Promise<void> {
    await this.trackUserJourney(
      `farcaster_${eventName}`,
      walletAddress,
      properties,
      farcasterContext
    );
  }

  /**
   * Log carrier detection result
   */
  static async logCarrierDetection(detectionData: CarrierDetectionLogInsert): Promise<CarrierDetectionLog> {
    const { data, error } = await supabaseAdmin
      .from('carrier_detection_logs')
      .insert(detectionData)
      .select()
      .single();

    if (error) {
      console.error('Error logging carrier detection:', error);
      throw new Error(`Failed to log carrier detection: ${error.message}`);
    }

    console.log('Carrier detection logged:', {
      id: data.id,
      phone_number: data.phone_number,
      detected_carrier: data.detected_carrier,
      paycrest_provider: data.paycrest_provider
    });

    return data;
  }

  /**
   * Get daily analytics
   */
  static async getDailyAnalytics(days: number = 30) {
    const { data, error } = await supabaseAdmin
      .from('daily_analytics')
      .select('*')
      .order('date', { ascending: false })
      .limit(days);

    if (error) {
      console.error('Error fetching daily analytics:', error);
      throw new Error(`Failed to fetch daily analytics: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get event analytics
   */
  static async getEventAnalytics(
    eventName?: string,
    days: number = 7
  ): Promise<Record<string, any>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabaseAdmin
      .from('analytics_events')
      .select('event_name, timestamp, properties, wallet_address')
      .gte('timestamp', startDate.toISOString());

    if (eventName) {
      query = query.eq('event_name', eventName);
    }

    const { data, error } = await query.order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching event analytics:', error);
      throw new Error(`Failed to fetch event analytics: ${error.message}`);
    }

    const events = data || [];
    
    // Aggregate analytics
    const eventCounts = events.reduce((acc, event) => {
      acc[event.event_name] = (acc[event.event_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueUsers = new Set(events.map(e => e.wallet_address)).size;
    
    const dailyBreakdown = events.reduce((acc, event) => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { events: 0, unique_users: new Set() };
      }
      acc[date].events++;
      acc[date].unique_users.add(event.wallet_address);
      return acc;
    }, {} as Record<string, { events: number; unique_users: Set<string> }>);

    // Convert sets to counts
    const dailyStats = Object.entries(dailyBreakdown).map(([date, stats]) => ({
      date,
      events: stats.events,
      unique_users: stats.unique_users.size
    }));

    return {
      total_events: events.length,
      event_counts: eventCounts,
      unique_users: uniqueUsers,
      daily_breakdown: dailyStats,
      period_days: days
    };
  }

  /**
   * Get carrier detection accuracy
   */
  static async getCarrierDetectionStats() {
    const { data, error } = await supabaseAdmin
      .from('carrier_detection_logs')
      .select('detected_carrier, paycrest_provider, is_correct, detected_at');

    if (error) {
      console.error('Error fetching carrier detection stats:', error);
      throw new Error(`Failed to fetch carrier detection stats: ${error.message}`);
    }

    const logs = data || [];
    
    const carrierBreakdown = logs.reduce((acc, log) => {
      acc[log.detected_carrier] = (acc[log.detected_carrier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const accuracyLogs = logs.filter(log => log.is_correct !== null);
    const accuracy = accuracyLogs.length > 0 
      ? accuracyLogs.filter(log => log.is_correct).length / accuracyLogs.length 
      : null;

    return {
      total_detections: logs.length,
      carrier_breakdown: carrierBreakdown,
      accuracy_rate: accuracy,
      accuracy_sample_size: accuracyLogs.length
    };
  }

  /**
   * Get user behavior funnel
   */
  static async getUserFunnel(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .select('event_name, wallet_address, timestamp')
      .gte('timestamp', startDate.toISOString())
      .in('event_name', [
        'farcaster_frame_opened',
        'wallet_connected',
        'order_created',
        'transaction_started',
        'payment_completed'
      ])
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching user funnel:', error);
      throw new Error(`Failed to fetch user funnel: ${error.message}`);
    }

    const events = data || [];
    
    // Count unique users at each stage
    const funnelStages = {
      frame_opened: new Set(),
      wallet_connected: new Set(),
      order_created: new Set(),
      transaction_started: new Set(),
      payment_completed: new Set()
    };

    events.forEach(event => {
      switch (event.event_name) {
        case 'farcaster_frame_opened':
          funnelStages.frame_opened.add(event.wallet_address);
          break;
        case 'wallet_connected':
          funnelStages.wallet_connected.add(event.wallet_address);
          break;
        case 'order_created':
          funnelStages.order_created.add(event.wallet_address);
          break;
        case 'transaction_started':
          funnelStages.transaction_started.add(event.wallet_address);
          break;
        case 'payment_completed':
          funnelStages.payment_completed.add(event.wallet_address);
          break;
      }
    });

    return {
      frame_opened: funnelStages.frame_opened.size,
      wallet_connected: funnelStages.wallet_connected.size,
      order_created: funnelStages.order_created.size,
      transaction_started: funnelStages.transaction_started.size,
      payment_completed: funnelStages.payment_completed.size,
      conversion_rates: {
        frame_to_wallet: funnelStages.frame_opened.size > 0 
          ? funnelStages.wallet_connected.size / funnelStages.frame_opened.size 
          : 0,
        wallet_to_order: funnelStages.wallet_connected.size > 0 
          ? funnelStages.order_created.size / funnelStages.wallet_connected.size 
          : 0,
        order_to_transaction: funnelStages.order_created.size > 0 
          ? funnelStages.transaction_started.size / funnelStages.order_created.size 
          : 0,
        transaction_to_completion: funnelStages.transaction_started.size > 0 
          ? funnelStages.payment_completed.size / funnelStages.transaction_started.size 
          : 0
      }
    };
  }

  /**
   * Clean up old analytics events
   */
  static async cleanupOldAnalytics(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .delete()
      .lt('timestamp', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up analytics:', error);
      throw new Error(`Failed to cleanup analytics: ${error.message}`);
    }

    const deletedCount = data?.length || 0;
    console.log(`Cleaned up ${deletedCount} old analytics events`);
    
    return deletedCount;
  }
}