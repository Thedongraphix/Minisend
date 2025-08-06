#!/usr/bin/env node

/**
 * Direct Database Test - Simulates a payment flow without API calls
 * Tests if the database correctly records payment data
 */

require('dotenv').config()
const { DatabaseService, checkHealth } = require('./lib/supabase/config')
const { detectKenyanCarrier } = require('./lib/utils/phoneCarrier')

// Mock Paycrest API response
const mockPaycrestResponse = {
  status: "success",
  message: "Order created successfully",
  data: {
    id: "test_" + Date.now(),
    amount: "10",
    token: "USDC",
    network: "base",
    receiveAddress: "0x1234567890123456789012345678901234567890",
    validUntil: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    senderFee: 0.1,
    transactionFee: 0.05,
    totalAmount: 10.15,
    status: "pending",
    reference: "test_ref_" + Date.now(),
    recipient: {
      institution: "SAFAKEPC",
      accountIdentifier: "254712345678",
      accountName: "John Test",
      currency: "KES",
      amount: 1300,
      memo: "Test payment"
    }
  }
}

const mockRequestData = {
  amount: "10",
  phoneNumber: "254712345678",
  accountName: "John Test",
  currency: "KES",
  returnAddress: "0x742d35Cc643C63A9FBC0eC4d6D1a32eC7c8A9cbF",
  rate: 130,
  provider: "MPESA"
}

async function simulatePaymentFlow() {
  console.log('🧪 PAYMENT SIMULATION TEST')
  console.log('========================\n')

  try {
    // 1. Test database health
    console.log('1️⃣ Testing database health...')
    const health = await checkHealth()
    if (!health.success) {
      throw new Error(`Database health check failed: ${health.message}`)
    }
    console.log('✅ Database is healthy\n')

    // 2. Simulate carrier detection
    console.log('2️⃣ Simulating carrier detection...')
    const carrier = detectKenyanCarrier(mockRequestData.phoneNumber)
    console.log(`📱 Detected carrier: ${carrier} for ${mockRequestData.phoneNumber}`)
    
    const carrierDetection = await DatabaseService.logCarrierDetection(
      mockRequestData.phoneNumber,
      carrier,
      'SAFAKEPC',
      'MPESA',
      0.95,
      'prefix_detection'
    )
    console.log(`✅ Carrier detection logged with ID: ${carrierDetection.id}\n`)

    // 3. Simulate order creation
    console.log('3️⃣ Simulating order creation...')
    console.log(`💰 Creating order: $${mockRequestData.amount} USDC → ${mockPaycrestResponse.data.recipient.amount} ${mockRequestData.currency}`)
    
    const order = await DatabaseService.createOrderFromPaycrest(mockPaycrestResponse, mockRequestData)
    console.log(`✅ Order created in database with ID: ${order.id}`)
    console.log(`📊 Order details:`)
    console.log(`   - Paycrest ID: ${order.paycrest_order_id}`)
    console.log(`   - Status: ${order.status}`)
    console.log(`   - Amount USDC: ${order.amount_in_usdc}`)
    console.log(`   - Amount Local: ${order.amount_in_local} ${order.local_currency}`)
    console.log(`   - Phone: ${order.phone_number}`)
    console.log(`   - Wallet: ${order.wallet_address}`)
    console.log(`   - Rate: ${order.rate}`)
    console.log(`   - Network: ${order.network}`)
    console.log(`   - Institution: ${order.institution_code}`)
    console.log(`   - Receive Address: ${order.receive_address}`)
    console.log(`   - Valid Until: ${order.valid_until}`)
    console.log(`   - Sender Fee: ${order.sender_fee}`)
    console.log(`   - Transaction Fee: ${order.transaction_fee}`)
    console.log(`   - Total Amount: ${order.total_amount}\n`)

    // 4. Log analytics event
    console.log('4️⃣ Logging analytics event...')
    const analyticsEvent = await DatabaseService.logAnalyticsEvent(
      'order_created',
      mockRequestData.returnAddress,
      {
        paycrest_order_id: order.paycrest_order_id,
        amount_usdc: parseFloat(mockRequestData.amount),
        amount_local: mockPaycrestResponse.data.recipient.amount,
        currency: mockRequestData.currency,
        carrier: carrier,
        institution: 'SAFAKEPC'
      }
    )
    console.log(`✅ Analytics event logged with ID: ${analyticsEvent.id}\n`)

    // 5. Simulate status updates
    console.log('5️⃣ Simulating status updates...')
    
    // Update to processing
    console.log('📊 Updating status to processing...')
    const updatedOrder1 = await DatabaseService.updateOrderStatus(
      order.paycrest_order_id,
      'processing',
      'processing'
    )
    console.log(`✅ Status updated to: ${updatedOrder1.status}`)

    // Simulate some polling attempts
    console.log('🔄 Logging polling attempts...')
    await DatabaseService.logPollingAttempt(
      order.id,
      order.paycrest_order_id,
      1,
      'processing',
      { message: 'Status check #1', timestamp: new Date().toISOString() }
    )
    
    await DatabaseService.logPollingAttempt(
      order.id,
      order.paycrest_order_id,
      2,
      'processing',
      { message: 'Status check #2', timestamp: new Date().toISOString() }
    )
    console.log('✅ Polling attempts logged')

    // Update to completed
    console.log('🎉 Updating status to completed...')
    const updatedOrder2 = await DatabaseService.updateOrderStatus(
      order.paycrest_order_id,
      'completed',
      'settled',
      {
        transaction_hash: '0xabcdef1234567890abcdef1234567890abcdef12',
        completed_at: new Date().toISOString()
      }
    )
    console.log(`✅ Final status: ${updatedOrder2.status} (Paycrest: ${updatedOrder2.paycrest_status})`)
    console.log(`🔗 Transaction hash: ${updatedOrder2.transaction_hash}`)
    console.log(`⏰ Completed at: ${updatedOrder2.completed_at}\n`)

    // 6. Test data retrieval
    console.log('6️⃣ Testing data retrieval...')
    
    // Get order by Paycrest ID
    const retrievedOrder = await DatabaseService.getOrderByPaycrestId(order.paycrest_order_id)
    console.log(`✅ Order retrieved: ${retrievedOrder ? 'Found' : 'Not found'}`)
    
    // Get recent orders
    const recentOrders = await DatabaseService.getRecentOrders(5)
    console.log(`✅ Recent orders count: ${recentOrders.length}`)
    
    // Display the recent orders
    console.log('\n📊 RECENT ORDERS:')
    recentOrders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.paycrest_order_id}`)
      console.log(`   Status: ${order.status} (${order.paycrest_status})`)
      console.log(`   Amount: $${order.amount_in_usdc} USDC → ${order.amount_in_local} ${order.local_currency}`)
      console.log(`   Phone: ${order.phone_number}`)
      console.log(`   Created: ${order.created_at}`)
      console.log('')
    })

    // 7. Success summary
    console.log('🎉 PAYMENT SIMULATION COMPLETED SUCCESSFULLY!')
    console.log('=' .repeat(50))
    console.log('✅ Database connection: Working')
    console.log('✅ Carrier detection: Working')
    console.log('✅ Order creation: Working')
    console.log('✅ Status updates: Working')
    console.log('✅ Analytics logging: Working')
    console.log('✅ Polling tracking: Working')
    console.log('✅ Data retrieval: Working')
    console.log('')
    console.log('🚀 Your database is ready to record real Paycrest payments!')
    console.log('📱 When users make payments, all data will be automatically logged')
    console.log('📊 Check your Supabase dashboard to see the test data')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the simulation
simulatePaymentFlow()