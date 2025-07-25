import { createClient } from '@supabase/supabase-js';

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
  // Static methods for compatibility with polling service
  static async getOrderByPaycrestId(paycrestOrderId: string): Promise<Order | null> {
    const service = new OrderService();
    return service.getOrderByPaycrestId(paycrestOrderId);
  }

  static async updateOrderWithSettlement(paycrestOrderId: string, settlementData: {
    status: string;
    settled_at: string;
    settlement_time_seconds: number;
    tx_hash?: string;
    amount_paid?: number;
  }): Promise<Order | null> {
    const service = new OrderService();
    return service.updateOrderStatus(paycrestOrderId, settlementData.status, {
      settled_at: new Date(settlementData.settled_at),
      settlement_time_seconds: settlementData.settlement_time_seconds,
      tx_hash: settlementData.tx_hash,
      amount_paid: settlementData.amount_paid
    });
  }

  static async getOrdersByWallet(walletAddress: string, limit: number = 10, offset: number = 0): Promise<Order[]> {
    const service = new OrderService();
    return service.getOrdersByWallet(walletAddress, limit, offset);
  }

  static async getWalletStats(walletAddress: string) {
    const service = new OrderService();
    return service.getWalletStats(walletAddress);
  }
  private supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create a new order
  async createOrder(data: CreateOrderData): Promise<Order> {
    try {
      const { data: order, error } = await this.supabase
        .from('orders')
        .insert({
          paycrest_order_id: data.paycrest_order_id,
          paycrest_reference: data.paycrest_reference,
          user_id: data.user_id,
          wallet_address: data.wallet_address,
          amount: data.amount,
          token: data.token,
          network: data.network,
          currency: data.currency,
          exchange_rate: data.exchange_rate,
          local_amount: data.local_amount,
          sender_fee: data.sender_fee,
          transaction_fee: data.transaction_fee,
          total_amount: data.total_amount,
          recipient_name: data.recipient_name,
          recipient_phone: data.recipient_phone,
          recipient_institution: data.recipient_institution,
          recipient_currency: data.recipient_currency,
          receive_address: data.receive_address,
          valid_until: data.valid_until,
          metadata: data.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Order created in Supabase:', {
        id: order.id,
        paycrest_order_id: order.paycrest_order_id,
        status: order.status,
        wallet_address: order.wallet_address
      });

      // Update user statistics
      await this.updateUserStats(order.wallet_address);
      
      return order;
    } catch (error) {
      console.error('❌ Failed to create order in Supabase:', error);
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get order by PayCrest order ID
  async getOrderByPaycrestId(paycrestOrderId: string): Promise<Order | null> {
    try {
      const { data: order, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('paycrest_order_id', paycrestOrderId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return order;
    } catch (error) {
      console.error('❌ Failed to get order by PayCrest ID:', error);
      return null;
    }
  }

  // Get order by database ID
  async getOrderById(id: string): Promise<Order | null> {
    try {
      const { data: order, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return order;
    } catch (error) {
      console.error('❌ Failed to get order by ID:', error);
      return null;
    }
  }

  // Update order status (RESEARCH-BASED)
  async updateOrderStatus(paycrestOrderId: string, status: string, additionalData?: Partial<UpdateOrderStatusData>): Promise<Order | null> {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (additionalData?.settled_at) updateData.settled_at = additionalData.settled_at;
      if (additionalData?.settlement_time_seconds) updateData.settlement_time_seconds = additionalData.settlement_time_seconds;
      if (additionalData?.tx_hash) updateData.tx_hash = additionalData.tx_hash;
      if (additionalData?.amount_paid) updateData.amount_paid = additionalData.amount_paid;

      const { data: order, error } = await this.supabase
        .from('orders')
        .update(updateData)
        .eq('paycrest_order_id', paycrestOrderId)
        .select()
        .single();

      if (error) throw error;

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

      return order;
    } catch (error) {
      console.error('❌ Failed to update order status:', error);
      return null;
    }
  }

  // Get orders by wallet address
  async getOrdersByWallet(walletAddress: string, limit: number = 10, offset: number = 0): Promise<Order[]> {
    try {
      const { data: orders, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return orders || [];
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
    try {
      // Get orders for this wallet
      const { data: orders, error } = await this.supabase
        .from('orders')
        .select('amount, status, settlement_time_seconds')
        .eq('wallet_address', walletAddress);

      if (error) throw error;

      const totalOrders = orders?.length || 0;
      const totalVolume = orders?.reduce((sum, order) => sum + Number(order.amount), 0) || 0;
      const successfulOrders = orders?.filter(order => order.status === 'settled').length || 0;
      const settlementTimes = orders?.filter(order => order.settlement_time_seconds).map(order => order.settlement_time_seconds) || [];
      const averageSettlementTime = settlementTimes.length > 0 
        ? settlementTimes.reduce((sum, time) => sum + time, 0) / settlementTimes.length 
        : 0;

      // Get user preferences
      const { data: user } = await this.supabase
        .from('users')
        .select('preferred_currency')
        .eq('wallet_address', walletAddress)
        .single();

      return {
        total_orders: totalOrders,
        total_volume: totalVolume,
        successful_orders: successfulOrders,
        average_settlement_time: averageSettlementTime,
        preferred_currency: user?.preferred_currency || 'KES'
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
    try {
      const { error } = await this.supabase
        .from('polling_attempts')
        .insert({
          order_id: orderId,
          attempt_number: attemptNumber,
          status,
          response_time_ms: responseTimeMs,
          error_message: errorMessage
        });

      if (error) throw error;
      console.log('📊 Polling attempt tracked:', { orderId, attemptNumber, status, responseTimeMs });
    } catch (error) {
      console.error('❌ Failed to track polling attempt:', error);
    }
  }

  // Track settlement (RESEARCH-BASED)
  async trackSettlement(orderId: string, status: string, settlementTimeSeconds?: number, txHash?: string, amountPaid?: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('settlements')
        .insert({
          order_id: orderId,
          status,
          settlement_time_seconds: settlementTimeSeconds,
          tx_hash: txHash,
          amount_paid: amountPaid
        });

      if (error) throw error;
      console.log('🎉 Settlement tracked:', { orderId, status, settlementTimeSeconds, txHash });
    } catch (error) {
      console.error('❌ Failed to track settlement:', error);
    }
  }

  // Update user statistics
  private async updateUserStats(walletAddress: string): Promise<void> {
    try {
      // Get order counts and volume
      const { data: orders, error } = await this.supabase
        .from('orders')
        .select('amount')
        .eq('wallet_address', walletAddress);

      if (error) throw error;

      const totalOrders = orders?.length || 0;
      const totalVolume = orders?.reduce((sum, order) => sum + Number(order.amount), 0) || 0;

      // Update user stats
      const { error: updateError } = await this.supabase
        .from('users')
        .upsert({
          wallet_address: walletAddress,
          total_orders: totalOrders,
          total_volume: totalVolume,
          last_active_at: new Date().toISOString()
        }, {
          onConflict: 'wallet_address'
        });

      if (updateError) throw updateError;
    } catch (error) {
      console.error('❌ Failed to update user stats:', error);
    }
  }

  // Get orders with settlement analytics
  async getOrdersWithAnalytics(limit: number = 50): Promise<Order[]> {
    try {
      const { data: orders, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          users!inner(
            total_orders,
            total_volume
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return orders || [];
    } catch (error) {
      console.error('❌ Failed to get orders with analytics:', error);
      return [];
    }
  }
}