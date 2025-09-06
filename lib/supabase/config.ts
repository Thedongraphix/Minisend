import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client-side Supabase client (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase

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
  local_currency: 'KES' | 'NGN'
  phone_number?: string
  account_number?: string
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
      memo: order.recipient?.memo
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
    const { data, error } = await supabaseAdmin
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
}