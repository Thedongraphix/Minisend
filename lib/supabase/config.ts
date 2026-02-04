import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client-side Supabase client (with RLS)
// Only create client if environment variables are available (prevents build-time errors)
export const supabase: SupabaseClient = (supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key'))

// Server-side Supabase client (bypasses RLS)
export const supabaseAdmin: SupabaseClient = (supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase)

// Database types
export interface User {
  id: string
  wallet_address: string
  phone_number?: string
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  paycrest_order_id: string
  user_id?: string
  wallet_address: string
  amount_in_usdc: number
  amount_in_local: number
  local_currency: 'KES' | 'NGN' | 'GHS' | 'UGX'
  phone_number?: string
  account_number?: string
  bank_code?: string
  bank_name?: string
  till_number?: string
  paybill_number?: string
  paybill_account?: string
  carrier?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'fulfilled' | 'validated' | 'settled' | 'refunded' | 'expired'
  paycrest_status?: string
  transaction_hash?: string
  reference_id?: string
  rate?: number
  network?: string
  token?: string
  receive_address?: string
  valid_until?: string
  sender_fee?: number
  transaction_fee?: number
  total_amount?: number
  institution_code?: string
  recipient_data?: Record<string, unknown>
  account_name?: string
  memo?: string
  fid?: number // Farcaster ID for push notifications (only present for Farcaster users)
  payment_provider?: 'PAYCREST_KES' | 'PAYCREST_NGN' | 'PRETIUM_KES' | 'PRETIUM_GHS' | 'PRETIUM_NGN'
  pretium_transaction_code?: string
  pretium_receipt_number?: string
  public_name?: string
  exchange_rate?: number
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface Settlement {
  id: string
  order_id: string
  paycrest_settlement_id?: string
  settlement_amount: number
  settlement_currency: string
  settlement_method?: string
  settled_at: string
  created_at: string
}

export interface WebhookEvent {
  id: string
  event_type: string
  paycrest_order_id?: string
  order_id?: string
  payload: Record<string, unknown>
  processed_at?: string
  created_at: string
}

export interface AnalyticsEvent {
  id: string
  user_id?: string
  wallet_address?: string
  event_name: string
  event_data?: Record<string, unknown>
  created_at: string
}

export interface PollingAttempt {
  id: string
  order_id: string
  paycrest_order_id: string
  status_returned?: string
  attempt_number: number
  response_data?: Record<string, unknown>
  created_at: string
}

export interface CarrierDetection {
  id: string
  phone_number: string
  detected_carrier?: string
  confidence_score?: number
  method_used?: string
  created_at: string
}

export interface PretiumOrder {
  id: string
  transaction_code: string
  user_id?: string
  wallet_address: string
  transaction_hash: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  pretium_status?: string
  amount_in_usdc: number
  amount_in_local: number
  local_currency: 'KES' | 'GHS' | 'NGN' | 'UGX'
  exchange_rate: number
  sender_fee: number
  payment_type: 'MOBILE' | 'BUY_GOODS' | 'PAYBILL' | 'BANK_TRANSFER'
  phone_number?: string
  till_number?: string
  paybill_number?: string
  paybill_account?: string
  account_number?: string
  bank_code?: string
  bank_name?: string
  account_name: string
  receipt_number?: string
  public_name?: string
  mobile_network?: string
  chain: string
  error_message?: string
  settlement_address?: string
  callback_url?: string
  fid?: number
  raw_disburse_request?: Record<string, unknown>
  raw_disburse_response?: Record<string, unknown>
  raw_webhook_payloads?: Record<string, unknown>[]
  created_at: string
  updated_at: string
  completed_at?: string
}

// Helper functions
export async function testConnection() {
  try {
    const { error } = await supabase.from('users').select('count').limit(1)
    if (error) throw error
    return { success: true, message: 'Successfully connected to Supabase' }
  } catch (error) {
    return { success: false, message: `Connection failed: ${error}` }
  }
}

export async function checkHealth() {
  try {
    // Test basic connection
    const { error: tablesError } = await supabaseAdmin
      .rpc('get_table_names')
      .single()
    
    if (tablesError) {
      // Fallback to simple query
      const { error } = await supabaseAdmin.from('users').select('count').limit(1)
      if (error) throw error
    }

    // Test each main table
    const tableChecks = await Promise.all([
      supabaseAdmin.from('users').select('count').limit(1),
      supabaseAdmin.from('orders').select('count').limit(1),
      supabaseAdmin.from('settlements').select('count').limit(1),
      supabaseAdmin.from('webhook_events').select('count').limit(1),
    ])

    const failedTables = tableChecks
      .map((check, i) => ({ table: ['users', 'orders', 'settlements', 'webhook_events'][i], error: check.error }))
      .filter(item => item.error)

    if (failedTables.length > 0) {
      return {
        success: false,
        message: `Health check failed for tables: ${failedTables.map(t => t.table).join(', ')}`,
        details: failedTables
      }
    }

    return {
      success: true,
      message: 'All database tables are accessible',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      message: `Health check failed: ${error}`,
      timestamp: new Date().toISOString()
    }
  }
}

// Paycrest API types
interface PaycrestOrderData {
  id: string
  status: string
  amount: string
  token: string
  network: string
  receiveAddress: string
  validUntil: string
  senderFee: number
  transactionFee: number
  totalAmount: number
  reference: string
  recipient?: {
    institution: string
    amount: string
    currency: string
    memo: string
  }
  rate?: number
}

interface PaycrestResponse {
  data: PaycrestOrderData
}

interface RequestData {
  amount: string
  phoneNumber?: string
  tillNumber?: string
  paybillNumber?: string
  paybillAccount?: string
  accountNumber?: string
  accountName: string
  currency: string
  returnAddress: string
  rate?: number
  provider?: string
  localAmount?: string
  institutionCode?: string
  fid?: number // Farcaster ID for push notifications (optional, only from Farcaster users)
  clientFid?: number // Client FID (9152 for Warpcast, etc.) - for tracking which app they're using
  platformType?: string // 'web' or 'mobile' - from context.client.platformType
  locationType?: string // 'launcher', 'cast_embed', etc. - from context.location.type
}

// Database operations
export class DatabaseService {
  // Users
  static async createUser(walletAddress: string, phoneNumber?: string): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({ wallet_address: walletAddress, phone_number: phoneNumber })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getUserByWallet(walletAddress: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  // Farcaster user profile management
  static async saveFarcasterProfile(profileData: {
    walletAddress: string
    fid: number
    username?: string
    displayName?: string
    pfpUrl?: string
  }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('farcaster_users')
      .upsert({
        wallet_address: profileData.walletAddress,
        fid: profileData.fid,
        username: profileData.username,
        display_name: profileData.displayName,
        pfp_url: profileData.pfpUrl
      }, {
        onConflict: 'wallet_address',
        ignoreDuplicates: false
      })

    if (error) throw error
  }

  // Orders - Enhanced for Paycrest compatibility
  static async createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async createOrderFromPaycrest(paycrestResponse: PaycrestResponse, requestData: RequestData): Promise<Order> {
    const order = paycrestResponse.data
    
    const orderData = {
      paycrest_order_id: order.id,
      wallet_address: requestData.returnAddress,
      amount_in_usdc: parseFloat(requestData.amount),
      amount_in_local: parseFloat(requestData.localAmount || (parseFloat(requestData.amount) * (requestData.rate || 0)).toString()),
      local_currency: requestData.currency as 'KES' | 'NGN',
      phone_number: requestData.phoneNumber,
      account_number: requestData.accountNumber,
      account_name: requestData.accountName,
      carrier: requestData.provider,
      status: 'pending' as const,
      paycrest_status: order.status,
      reference_id: order.reference,
      rate: parseFloat(String(requestData.rate || order.rate || 0)),
      network: order.network || 'base',
      token: order.token || 'USDC',
      receive_address: order.receiveAddress,
      valid_until: order.validUntil,
      sender_fee: parseFloat(String(order.senderFee || 0)),
      transaction_fee: parseFloat(String(order.transactionFee || 0)),
      total_amount: parseFloat(String(order.totalAmount || order.amount)),
      institution_code: requestData.institutionCode || order.recipient?.institution || (requestData.currency === 'KES' ? 'SAFAKEPC' : 'GTBINGLA'),
      recipient_data: order.recipient,
      memo: order.recipient?.memo,
      fid: requestData.fid,
      client_fid: requestData.clientFid,
      platform_type: requestData.platformType,
      location_type: requestData.locationType
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (error) throw error

    // Also store raw Paycrest data
    await this.logPaycrestOrder(data.id, order.id, requestData, paycrestResponse)

    return data
  }

  static async updateOrderStatus(paycrestOrderId: string, status: Order['status'], paycrestStatus?: string, additionalData?: Record<string, unknown>): Promise<Order> {
    const updateData: Record<string, unknown> = { 
      status, 
      paycrest_status: paycrestStatus,
      ...additionalData
    }
    
    if (['completed', 'settled', 'fulfilled'].includes(status)) {
      updateData.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('paycrest_order_id', paycrestOrderId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getOrderByPaycrestId(paycrestOrderId: string): Promise<Order | null> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('paycrest_order_id', paycrestOrderId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async getRecentOrders(limit = 50): Promise<Order[]> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  static async getOrdersByWallet(walletAddress: string, limit = 50): Promise<Order[]> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // Paycrest-specific operations
  static async logPaycrestOrder(orderId: string, paycrestOrderId: string, requestData: RequestData, responseData: PaycrestResponse): Promise<void> {
    const { error } = await supabaseAdmin
      .from('paycrest_orders')
      .insert({
        order_id: orderId,
        paycrest_order_id: paycrestOrderId,
        raw_request_data: requestData,
        raw_response_data: responseData,
        paycrest_status: responseData.data?.status || 'unknown'
      })

    if (error) throw error
  }

  static async logStatusChange(orderId: string, paycrestOrderId: string, oldStatus: string, newStatus: string, paycrestStatus?: string, statusData?: Record<string, unknown>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('status_history')
      .insert({
        order_id: orderId,
        paycrest_order_id: paycrestOrderId,
        old_status: oldStatus,
        new_status: newStatus,
        paycrest_status: paycrestStatus,
        status_data: statusData
      })

    if (error) throw error
  }

  static async logFee(orderId: string, feeType: string, amount: number, currency: string, description?: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('fees')
      .insert({
        order_id: orderId,
        fee_type: feeType,
        amount: amount,
        currency: currency,
        description: description
      })

    if (error) throw error
  }

  // Carrier detection
  static async logCarrierDetection(phoneNumber: string, detectedCarrier: string, institutionCode?: string, paycrestProvider?: string, confidenceScore?: number, methodUsed?: string): Promise<CarrierDetection> {
    const { data, error } = await supabaseAdmin
      .from('carrier_detections')
      .insert({
        phone_number: phoneNumber,
        detected_carrier: detectedCarrier,
        institution_code: institutionCode,
        paycrest_provider: paycrestProvider,
        confidence_score: confidenceScore,
        method_used: methodUsed
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Webhook Events
  static async logWebhookEvent(eventType: string, paycrestOrderId: string, payload: Record<string, unknown>): Promise<WebhookEvent> {
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .insert({
        event_type: eventType,
        paycrest_order_id: paycrestOrderId,
        payload
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Analytics
  static async logAnalyticsEvent(eventName: string, walletAddress?: string, eventData?: Record<string, unknown>): Promise<AnalyticsEvent> {
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .insert({
        event_name: eventName,
        wallet_address: walletAddress,
        event_data: eventData
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Settlements
  static async createSettlement(settlementData: Omit<Settlement, 'id' | 'created_at'>): Promise<Settlement> {
    const { data, error } = await supabaseAdmin
      .from('settlements')
      .insert(settlementData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Polling
  static async logPollingAttempt(orderId: string, paycrestOrderId: string, attemptNumber: number, statusReturned?: string, responseData?: Record<string, unknown>): Promise<PollingAttempt> {
    const { data, error} = await supabaseAdmin
      .from('polling_attempts')
      .insert({
        order_id: orderId,
        paycrest_order_id: paycrestOrderId,
        attempt_number: attemptNumber,
        status_returned: statusReturned,
        response_data: responseData
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Pretium-specific methods (using dedicated pretium_orders table)
  static async createPretiumOrder(orderData: {
    transactionCode: string;
    userId: string;
    walletAddress: string;
    amountInUsdc: number;
    amountInLocal: number;
    currency: 'KES' | 'GHS' | 'NGN' | 'UGX';
    phoneNumber?: string;
    tillNumber?: string;
    paybillNumber?: string;
    paybillAccount?: string;
    accountNumber?: string;
    bankCode?: string;
    bankName?: string;
    accountName: string;
    rate: number;
    transactionHash: string;
    status: string;
    pretiumStatus: string;
    fee: number;
    fid?: number;
    mobileNetwork?: string;
    settlementAddress?: string;
    callbackUrl?: string;
    rawDisburseRequest?: Record<string, unknown>;
    rawDisburseResponse?: Record<string, unknown>;
  }): Promise<PretiumOrder> {
    // Determine payment type
    let paymentType: 'MOBILE' | 'BUY_GOODS' | 'PAYBILL' | 'BANK_TRANSFER' = 'MOBILE';
    if (orderData.tillNumber) {
      paymentType = 'BUY_GOODS';
    } else if (orderData.paybillNumber) {
      paymentType = 'PAYBILL';
    } else if (orderData.accountNumber && orderData.currency === 'NGN') {
      paymentType = 'BANK_TRANSFER';
    }

    const { data, error} = await supabaseAdmin
      .from('pretium_orders')
      .insert({
        transaction_code: orderData.transactionCode,
        user_id: orderData.userId,
        wallet_address: orderData.walletAddress,
        transaction_hash: orderData.transactionHash,
        status: orderData.status,
        pretium_status: orderData.pretiumStatus,
        amount_in_usdc: orderData.amountInUsdc,
        amount_in_local: orderData.amountInLocal,
        local_currency: orderData.currency,
        exchange_rate: orderData.rate,
        sender_fee: orderData.fee,
        payment_type: paymentType,
        phone_number: orderData.phoneNumber,
        account_number: orderData.accountNumber,
        bank_code: orderData.bankCode,
        bank_name: orderData.bankName,
        till_number: orderData.tillNumber,
        paybill_number: orderData.paybillNumber,
        paybill_account: orderData.paybillAccount,
        account_name: orderData.accountName,
        mobile_network: orderData.mobileNetwork || null,
        chain: 'BASE',
        settlement_address: orderData.settlementAddress,
        callback_url: orderData.callbackUrl,
        fid: orderData.fid,
        raw_disburse_request: orderData.rawDisburseRequest,
        raw_disburse_response: orderData.rawDisburseResponse
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updatePretiumOrderStatus(
    transactionCode: string,
    status: string,
    pretiumStatus: string,
    receiptNumber?: string,
    publicName?: string,
    errorMessage?: string,
    webhookPayload?: Record<string, unknown>
  ): Promise<PretiumOrder> {
    const updateData: Record<string, unknown> = {
      status,
      pretium_status: pretiumStatus,
      updated_at: new Date().toISOString()
    };

    if (receiptNumber) {
      updateData.receipt_number = receiptNumber;
    }

    if (publicName) {
      updateData.public_name = publicName;
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    // Append webhook payload to raw_webhook_payloads array if provided
    if (webhookPayload) {
      // First get current order to append to existing payloads
      const currentOrder = await this.getPretiumOrderByTransactionCode(transactionCode);
      const existingPayloads = currentOrder?.raw_webhook_payloads || [];
      updateData.raw_webhook_payloads = [...existingPayloads, webhookPayload];
    }

    const { data, error } = await supabaseAdmin
      .from('pretium_orders')
      .update(updateData)
      .eq('transaction_code', transactionCode)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getPretiumOrderByTransactionCode(transactionCode: string): Promise<PretiumOrder | null> {
    const { data, error } = await supabaseAdmin
      .from('pretium_orders')
      .select('*')
      .eq('transaction_code', transactionCode)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async getPretiumOrdersByWalletAddress(walletAddress: string, limit = 50): Promise<PretiumOrder[]> {
    const { data, error } = await supabaseAdmin
      .from('pretium_orders')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  static async getRecentPretiumOrders(limit = 50): Promise<PretiumOrder[]> {
    const { data, error } = await supabaseAdmin
      .from('pretium_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  static async getPretiumOrdersByStatus(status: string, limit = 50): Promise<PretiumOrder[]> {
    const { data, error } = await supabaseAdmin
      .from('pretium_orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // Unified method to get all orders (both Pretium and PayCrest) for a wallet
  static async getOrdersByWalletAddress(walletAddress: string, limit = 100): Promise<(Order | PretiumOrder)[]> {
    // Fetch both Pretium orders and PayCrest orders
    const pretiumOrders = await this.getPretiumOrdersByWalletAddress(walletAddress, limit);
    const paycrestOrders = await this.getOrdersByWallet(walletAddress, limit);

    // Combine and return
    const allOrders = [...pretiumOrders, ...paycrestOrders];
    return allOrders;
  }

  // Legacy compatibility method - checks both old and new tables
  static async getOrderByPretiumTransactionCode(transactionCode: string): Promise<Order | PretiumOrder | null> {
    // First try new pretium_orders table
    const pretiumOrder = await this.getPretiumOrderByTransactionCode(transactionCode);
    if (pretiumOrder) return pretiumOrder;

    // Fall back to old orders table for legacy data
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('pretium_transaction_code', transactionCode)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  // Dashboard query methods
  static async getDashboardStats() {
    // Fetch all orders using pagination (Supabase defaults to 1000 row limit)
    const PAGE_SIZE = 1000;
    let allOrders: PretiumOrder[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabaseAdmin
        .from('pretium_orders')
        .select('*')
        .range(from, to)

      if (error) throw error

      const rows = data || [];
      allOrders = allOrders.concat(rows);

      if (rows.length < PAGE_SIZE) {
        hasMore = false;
      }
      page++;
    }

    const orders = allOrders;
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const failedOrders = orders.filter(o => o.status === 'failed').length;
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

    const now = new Date();
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const stuckOrders = orders.filter(o =>
      (o.status === 'pending' || o.status === 'processing') &&
      new Date(o.created_at) < thirtyMinsAgo
    ).length;

    const totalUSDCVolume = orders.reduce((sum, o) => sum + (Number(o.amount_in_usdc) || 0), 0);
    const totalKESVolume = orders.reduce((sum, o) => sum + (Number(o.amount_in_local) || 0), 0);
    const avgFee = orders.length > 0
      ? orders.reduce((sum, o) => sum + (Number(o.sender_fee) || 0), 0) / orders.length
      : 0;

    const completedWithTime = orders.filter(o => o.status === 'completed' && o.created_at && o.completed_at);
    const avgCompletionTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, o) => {
          const created = new Date(o.created_at).getTime();
          const completed = new Date(o.completed_at!).getTime();
          return sum + (completed - created);
        }, 0) / completedWithTime.length / 1000
      : 0;

    const successRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    const failureReasons = orders
      .filter(o => o.status === 'failed' && o.error_message)
      .reduce((acc: Record<string, number>, o) => {
        const reason = o.error_message || 'Unknown error';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});

    const failureReasonsArray = Object.entries(failureReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalOrders,
      successRate: Math.round(successRate * 10) / 10,
      failedOrders,
      pendingOrders,
      totalUSDCVolume: Math.round(totalUSDCVolume * 100) / 100,
      totalKESVolume: Math.round(totalKESVolume),
      avgFee: Math.round(avgFee * 100) / 100,
      avgCompletionTime: Math.round(avgCompletionTime),
      stuckOrders,
      failureReasons: failureReasonsArray,
    };
  }

  static async getFilteredPretiumOrders(filters: {
    search?: string;
    status?: string[];
    paymentType?: string[];
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      status,
      paymentType,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = filters;

    let query = supabaseAdmin
      .from('pretium_orders')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`transaction_code.ilike.%${search}%,wallet_address.ilike.%${search}%,transaction_hash.ilike.%${search}%,phone_number.eq.${search},till_number.eq.${search},paybill_number.eq.${search},account_name.ilike.%${search}%,receipt_number.ilike.%${search}%`);
    }

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    if (paymentType && paymentType.length > 0) {
      query = query.in('payment_type', paymentType);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      orders: data || [],
      total: count || 0,
      page,
      hasMore: count ? offset + limit < count : false,
    };
  }

  // --- Unified Dashboard Methods (Paycrest + Pretium) ---

  private static normalizePaycrestStatus(status: string): 'completed' | 'failed' | 'pending' | 'processing' {
    if (['completed', 'settled', 'fulfilled'].includes(status)) return 'completed';
    if (['failed', 'cancelled', 'refunded', 'expired'].includes(status)) return 'failed';
    if (status === 'processing') return 'processing';
    return 'pending';
  }

  private static normalizePretiumOrder(order: PretiumOrder): import('@/lib/types/dashboard').UnifiedOrder {
    return {
      id: order.id,
      provider: 'pretium',
      orderId: order.transaction_code,
      walletAddress: order.wallet_address,
      transactionHash: order.transaction_hash,
      status: order.status,
      normalizedStatus: order.status === 'completed' ? 'completed'
        : order.status === 'failed' || order.status === 'cancelled' ? 'failed'
        : order.status === 'processing' ? 'processing' : 'pending',
      amountInUsdc: Number(order.amount_in_usdc) || 0,
      amountInLocal: Number(order.amount_in_local) || 0,
      localCurrency: order.local_currency,
      exchangeRate: Number(order.exchange_rate) || undefined,
      senderFee: Number(order.sender_fee) || 0,
      paymentType: order.payment_type || 'MOBILE',
      destination: order.phone_number || order.till_number || order.paybill_number || order.account_number || '',
      accountName: order.account_name,
      receiptNumber: order.receipt_number,
      fid: order.fid,
      createdAt: order.created_at,
      completedAt: order.completed_at,
      raw: order,
    };
  }

  private static normalizePaycrestOrder(order: Order): import('@/lib/types/dashboard').UnifiedOrder {
    return {
      id: order.id,
      provider: 'paycrest',
      orderId: order.paycrest_order_id,
      walletAddress: order.wallet_address,
      transactionHash: order.transaction_hash,
      status: order.status,
      normalizedStatus: this.normalizePaycrestStatus(order.status),
      amountInUsdc: Number(order.amount_in_usdc) || 0,
      amountInLocal: Number(order.amount_in_local) || 0,
      localCurrency: order.local_currency,
      exchangeRate: Number(order.rate) || Number(order.exchange_rate) || undefined,
      senderFee: Number(order.sender_fee) || 0,
      paymentType: order.account_number ? 'BANK_TRANSFER' : order.phone_number ? 'MOBILE' : 'BANK_TRANSFER',
      destination: order.phone_number || order.account_number || '',
      accountName: order.account_name,
      receiptNumber: order.pretium_receipt_number,
      fid: order.fid,
      createdAt: order.created_at,
      completedAt: order.completed_at,
      raw: order,
    };
  }

  private static async fetchAllFromTable<T>(tableName: string, dateRange?: { start?: string; end?: string }): Promise<T[]> {
    const PAGE_SIZE = 1000;
    let allRows: T[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabaseAdmin.from(tableName).select('*').range(from, to);

      if (dateRange?.start) query = query.gte('created_at', dateRange.start);
      if (dateRange?.end) query = query.lt('created_at', dateRange.end);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as T[];
      allRows = allRows.concat(rows);

      if (rows.length < PAGE_SIZE) hasMore = false;
      page++;
    }

    return allRows;
  }

  static async getUnifiedDashboardStats(dateRange?: { start?: string; end?: string }): Promise<import('@/lib/types/dashboard').UnifiedDashboardStats> {
    // Fetch both tables in parallel
    const [pretiumOrders, paycrestOrders, newUsersData] = await Promise.all([
      this.fetchAllFromTable<PretiumOrder>('pretium_orders', dateRange),
      this.fetchAllFromTable<Order>('orders', dateRange),
      (async () => {
        let query = supabaseAdmin.from('minisend_users').select('*', { count: 'exact' });
        if (dateRange?.start) query = query.gte('created_at', dateRange.start);
        if (dateRange?.end) query = query.lt('created_at', dateRange.end);
        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
      })(),
    ]);

    // Pretium stats
    const pretiumCompleted = pretiumOrders.filter(o => o.status === 'completed').length;
    const pretiumFailed = pretiumOrders.filter(o => o.status === 'failed' || o.status === 'cancelled').length;
    const pretiumVolume = pretiumOrders.reduce((sum, o) => sum + (Number(o.amount_in_usdc) || 0), 0);

    // Paycrest stats
    const paycrestCompleted = paycrestOrders.filter(o => ['completed', 'settled', 'fulfilled'].includes(o.status)).length;
    const paycrestFailed = paycrestOrders.filter(o => ['failed', 'cancelled', 'refunded', 'expired'].includes(o.status)).length;
    const paycrestVolume = paycrestOrders.reduce((sum, o) => sum + (Number(o.amount_in_usdc) || 0), 0);

    // Combined
    const totalOrders = pretiumOrders.length + paycrestOrders.length;
    const totalCompleted = pretiumCompleted + paycrestCompleted;
    const totalFailed = pretiumFailed + paycrestFailed;
    const totalVolume = pretiumVolume + paycrestVolume;
    const successRate = totalOrders > 0 ? (totalCompleted / totalOrders) * 100 : 0;

    // Pending/processing
    const pretiumPending = pretiumOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    const paycrestPending = paycrestOrders.filter(o => ['pending', 'processing', 'validated'].includes(o.status)).length;
    const pendingOrders = pretiumPending + paycrestPending;

    // Stuck orders (pending > 30 min)
    const now = new Date();
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const stuckPretium = pretiumOrders.filter(o =>
      (o.status === 'pending' || o.status === 'processing') &&
      new Date(o.created_at) < thirtyMinsAgo
    ).length;
    const stuckPaycrest = paycrestOrders.filter(o =>
      ['pending', 'processing', 'validated'].includes(o.status) &&
      new Date(o.created_at) < thirtyMinsAgo
    ).length;

    // Unique wallets
    const walletSet = new Set<string>();
    pretiumOrders.forEach(o => walletSet.add(o.wallet_address));
    paycrestOrders.forEach(o => walletSet.add(o.wallet_address));

    // Revenue (fees)
    const pretiumFees = pretiumOrders.reduce((sum, o) => sum + (Number(o.sender_fee) || 0), 0);
    const paycrestFees = paycrestOrders.reduce((sum, o) => sum + (Number(o.sender_fee) || 0) + (Number(o.transaction_fee) || 0), 0);

    // Avg completion time
    const allCompletedWithTime = [
      ...pretiumOrders.filter(o => o.status === 'completed' && o.created_at && o.completed_at),
      ...paycrestOrders.filter(o => ['completed', 'settled', 'fulfilled'].includes(o.status) && o.created_at && o.completed_at),
    ];
    const avgCompletionTime = allCompletedWithTime.length > 0
      ? allCompletedWithTime.reduce((sum, o) => {
          return sum + (new Date(o.completed_at!).getTime() - new Date(o.created_at).getTime());
        }, 0) / allCompletedWithTime.length / 1000
      : 0;

    // Currency breakdown
    const currencies: Record<string, import('@/lib/types/dashboard').CurrencyStats> = {};
    const addCurrency = (currency: string, usdc: number, local: number) => {
      if (!currencies[currency]) currencies[currency] = { orders: 0, volume: 0, localVolume: 0 };
      currencies[currency].orders++;
      currencies[currency].volume += usdc;
      currencies[currency].localVolume += local;
    };
    pretiumOrders.forEach(o => addCurrency(o.local_currency, Number(o.amount_in_usdc) || 0, Number(o.amount_in_local) || 0));
    paycrestOrders.forEach(o => addCurrency(o.local_currency, Number(o.amount_in_usdc) || 0, Number(o.amount_in_local) || 0));

    // Monthly trends
    const monthlyMap = new Map<string, { pretiumVolume: number; paycrestVolume: number; orderCount: number }>();
    const addMonthly = (createdAt: string, provider: 'pretium' | 'paycrest', usdc: number) => {
      const date = new Date(createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(key)) monthlyMap.set(key, { pretiumVolume: 0, paycrestVolume: 0, orderCount: 0 });
      const entry = monthlyMap.get(key)!;
      if (provider === 'pretium') entry.pretiumVolume += usdc;
      else entry.paycrestVolume += usdc;
      entry.orderCount++;
    };
    pretiumOrders.forEach(o => addMonthly(o.created_at, 'pretium', Number(o.amount_in_usdc) || 0));
    paycrestOrders.forEach(o => addMonthly(o.created_at, 'paycrest', Number(o.amount_in_usdc) || 0));

    const monthlyTrends = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        pretiumVolume: Math.round(data.pretiumVolume * 100) / 100,
        paycrestVolume: Math.round(data.paycrestVolume * 100) / 100,
        totalVolume: Math.round((data.pretiumVolume + data.paycrestVolume) * 100) / 100,
        orderCount: data.orderCount,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalOrders,
      successRate: Math.round(successRate * 10) / 10,
      failedOrders: totalFailed,
      pendingOrders,
      totalUSDCVolume: Math.round(totalVolume * 100) / 100,
      uniqueWallets: walletSet.size,
      newUsers: newUsersData,
      totalRevenue: Math.round((pretiumFees + paycrestFees) * 100) / 100,
      stuckOrders: stuckPretium + stuckPaycrest,
      avgCompletionTime: Math.round(avgCompletionTime),
      providers: {
        pretium: {
          total: pretiumOrders.length,
          completed: pretiumCompleted,
          failed: pretiumFailed,
          volume: Math.round(pretiumVolume * 100) / 100,
          successRate: pretiumOrders.length > 0 ? Math.round((pretiumCompleted / pretiumOrders.length) * 1000) / 10 : 0,
        },
        paycrest: {
          total: paycrestOrders.length,
          completed: paycrestCompleted,
          failed: paycrestFailed,
          volume: Math.round(paycrestVolume * 100) / 100,
          successRate: paycrestOrders.length > 0 ? Math.round((paycrestCompleted / paycrestOrders.length) * 1000) / 10 : 0,
        },
      },
      currencies,
      monthlyTrends,
    };
  }

  static async getUnifiedFilteredOrders(filters: import('@/lib/types/dashboard').UnifiedFilters) {
    const {
      search,
      status,
      paymentType,
      provider = 'all',
      currency,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    let pretiumResults: PretiumOrder[] = [];
    let paycrestResults: Order[] = [];

    // Fetch Pretium orders
    if (provider === 'all' || provider === 'pretium') {
      let query = supabaseAdmin.from('pretium_orders').select('*');

      if (search) {
        query = query.or(`transaction_code.ilike.%${search}%,wallet_address.ilike.%${search}%,transaction_hash.ilike.%${search}%,phone_number.eq.${search},till_number.eq.${search},paybill_number.eq.${search},account_name.ilike.%${search}%,receipt_number.ilike.%${search}%`);
      }
      if (status && status.length > 0) {
        query = query.in('status', status);
      }
      if (paymentType && paymentType.length > 0) {
        const pretiumTypes = paymentType.filter(t => ['MOBILE', 'BUY_GOODS', 'PAYBILL'].includes(t));
        if (pretiumTypes.length > 0) {
          query = query.in('payment_type', pretiumTypes);
        } else if (!paymentType.includes('BANK_TRANSFER')) {
          // If only BANK_TRANSFER selected, skip pretium
          pretiumResults = [];
          query = null as never;
        }
      }
      if (currency && currency.length > 0) {
        query = query?.in('local_currency', currency);
      }
      if (startDate) query = query?.gte('created_at', startDate);
      if (endDate) query = query?.lte('created_at', endDate);

      if (query) {
        const { data, error } = await query;
        if (error) throw error;
        pretiumResults = data || [];
      }
    }

    // Fetch Paycrest orders
    if (provider === 'all' || provider === 'paycrest') {
      let query = supabaseAdmin.from('orders').select('*');

      if (search) {
        query = query.or(`paycrest_order_id.ilike.%${search}%,wallet_address.ilike.%${search}%,transaction_hash.ilike.%${search}%,phone_number.eq.${search},account_number.eq.${search},account_name.ilike.%${search}%`);
      }
      if (status && status.length > 0) {
        // Map normalized statuses to Paycrest statuses
        const paycrestStatuses: string[] = [];
        if (status.includes('completed')) paycrestStatuses.push('completed', 'settled', 'fulfilled');
        if (status.includes('failed')) paycrestStatuses.push('failed', 'cancelled', 'refunded', 'expired');
        if (status.includes('pending')) paycrestStatuses.push('pending');
        if (status.includes('processing')) paycrestStatuses.push('processing', 'validated');
        if (paycrestStatuses.length > 0) {
          query = query.in('status', paycrestStatuses);
        }
      }
      if (paymentType && paymentType.length > 0) {
        // Paycrest orders are all bank transfers for NGN
        if (!paymentType.includes('BANK_TRANSFER')) {
          paycrestResults = [];
          query = null as never;
        }
      }
      if (currency && currency.length > 0) {
        query = query?.in('local_currency', currency);
      }
      if (startDate) query = query?.gte('created_at', startDate);
      if (endDate) query = query?.lte('created_at', endDate);

      if (query) {
        const { data, error } = await query;
        if (error) throw error;
        paycrestResults = data || [];
      }
    }

    // Normalize and merge
    const unified: import('@/lib/types/dashboard').UnifiedOrder[] = [
      ...pretiumResults.map(o => this.normalizePretiumOrder(o)),
      ...paycrestResults.map(o => this.normalizePaycrestOrder(o)),
    ];

    // Sort by createdAt desc
    unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const total = unified.length;
    const offset = (page - 1) * limit;
    const paginatedOrders = unified.slice(offset, offset + limit);

    return {
      orders: paginatedOrders,
      total,
      page,
      hasMore: offset + limit < total,
    };
  }
}