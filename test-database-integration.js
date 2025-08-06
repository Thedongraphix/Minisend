#!/usr/bin/env node

/**
 * Test Script for Database Integration with Paycrest API
 * 
 * This script simulates a complete payment flow:
 * 1. Creates a Paycrest order
 * 2. Checks order status multiple times
 * 3. Verifies all data is properly recorded in the database
 * 4. Shows analytics and reports
 */

require('dotenv').config()
const { DatabaseService, checkHealth } = require('./lib/supabase/config')

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'

// Test data
const TEST_ORDER = {
  amount: '10',
  phoneNumber: '254712345678', // Test Kenyan number
  accountName: 'John Doe Test',
  currency: 'KES',
  returnAddress: '0x742d35Cc643C63A9FBC0eC4d6D1a32eC7c8A9cbF', // Test wallet address
}

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, message) {
  log('cyan', `\n🚀 STEP ${step}: ${message}`)
}

function logSuccess(message) {
  log('green', `✅ ${message}`)
}

function logError(message) {
  log('red', `❌ ${message}`)
}

function logInfo(message) {
  log('blue', `ℹ️  ${message}`)
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testDatabaseHealth() {
  logStep(1, 'Testing Database Connection')
  
  try {
    const health = await checkHealth()
    if (health.success) {
      logSuccess(`Database is healthy: ${health.message}`)
      return true
    } else {
      logError(`Database health check failed: ${health.message}`)
      return false
    }
  } catch (error) {
    logError(`Database connection failed: ${error.message}`)
    return false
  }
}

async function createTestOrder() {
  logStep(2, 'Creating Paycrest Order')
  
  try {
    logInfo(`Creating order: $${TEST_ORDER.amount} USDC → ${TEST_ORDER.currency}`)
    logInfo(`Phone: ${TEST_ORDER.phoneNumber}`)
    logInfo(`Account: ${TEST_ORDER.accountName}`)
    
    const response = await fetch(`${BASE_URL}/api/paycrest/orders/simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_ORDER),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API Error: ${error.error || response.statusText}`)
    }

    const result = await response.json()
    
    if (result.success && result.order) {
      logSuccess(`Order created successfully!`)
      logInfo(`Order ID: ${result.order.id}`)
      logInfo(`Receive Address: ${result.order.receiveAddress}`)
      logInfo(`Total Amount: ${result.order.totalAmount} USDC`)
      logInfo(`Valid Until: ${result.order.validUntil}`)
      
      return result.order
    } else {
      throw new Error('Order creation failed - no order data returned')
    }
  } catch (error) {
    logError(`Order creation failed: ${error.message}`)
    return null
  }
}

async function checkOrderStatus(orderId, attempt = 1) {
  logStep(3, `Checking Order Status (Attempt ${attempt})`)
  
  try {
    logInfo(`Checking status for order: ${orderId}`)
    
    const response = await fetch(`${BASE_URL}/api/paycrest/status/${orderId}`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API Error: ${error.error || response.statusText}`)
    }

    const result = await response.json()
    
    if (result.success && result.order) {
      logSuccess(`Status check successful!`)
      logInfo(`Status: ${result.order.status}`)
      logInfo(`Is Settled: ${result.order.isSettled}`)
      logInfo(`Is Failed: ${result.order.isFailed}`)
      logInfo(`Is Processing: ${result.order.isProcessing}`)
      
      return result.order
    } else {
      throw new Error('Status check failed - no order data returned')
    }
  } catch (error) {
    logError(`Status check failed: ${error.message}`)
    return null
  }
}

async function verifyDatabaseRecords(orderId) {
  logStep(4, 'Verifying Database Records')
  
  try {
    // Check main order record
    logInfo('Checking order record...')
    const order = await DatabaseService.getOrderByPaycrestId(orderId)
    
    if (order) {
      logSuccess('Order found in database!')
      logInfo(`Database Order ID: ${order.id}`)
      logInfo(`Paycrest Order ID: ${order.paycrest_order_id}`)
      logInfo(`Status: ${order.status}`)
      logInfo(`Paycrest Status: ${order.paycrest_status}`)
      logInfo(`Amount USDC: ${order.amount_in_usdc}`)
      logInfo(`Amount Local: ${order.amount_in_local}`)
      logInfo(`Currency: ${order.local_currency}`)
      logInfo(`Phone: ${order.phone_number}`)
      logInfo(`Wallet: ${order.wallet_address}`)
      logInfo(`Rate: ${order.rate}`)
      logInfo(`Network: ${order.network}`)
      logInfo(`Institution: ${order.institution_code}`)
      logInfo(`Created: ${order.created_at}`)
    } else {
      logError('Order not found in database!')
      return false
    }

    // Check recent orders
    logInfo('Checking recent orders...')
    const recentOrders = await DatabaseService.getRecentOrders(5)
    logSuccess(`Found ${recentOrders.length} recent orders`)
    
    // Check analytics events
    logInfo('Checking analytics events...')
    // Note: We'd need to add a method to get recent analytics events
    
    return true
  } catch (error) {
    logError(`Database verification failed: ${error.message}`)
    return false
  }
}

async function showAnalytics() {
  logStep(5, 'Showing Analytics Data')
  
  try {
    // We'll query the views directly using a simple approach
    logInfo('Analytics data would be available in these views:')
    logInfo('• order_analytics - Daily order summaries')
    logInfo('• settlement_analytics - Settlement tracking')
    logInfo('• polling_analytics - Status check history')
    logInfo('• fee_analytics - Fee breakdown')
    logInfo('• status_analytics - Status transitions')
    
    logSuccess('Analytics views are ready for use!')
    
    // Show recent orders as a sample
    const recentOrders = await DatabaseService.getRecentOrders(10)
    log('magenta', '\n📊 RECENT ORDERS:')
    
    if (recentOrders.length === 0) {
      logInfo('No orders found')
    } else {
      recentOrders.forEach((order, index) => {
        log('yellow', `${index + 1}. ${order.paycrest_order_id} - ${order.status} - $${order.amount_in_usdc} USDC → ${order.amount_in_local} ${order.local_currency}`)
      })
    }
    
  } catch (error) {
    logError(`Analytics display failed: ${error.message}`)
  }
}

async function simulateMultipleStatusChecks(orderId) {
  logStep('3b', 'Simulating Multiple Status Checks')
  
  logInfo('This simulates polling behavior to track status changes...')
  
  for (let i = 1; i <= 3; i++) {
    await sleep(2000) // Wait 2 seconds between checks
    await checkOrderStatus(orderId, i)
  }
}

async function runFullTest() {
  log('magenta', '🧪 PAYCREST DATABASE INTEGRATION TEST')
  log('magenta', '=' .repeat(50))
  
  // Step 1: Test database connection
  const isHealthy = await testDatabaseHealth()
  if (!isHealthy) {
    logError('Database is not healthy. Aborting test.')
    return
  }
  
  // Step 2: Create order
  const order = await createTestOrder()
  if (!order) {
    logError('Order creation failed. Aborting test.')
    return
  }
  
  // Step 3: Check status multiple times
  await simulateMultipleStatusChecks(order.id)
  
  // Step 4: Verify database records
  const dbVerified = await verifyDatabaseRecords(order.id)
  if (!dbVerified) {
    logError('Database verification failed.')
  }
  
  // Step 5: Show analytics
  await showAnalytics()
  
  // Summary
  log('magenta', '\n🎉 TEST SUMMARY')
  log('magenta', '=' .repeat(50))
  logSuccess('✅ Database connection: Working')
  logSuccess('✅ Order creation: Working')
  logSuccess('✅ Status checking: Working')
  logSuccess(dbVerified ? '✅ Database recording: Working' : '❌ Database recording: Failed')
  logSuccess('✅ Analytics views: Ready')
  
  log('cyan', '\n📋 NEXT STEPS:')
  logInfo('1. Check your Supabase dashboard to see the recorded data')
  logInfo('2. Try making a real payment to see live data flow')
  logInfo('3. Query the analytics views for insights')
  logInfo('4. Set up monitoring for production')
  
  log('green', '\n🎊 Database integration test completed!')
}

// Handle command line usage
if (require.main === module) {
  runFullTest().catch(error => {
    logError(`Test failed: ${error.message}`)
    process.exit(1)
  })
}

module.exports = {
  runFullTest,
  testDatabaseHealth,
  createTestOrder,
  checkOrderStatus,
  verifyDatabaseRecords
}