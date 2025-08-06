#!/usr/bin/env node

/**
 * Check Production Database - See what's actually being recorded
 */

require('dotenv').config()
const { DatabaseService, checkHealth } = require('./lib/supabase/config')

async function checkProductionDatabase() {
  console.log('🔍 CHECKING PRODUCTION DATABASE')
  console.log('=============================\n')

  try {
    // 1. Check health
    console.log('1️⃣ Database Health Check...')
    const health = await checkHealth()
    console.log(`   ${health.success ? '✅' : '❌'} ${health.message}\n`)

    if (!health.success) {
      console.log('❌ Database connection failed.')
      return
    }

    // 2. Check recent orders
    console.log('2️⃣ Recent Orders in Database...')
    const recentOrders = await DatabaseService.getRecentOrders(10)
    console.log(`   Found ${recentOrders.length} orders\n`)

    if (recentOrders.length === 0) {
      console.log('⚠️  No orders found in database!')
      console.log('   This suggests the database integration may not be working properly.')
    } else {
      console.log('📊 RECENT ORDERS:')
      recentOrders.forEach((order, index) => {
        console.log(`${index + 1}. Order: ${order.paycrest_order_id}`)
        console.log(`   Status: ${order.status} (Paycrest: ${order.paycrest_status})`) 
        console.log(`   Amount: $${order.amount_in_usdc} USDC → ${order.amount_in_local} ${order.local_currency}`)
        console.log(`   Phone: ${order.phone_number}`)
        console.log(`   Wallet: ${order.wallet_address}`)
        console.log(`   Rate: ${order.rate}`)
        console.log(`   Institution: ${order.institution_code}`)
        console.log(`   Created: ${order.created_at}`)
        console.log(`   Updated: ${order.updated_at}`)
        console.log('')
      })
    }

    // 3. Check specific order from Paycrest
    console.log('3️⃣ Checking Specific Paycrest Order...')
    const specificOrder = await DatabaseService.getOrderByPaycrestId('af95c7dc-a4b2-48de-ba86-417117941e37')
    
    if (specificOrder) {
      console.log('✅ Found order af95c7dc-a4b2-48de-ba86-417117941e37 in database:')
      console.log(`   Database ID: ${specificOrder.id}`)
      console.log(`   Status: ${specificOrder.status}`)
      console.log(`   Paycrest Status: ${specificOrder.paycrest_status}`)
      console.log(`   Amount: $${specificOrder.amount_in_usdc} USDC → ${specificOrder.amount_in_local} ${specificOrder.local_currency}`)
      console.log(`   Phone: ${specificOrder.phone_number}`)
      console.log(`   Rate: ${specificOrder.rate}`)
      console.log(`   Institution: ${specificOrder.institution_code}`)
      console.log(`   Created: ${specificOrder.created_at}`)
    } else {
      console.log('❌ Order af95c7dc-a4b2-48de-ba86-417117941e37 NOT FOUND in database')
      console.log('   This order may have been created before database integration was deployed.')
    }

    // 4. Check the new order we just created
    console.log('\n4️⃣ Checking Recently Created Order...')
    const newOrder = await DatabaseService.getOrderByPaycrestId('39c5012e-55c0-42a8-9439-c9aabcb8fcce')
    
    if (newOrder) {
      console.log('✅ Found new order 39c5012e-55c0-42a8-9439-c9aabcb8fcce in database:')
      console.log(`   Database ID: ${newOrder.id}`)
      console.log(`   Status: ${newOrder.status}`)
      console.log(`   Amount: $${newOrder.amount_in_usdc} USDC → ${newOrder.amount_in_local} ${newOrder.local_currency}`)
      console.log(`   Phone: ${newOrder.phone_number}`)
      console.log(`   Institution: ${newOrder.institution_code}`)
      console.log(`   Created: ${newOrder.created_at}`)
    } else {
      console.log('❌ New order 39c5012e-55c0-42a8-9439-c9aabcb8fcce NOT FOUND in database')
      console.log('   This suggests database integration is not working in production.')
    }

    // 5. Check analytics events
    console.log('\n5️⃣ Sample Analytics Data...')
    // We can't easily query analytics events without adding a method, so let's check table counts
    
    console.log('\n🔍 DIAGNOSIS:')
    if (recentOrders.length === 0) {
      console.log('❌ No orders in database - database integration may not be deployed properly')
      console.log('   Check: Are the database integration changes live in production?')
      console.log('   Check: Are environment variables set correctly in production?')
    } else if (!specificOrder && newOrder) {
      console.log('✅ Database integration is working for new orders')
      console.log('⚠️  Old orders (before integration) not in database - this is expected')
    } else if (specificOrder) {
      console.log('✅ Database integration is fully working')
      console.log('✅ Both old and new orders are being tracked')
    }

  } catch (error) {
    console.error('\n❌ Error checking database:', error.message)
  }
}

// Run the check
checkProductionDatabase()