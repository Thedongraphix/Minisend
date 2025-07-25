import { getDatabasePool } from './config';

// Order interface matching database schema
export interface Order {
  id: string;
  paycrest_order_id: string;
  paycrest_reference: string;
  user_id?: string;
  wallet_address: string;
  amount: number;
  token: string;
  network: string;
  currency: string;
  exchange_rate: number;
  local_amount: number;
  sender_fee: number;
  transaction_fee: number;
  total_amount: number;
  recipient_name: string;
  recipient_phone: string;
  recipient_institution: string;
  recipient_currency: string;
  receive_address: string;
  valid_until: Date;
  status: 'initiated' | 'pending' | 'settled' | 'failed' | 'cancelled';
  settled_at?: Date;
  settlement_time_seconds?: number;
  tx_hash?: string;
  amount_paid?: number;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// Create order interface
export interface CreateOrderData {
  paycrest_order_id: string;
  paycrest_reference: string;
  user_id?: string;
  wallet_address: string;
  amount: number;
  token: string;
  network: string;
  currency: string;
  exchange_rate: number;
  local_amount: number;
  sender_fee: number;
  transaction_fee: number;
  total_amount: number;
  recipient_name: string;
  recipient_phone: string;
  recipient_institution: string;
  recipient_currency: string;
  receive_address: string;
  valid_until: Date;
  metadata?: Record<string, unknown>;
}

// Update order status interface
export interface UpdateOrderStatusData {
  status: 'initiated' | 'pending' | 'settled' | 'failed' | 'cancelled';
  settled_at?: Date;
  settlement_time_seconds?: number;
  tx_hash?: string;
  amount_paid?: number;
}

export class OrderService {
  private pool = getDatabasePool();

  // Create a new order
  async createOrder(data: CreateOrderData): Promise<Order> {
    const query = `
      INSERT INTO orders (
        paycrest_order_id,
        paycrest_reference,
        user_id,
        wallet_address,
        amount,
        token,
        network,
        currency,
        exchange_rate,
        local_amount,
        sender_fee,
        transaction_fee,
        total_amount,
        recipient_name,
        recipient_phone,
        recipient_institution,
        recipient_currency,
        receive_address,
        valid_until,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      data.paycrest_order_id,
      data.paycrest_reference,
      data.user_id,
      data.wallet_address,
      data.amount,
      data.token,
      data.network,
      data.currency,
      data.exchange_rate,
      data.local_amount,
      data.sender_fee,
      data.transaction_fee,
      data.total_amount,
      data.recipient_name,
      data.recipient_phone,
      data.recipient_institution,
      data.recipient_currency,
      data.receive_address,
      data.valid_until,
      JSON.stringify(data.metadata || {})
    ];

    try {
      const result = await this.pool.query(query, values);
      const order = result.rows[0];
      
      console.log('✅ Order created in database:', {
        id: order.id,
        paycrest_order_id: order.paycrest_order_id,
        status: order.status,
        wallet_address: order.wallet_address
      });

      // Update user statistics
      await this.updateUserStats(order.wallet_address);
      
      return order;
    } catch (error) {
      console.error('❌ Failed to create order in database:', error);
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get order by PayCrest order ID
  async getOrderByPaycrestId(paycrestOrderId: string): Promise<Order | null> {
    const query = 'SELECT * FROM orders WHERE paycrest_order_id = $1';
    
    try {
      const result = await this.pool.query(query, [paycrestOrderId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Failed to get order by PayCrest ID:', error);
      return null;
    }
  }

  // Get order by database ID
  async getOrderById(id: string): Promise<Order | null> {
    const query = 'SELECT * FROM orders WHERE id = $1';
    
    try {
      const result = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Failed to get order by ID:', error);
      return null;
    }
  }

  // Update order status (RESEARCH-BASED)
  async updateOrderStatus(paycrestOrderId: string, status: string, additionalData?: Partial<UpdateOrderStatusData>): Promise<Order | null> {
    const query = `
      UPDATE orders 
      SET 
        status = $2,
        updated_at = NOW()
        ${additionalData?.settled_at ? ', settled_at = $3' : ''}
        ${additionalData?.settlement_time_seconds ? ', settlement_time_seconds = $4' : ''}
        ${additionalData?.tx_hash ? ', tx_hash = $5' : ''}
        ${additionalData?.amount_paid ? ', amount_paid = $6' : ''}
      WHERE paycrest_order_id = $1
      RETURNING *
    `;

    const values = [
      paycrestOrderId,
      status,
      additionalData?.settled_at,
      additionalData?.settlement_time_seconds,
      additionalData?.tx_hash,
      additionalData?.amount_paid
    ].filter(value => value !== undefined);

    try {
      const result = await this.pool.query(query, values);
      const order = result.rows[0];
      
      if (order) {
        console.log('✅ Order status updated:', {
          paycrest_order_id: order.paycrest_order_id,
          old_status: order.status,
          new_status: status,
          settled_at: order.settled_at
        });

        // Track settlement if status is 'settled'
        if (status === 'settled' && order.settled_at) {
          await this.trackSettlement(order.id, status, order.settlement_time_seconds, order.tx_hash, order.amount_paid);
        }
      }

      return order || null;
    } catch (error) {
      console.error('❌ Failed to update order status:', error);
      return null;
    }
  }

  // Get orders by wallet address
  async getOrdersByWallet(walletAddress: string, limit: number = 10, offset: number = 0): Promise<Order[]> {
    const query = `
      SELECT * FROM orders 
      WHERE wallet_address = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.pool.query(query, [walletAddress, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get orders by wallet:', error);
      return [];
    }
  }

  // Get wallet statistics
  async getWalletStats(walletAddress: string): Promise<{
    total_orders: number;
    total_volume: number;
    successful_orders: number;
    average_settlement_time: number;
    preferred_currency: string;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(amount), 0) as total_volume,
        COUNT(CASE WHEN status = 'settled' THEN 1 END) as successful_orders,
        AVG(CASE WHEN settlement_time_seconds IS NOT NULL THEN settlement_time_seconds END) as average_settlement_time,
        u.preferred_currency
      FROM orders o
      LEFT JOIN users u ON o.wallet_address = u.wallet_address
      WHERE o.wallet_address = $1
      GROUP BY u.preferred_currency
    `;

    try {
      const result = await this.pool.query(query, [walletAddress]);
      const stats = result.rows[0] || {
        total_orders: 0,
        total_volume: 0,
        successful_orders: 0,
        average_settlement_time: 0,
        preferred_currency: 'KES'
      };

      return {
        total_orders: parseInt(stats.total_orders),
        total_volume: parseFloat(stats.total_volume),
        successful_orders: parseInt(stats.successful_orders),
        average_settlement_time: parseFloat(stats.average_settlement_time) || 0,
        preferred_currency: stats.preferred_currency || 'KES'
      };
    } catch (error) {
      console.error('❌ Failed to get wallet stats:', error);
      return {
        total_orders: 0,
        total_volume: 0,
        successful_orders: 0,
        average_settlement_time: 0,
        preferred_currency: 'KES'
      };
    }
  }

  // Track polling attempt (RESEARCH-BASED)
  async trackPollingAttempt(orderId: string, attemptNumber: number, status: string, responseTimeMs?: number, errorMessage?: string): Promise<void> {
    const query = `
      INSERT INTO polling_attempts (
        order_id,
        attempt_number,
        status,
        response_time_ms,
        error_message
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    try {
      await this.pool.query(query, [orderId, attemptNumber, status, responseTimeMs, errorMessage]);
      console.log('📊 Polling attempt tracked:', { orderId, attemptNumber, status, responseTimeMs });
    } catch (error) {
      console.error('❌ Failed to track polling attempt:', error);
    }
  }

  // Track settlement (RESEARCH-BASED)
  async trackSettlement(orderId: string, status: string, settlementTimeSeconds?: number, txHash?: string, amountPaid?: number): Promise<void> {
    const query = `
      INSERT INTO settlements (
        order_id,
        status,
        settlement_time_seconds,
        tx_hash,
        amount_paid
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    try {
      await this.pool.query(query, [orderId, status, settlementTimeSeconds, txHash, amountPaid]);
      console.log('🎉 Settlement tracked:', { orderId, status, settlementTimeSeconds, txHash });
    } catch (error) {
      console.error('❌ Failed to track settlement:', error);
    }
  }

  // Update user statistics
  private async updateUserStats(walletAddress: string): Promise<void> {
    const query = `
      UPDATE users 
      SET 
        total_orders = (
          SELECT COUNT(*) 
          FROM orders 
          WHERE wallet_address = $1
        ),
        total_volume = (
          SELECT COALESCE(SUM(amount), 0) 
          FROM orders 
          WHERE wallet_address = $1
        ),
        last_active_at = NOW()
      WHERE wallet_address = $1
    `;

    try {
      await this.pool.query(query, [walletAddress]);
    } catch (error) {
      console.error('❌ Failed to update user stats:', error);
    }
  }

  // Get orders with settlement analytics
  async getOrdersWithAnalytics(limit: number = 50): Promise<Order[]> {
    const query = `
      SELECT o.*, 
             u.total_orders as user_total_orders,
             u.total_volume as user_total_volume
      FROM orders o
      LEFT JOIN users u ON o.wallet_address = u.wallet_address
      ORDER BY o.created_at DESC
      LIMIT $1
    `;

    try {
      const result = await this.pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get orders with analytics:', error);
      return [];
    }
  }
} 