import { getDatabasePool } from './config';

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
  private pool = getDatabasePool();

  // Track a general analytics event
  async trackEvent(data: CreateAnalyticsEventData): Promise<AnalyticsEvent> {
    const query = `
      INSERT INTO analytics_events (
        event_name,
        wallet_address,
        order_id,
        properties
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      data.event_name,
      data.wallet_address,
      data.order_id,
      JSON.stringify(data.properties || {})
    ];

    try {
      const result = await this.pool.query(query, values);
      const event = result.rows[0];
      
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
    const query = `
      INSERT INTO carrier_detections (
        phone_number,
        detected_carrier,
        paycrest_provider,
        order_id
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      data.phone_number,
      data.detected_carrier,
      data.paycrest_provider,
      data.order_id
    ];

    try {
      const result = await this.pool.query(query, values);
      const detection = result.rows[0];
      
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
    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_name = 'order_created' THEN 1 END) as total_orders,
        COUNT(CASE WHEN event_name = 'payment_completed' THEN 1 END) as total_settlements,
        AVG(CASE WHEN event_name = 'payment_completed' THEN (properties->>'settlement_time_seconds')::numeric END) as average_settlement_time
      FROM analytics_events
    `;

    const topEventsQuery = `
      SELECT 
        event_name,
        COUNT(*) as count
      FROM analytics_events
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT 10
    `;

    try {
      const [summaryResult, topEventsResult] = await Promise.all([
        this.pool.query(query),
        this.pool.query(topEventsQuery)
      ]);

      const summary = summaryResult.rows[0];
      const topEvents = topEventsResult.rows;

      return {
        total_events: parseInt(summary.total_events),
        total_orders: parseInt(summary.total_orders),
        total_settlements: parseInt(summary.total_settlements),
        average_settlement_time: parseFloat(summary.average_settlement_time) || 0,
        top_events: topEvents.map(row => ({
          event_name: row.event_name,
          count: parseInt(row.count)
        }))
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
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_name = 'order_created' THEN 1 END) as total_orders,
        COUNT(CASE WHEN event_name = 'payment_completed' THEN 1 END) as total_settlements,
        AVG(CASE WHEN event_name = 'payment_completed' THEN (properties->>'settlement_time_seconds')::numeric END) as average_settlement_time
      FROM analytics_events
      WHERE wallet_address = $1
    `;

    const recentEventsQuery = `
      SELECT * FROM analytics_events
      WHERE wallet_address = $1
      ORDER BY created_at DESC
      LIMIT 20
    `;

    try {
      const [summaryResult, recentEventsResult] = await Promise.all([
        this.pool.query(summaryQuery, [walletAddress]),
        this.pool.query(recentEventsQuery, [walletAddress])
      ]);

      const summary = summaryResult.rows[0];
      const recentEvents = recentEventsResult.rows;

      return {
        total_events: parseInt(summary.total_events),
        total_orders: parseInt(summary.total_orders),
        total_settlements: parseInt(summary.total_settlements),
        average_settlement_time: parseFloat(summary.average_settlement_time) || 0,
        recent_events: recentEvents
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
    const query = `
      SELECT 
        COUNT(*) as total_attempts,
        AVG(response_time_ms) as average_response_time,
        COUNT(CASE WHEN status = 'settled' THEN 1 END)::float / COUNT(*) as success_rate
      FROM polling_attempts
      WHERE order_id = $1
    `;

    const attemptsQuery = `
      SELECT 
        attempt_number,
        status,
        response_time_ms,
        error_message,
        created_at
      FROM polling_attempts
      WHERE order_id = $1
      ORDER BY attempt_number ASC
    `;

    try {
      const [summaryResult, attemptsResult] = await Promise.all([
        this.pool.query(query, [orderId]),
        this.pool.query(attemptsQuery, [orderId])
      ]);

      const summary = summaryResult.rows[0];
      const attempts = attemptsResult.rows;

      return {
        total_attempts: parseInt(summary.total_attempts),
        average_response_time: parseFloat(summary.average_response_time) || 0,
        success_rate: parseFloat(summary.success_rate) || 0,
        attempts: attempts.map(row => ({
          attempt_number: row.attempt_number,
          status: row.status,
          response_time_ms: row.response_time_ms,
          error_message: row.error_message,
          created_at: row.created_at
        }))
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