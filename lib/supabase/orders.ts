import { supabaseAdmin } from './config';
import { PaymentOrder, PaymentOrderInsert, PaymentOrderUpdate } from './types';

export class OrderService {
  
  /**
   * Create a new payment order in the database
   */
  static async createOrder(orderData: PaymentOrderInsert): Promise<PaymentOrder> {
    const { data, error } = await supabaseAdmin
      .from('payment_orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }

    console.log('Order created successfully:', {
      id: data.id,
      paycrest_order_id: data.paycrest_order_id,
      wallet_address: data.wallet_address,
      amount: data.amount,
      currency: data.currency
    });

    return data;
  }

  /**
   * Update an existing payment order
   */
  static async updateOrder(
    paycrestOrderId: string, 
    updates: PaymentOrderUpdate
  ): Promise<PaymentOrder> {
    const { data, error } = await supabaseAdmin
      .from('payment_orders')
      .update(updates)
      .eq('paycrest_order_id', paycrestOrderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order:', error);
      throw new Error(`Failed to update order: ${error.message}`);
    }

    console.log('Order updated successfully:', {
      id: data.id,
      paycrest_order_id: data.paycrest_order_id,
      status: data.status,
      updates: Object.keys(updates)
    });

    return data;
  }

  /**
   * Update order status from webhook
   */
  static async updateOrderStatus(
    paycrestOrderId: string,
    status: string,
    additionalData?: Partial<PaymentOrderUpdate>
  ): Promise<PaymentOrder> {
    const updates: PaymentOrderUpdate = {
      status,
      ...additionalData
    };

    // Set timestamp based on status
    if (status === 'payment_order.validated') {
      updates.validated_at = new Date().toISOString();
    } else if (status === 'payment_order.settled') {
      updates.settled_at = new Date().toISOString();
    }

    return this.updateOrder(paycrestOrderId, updates);
  }

  /**
   * Get order by PayCrest order ID
   */
  static async getOrderByPaycrestId(paycrestOrderId: string): Promise<PaymentOrder | null> {
    const { data, error } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .eq('paycrest_order_id', paycrestOrderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('Error fetching order:', error);
      throw new Error(`Failed to fetch order: ${error.message}`);
    }

    return data;
  }

  /**
   * Get orders by wallet address
   */
  static async getOrdersByWallet(
    walletAddress: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<PaymentOrder[]> {
    const { data, error } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user orders:', error);
      throw new Error(`Failed to fetch user orders: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get order statistics for a wallet
   */
  static async getWalletStats(walletAddress: string) {
    const { data, error } = await supabaseAdmin
      .from('payment_orders')
      .select('status, amount, local_amount, currency, created_at')
      .eq('wallet_address', walletAddress);

    if (error) {
      console.error('Error fetching wallet stats:', error);
      throw new Error(`Failed to fetch wallet stats: ${error.message}`);
    }

    const orders = data || [];
    
    return {
      total_transactions: orders.length,
      successful_transactions: orders.filter(o => o.status === 'payment_order.validated').length,
      pending_transactions: orders.filter(o => o.status === 'payment_order.pending').length,
      failed_transactions: orders.filter(o => 
        o.status === 'payment_order.refunded' || o.status === 'payment_order.expired'
      ).length,
      total_volume_usdc: orders.reduce((sum, o) => sum + Number(o.amount), 0),
      total_volume_local: orders.reduce((sum, o) => sum + Number(o.local_amount), 0),
      currencies_used: [...new Set(orders.map(o => o.currency))],
      first_transaction: orders.length > 0 ? orders[orders.length - 1].created_at : null,
      last_transaction: orders.length > 0 ? orders[0].created_at : null
    };
  }

  /**
   * Search orders by recipient phone number
   */
  static async searchOrdersByPhone(phoneNumber: string): Promise<PaymentOrder[]> {
    const { data, error } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .eq('recipient_phone', phoneNumber)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching orders by phone:', error);
      throw new Error(`Failed to search orders: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get recent orders (for admin/analytics)
   */
  static async getRecentOrders(limit: number = 50): Promise<PaymentOrder[]> {
    const { data, error } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent orders:', error);
      throw new Error(`Failed to fetch recent orders: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get orders by status
   */
  static async getOrdersByStatus(
    status: string,
    limit: number = 50
  ): Promise<PaymentOrder[]> {
    const { data, error } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching orders by status:', error);
      throw new Error(`Failed to fetch orders by status: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update transaction hash when blockchain transaction is sent
   */
  static async updateTransactionHash(
    paycrestOrderId: string,
    transactionHash: string,
    blockNumber?: number,
    gasUsed?: number
  ): Promise<PaymentOrder> {
    const updates: PaymentOrderUpdate = {
      transaction_hash: transactionHash,
      ...(blockNumber && { block_number: blockNumber }),
      ...(gasUsed && { gas_used: gasUsed })
    };

    return this.updateOrder(paycrestOrderId, updates);
  }

  /**
   * Mark order as failed with error details
   */
  static async markOrderFailed(
    paycrestOrderId: string,
    errorDetails: Record<string, unknown>
  ): Promise<PaymentOrder> {
    return this.updateOrder(paycrestOrderId, {
      status: 'payment_order.refunded',
      error_details: errorDetails
    });
  }

  /**
   * Get pending orders (for monitoring)
   */
  static async getPendingOrders(): Promise<PaymentOrder[]> {
    const { data, error } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .eq('status', 'payment_order.pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending orders:', error);
      throw new Error(`Failed to fetch pending orders: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete order (admin only, for testing)
   */
  static async deleteOrder(paycrestOrderId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('payment_orders')
      .delete()
      .eq('paycrest_order_id', paycrestOrderId);

    if (error) {
      console.error('Error deleting order:', error);
      throw new Error(`Failed to delete order: ${error.message}`);
    }

    console.log('Order deleted successfully:', paycrestOrderId);
  }
}