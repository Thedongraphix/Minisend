import { createClient } from '@supabase/supabase-js';

// Analytics event interface
export interface AnalyticsEvent {
  id: string;
  event_name: string;
  wallet_address: string;
  order_id?: string;
  properties: Record<string, unknown>;
  created_at: Date;
}

// Create analytics event interface
export interface CreateAnalyticsEventData {
  event_name: string;
  wallet_address: string;
  order_id?: string;
  properties?: Record<string, unknown>;
}

// Carrier detection interface
export interface CarrierDetection {
  id: string;
  phone_number: string;
  detected_carrier: string;
  paycrest_provider: string;
  order_id?: string;
  created_at: Date;
}

export class AnalyticsService {
  // Static methods for convenience
  static async trackPaymentCompleted(walletAddress: string, orderId: string, amount: number, currency: string, settlementTimeSeconds: number): Promise<void> {
    const service = new AnalyticsService();
    return service.trackPaymentCompleted(walletAddress, orderId, amount, currency, settlementTimeSeconds);
  }

  static async trackEvent(data: CreateAnalyticsEventData): Promise<AnalyticsEvent> {
    const service = new AnalyticsService();
    return service.trackEvent(data);
  }
  private supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Track a general analytics event
  async trackEvent(data: CreateAnalyticsEventData): Promise<AnalyticsEvent> {
    try {
      const { data: event, error } = await this.supabase
        .from('analytics_events')
        .insert({
          event_name: data.event_name,
          wallet_address: data.wallet_address,
          order_id: data.order_id,
          properties: data.properties || {}
        })
        .select()
        .single();

      if (error) throw error;

      console.log('📊 Analytics event tracked:', {
        event_name: event.event_name,
        wallet_address: event.wallet_address,
        order_id: event.order_id
      });

      return event;
    } catch (error) {
      console.error('❌ Failed to track analytics event:', error);
      throw new Error(`Failed to track analytics event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Track order creation
  async trackOrderCreated(walletAddress: string, orderId: string, amount: number, currency: string, phoneNumber: string): Promise<void> {
    await this.trackEvent({
      event_name: 'order_created',
      wallet_address: walletAddress,
      order_id: orderId,
      properties: {
        amount,
        currency,
        phone_number: phoneNumber,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Track payment completion (RESEARCH-BASED)
  async trackPaymentCompleted(walletAddress: string, orderId: string, amount: number, currency: string, settlementTimeSeconds: number): Promise<void> {
    await this.trackEvent({
      event_name: 'payment_completed',
      wallet_address: walletAddress,
      order_id: orderId,
      properties: {
        amount,
        currency,
        settlement_time_seconds: settlementTimeSeconds,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Track polling attempts (RESEARCH-BASED)
  async trackPollingAttempt(walletAddress: string, orderId: string, attemptNumber: number, status: string, responseTimeMs?: number): Promise<void> {
    await this.trackEvent({
      event_name: 'polling_attempt',
      wallet_address: walletAddress,
      order_id: orderId,
      properties: {
        attempt_number: attemptNumber,
        status,
        response_time_ms: responseTimeMs,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Track settlement (RESEARCH-BASED)
  async trackSettlement(walletAddress: string, orderId: string, status: string, settlementTimeSeconds?: number, txHash?: string): Promise<void> {
    await this.trackEvent({
      event_name: 'settlement',
      wallet_address: walletAddress,
      order_id: orderId,
      properties: {
        status,
        settlement_time_seconds: settlementTimeSeconds,
        tx_hash: txHash,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Track carrier detection
  async logCarrierDetection(data: {
    phone_number: string;
    detected_carrier: string;
    paycrest_provider: string;
    order_id?: string;
  }): Promise<CarrierDetection> {
    try {
      const { data: detection, error } = await this.supabase
        .from('carrier_detections')
        .insert({
          phone_number: data.phone_number,
          detected_carrier: data.detected_carrier,
          paycrest_provider: data.paycrest_provider,
          order_id: data.order_id
        })
        .select()
        .single();

      if (error) throw error;

      console.log('📱 Carrier detection logged:', {
        phone_number: detection.phone_number,
        detected_carrier: detection.detected_carrier,
        paycrest_provider: detection.paycrest_provider
      });

      return detection;
    } catch (error) {
      console.error('❌ Failed to log carrier detection:', error);
      throw new Error(`Failed to log carrier detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get analytics summary
  async getAnalyticsSummary(): Promise<{
    total_events: number;
    total_orders: number;
    total_settlements: number;
    average_settlement_time: number;
    top_events: Array<{ event_name: string; count: number }>;
  }> {
    try {
      // Get all events
      const { data: events, error } = await this.supabase
        .from('analytics_events')
        .select('event_name, properties');

      if (error) throw error;

      const totalEvents = events?.length || 0;
      const totalOrders = events?.filter(e => e.event_name === 'order_created').length || 0;
      const totalSettlements = events?.filter(e => e.event_name === 'payment_completed').length || 0;
      
      // Calculate average settlement time
      const settlementEvents = events?.filter(e => e.event_name === 'payment_completed') || [];
      const settlementTimes = settlementEvents
        .map(e => e.properties?.settlement_time_seconds)
        .filter(time => time !== undefined);
      const averageSettlementTime = settlementTimes.length > 0 
        ? settlementTimes.reduce((sum, time) => sum + time, 0) / settlementTimes.length 
        : 0;

      // Get top events
      const eventCounts = events?.reduce((acc, event) => {
        acc[event.event_name] = (acc[event.event_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const topEvents = Object.entries(eventCounts)
        .map(([event_name, count]) => ({ event_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        total_events: totalEvents,
        total_orders: totalOrders,
        total_settlements: totalSettlements,
        average_settlement_time: averageSettlementTime,
        top_events: topEvents
      };
    } catch (error) {
      console.error('❌ Failed to get analytics summary:', error);
      return {
        total_events: 0,
        total_orders: 0,
        total_settlements: 0,
        average_settlement_time: 0,
        top_events: []
      };
    }
  }

  // Get wallet analytics
  async getWalletAnalytics(walletAddress: string): Promise<{
    total_events: number;
    total_orders: number;
    total_settlements: number;
    average_settlement_time: number;
    recent_events: AnalyticsEvent[];
  }> {
    try {
      // Get events for this wallet
      const { data: events, error } = await this.supabase
        .from('analytics_events')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const totalEvents = events?.length || 0;
      const totalOrders = events?.filter(e => e.event_name === 'order_created').length || 0;
      const totalSettlements = events?.filter(e => e.event_name === 'payment_completed').length || 0;
      
      // Calculate average settlement time
      const settlementEvents = events?.filter(e => e.event_name === 'payment_completed') || [];
      const settlementTimes = settlementEvents
        .map(e => e.properties?.settlement_time_seconds)
        .filter(time => time !== undefined);
      const averageSettlementTime = settlementTimes.length > 0 
        ? settlementTimes.reduce((sum, time) => sum + time, 0) / settlementTimes.length 
        : 0;

      return {
        total_events: totalEvents,
        total_orders: totalOrders,
        total_settlements: totalSettlements,
        average_settlement_time: averageSettlementTime,
        recent_events: events || []
      };
    } catch (error) {
      console.error('❌ Failed to get wallet analytics:', error);
      return {
        total_events: 0,
        total_orders: 0,
        total_settlements: 0,
        average_settlement_time: 0,
        recent_events: []
      };
    }
  }

  // Get polling analytics (RESEARCH-BASED)
  async getPollingAnalytics(orderId: string): Promise<{
    total_attempts: number;
    average_response_time: number;
    success_rate: number;
    attempts: Array<{
      attempt_number: number;
      status: string;
      response_time_ms: number;
      error_message?: string;
      created_at: Date;
    }>;
  }> {
    try {
      const { data: attempts, error } = await this.supabase
        .from('polling_attempts')
        .select('*')
        .eq('order_id', orderId)
        .order('attempt_number', { ascending: true });

      if (error) throw error;

      const totalAttempts = attempts?.length || 0;
      const responseTimes = attempts?.map(a => a.response_time_ms).filter(time => time !== null) || [];
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;
      const successfulAttempts = attempts?.filter(a => a.status === 'settled').length || 0;
      const successRate = totalAttempts > 0 ? successfulAttempts / totalAttempts : 0;

      return {
        total_attempts: totalAttempts,
        average_response_time: averageResponseTime,
        success_rate: successRate,
        attempts: attempts?.map(attempt => ({
          attempt_number: attempt.attempt_number,
          status: attempt.status,
          response_time_ms: attempt.response_time_ms,
          error_message: attempt.error_message,
          created_at: attempt.created_at
        })) || []
      };
    } catch (error) {
      console.error('❌ Failed to get polling analytics:', error);
      return {
        total_attempts: 0,
        average_response_time: 0,
        success_rate: 0,
        attempts: []
      };
    }
  }
}