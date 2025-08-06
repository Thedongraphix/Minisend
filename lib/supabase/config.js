// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client (with RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper functions
async function testConnection() {
  try {
    const { error } = await supabase.from('users').select('count').limit(1)
    if (error) throw error
    return { success: true, message: 'Successfully connected to Supabase' }
  } catch (error) {
    return { success: false, message: `Connection failed: ${error.message}` }
  }
}

async function checkHealth() {
  try {
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
      message: `Health check failed: ${error.message}`,
      timestamp: new Date().toISOString()
    }
  }
}

// Database operations
class DatabaseService {
  // Users
  static async createUser(walletAddress, phoneNumber) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({ wallet_address: walletAddress, phone_number: phoneNumber })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getUserByWallet(walletAddress) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  // Orders
  static async createOrder(orderData) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async createOrderFromPaycrest(paycrestResponse, requestData) {
    const order = paycrestResponse.data
    
    const orderData = {
      paycrest_order_id: order.id,
      wallet_address: requestData.returnAddress,
      amount_in_usdc: parseFloat(requestData.amount),
      amount_in_local: parseFloat(order.recipient?.amount || requestData.amount),
      local_currency: requestData.currency,
      phone_number: requestData.phoneNumber,
      account_name: requestData.accountName,
      carrier: requestData.provider,
      status: 'pending',
      paycrest_status: order.status,
      reference_id: order.reference,
      rate: parseFloat(requestData.rate || order.rate),
      network: order.network || 'base',
      token: order.token || 'USDC',
      receive_address: order.receiveAddress,
      valid_until: order.validUntil,
      sender_fee: parseFloat(order.senderFee || 0),
      transaction_fee: parseFloat(order.transactionFee || 0),
      total_amount: parseFloat(order.totalAmount || order.amount),
      institution_code: order.recipient?.institution,
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

  static async updateOrderStatus(paycrestOrderId, status, paycrestStatus, additionalData) {
    const updateData = { 
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

  static async getOrderByPaycrestId(paycrestOrderId) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('paycrest_order_id', paycrestOrderId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async getRecentOrders(limit = 50) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // Webhook Events
  static async logWebhookEvent(eventType, paycrestOrderId, payload) {
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
  static async logAnalyticsEvent(eventName, walletAddress, eventData) {
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

  // Polling
  static async logPollingAttempt(orderId, paycrestOrderId, attemptNumber, statusReturned, responseData) {
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

  // Paycrest-specific operations
  static async logPaycrestOrder(orderId, paycrestOrderId, requestData, responseData) {
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

  // Carrier detection
  static async logCarrierDetection(phoneNumber, detectedCarrier, institutionCode, paycrestProvider, confidenceScore, methodUsed) {
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
}

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  checkHealth,
  DatabaseService
}