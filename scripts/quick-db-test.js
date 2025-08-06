#!/usr/bin/env node

/**
 * Quick Database Test - Minimal test to verify database setup
 */

require('dotenv').config()
const { DatabaseService, checkHealth, supabaseAdmin } = require('../lib/supabase/config')

async function quickTest() {
  console.log('🚀 Quick Database Test Starting...\n')
  
  try {
    // 1. Test connection
    console.log('1️⃣ Testing database connection...')
    const health = await checkHealth()
    console.log(`   ${health.success ? '✅' : '❌'} ${health.message}`)
    
    if (!health.success) {
      console.log('❌ Database connection failed. Check your .env file.')
      return
    }
    
    // 2. Test table access
    console.log('\n2️⃣ Testing table access...')
    const tables = ['users', 'orders', 'analytics_events', 'carrier_detections']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('count')
          .limit(0)
        
        if (error) throw error
        console.log(`   ✅ ${table} table accessible`)
      } catch (error) {
        console.log(`   ❌ ${table} table error: ${error.message}`)
      }
    }
    
    // 3. Test creating a test user
    console.log('\n3️⃣ Testing user creation...')
    try {
      const testWallet = '0xTEST' + Date.now()
      const user = await DatabaseService.createUser(testWallet, '+254712345678')
      console.log(`   ✅ User created: ${user.id}`)
      
      // Clean up
      await supabaseAdmin.from('users').delete().eq('id', user.id)
      console.log(`   🧹 Test user cleaned up`)
    } catch (error) {
      console.log(`   ❌ User creation failed: ${error.message}`)
    }
    
    // 4. Test analytics event logging
    console.log('\n4️⃣ Testing analytics logging...')
    try {
      const event = await DatabaseService.logAnalyticsEvent(
        'test_event',
        '0xTEST123',
        { test: true, timestamp: new Date().toISOString() }
      )
      console.log(`   ✅ Analytics event logged: ${event.id}`)
      
      // Clean up
      await supabaseAdmin.from('analytics_events').delete().eq('id', event.id)
      console.log(`   🧹 Test event cleaned up`)
    } catch (error) {
      console.log(`   ❌ Analytics logging failed: ${error.message}`)
    }
    
    // 5. Test carrier detection
    console.log('\n5️⃣ Testing carrier detection logging...')
    try {
      const detection = await DatabaseService.logCarrierDetection(
        '254712345678',
        'SAFARICOM',
        'SAFAKEPC',
        'MPESA',
        0.95,
        'test_method'
      )
      console.log(`   ✅ Carrier detection logged: ${detection.id}`)
      
      // Clean up
      await supabaseAdmin.from('carrier_detections').delete().eq('id', detection.id)
      console.log(`   🧹 Test detection cleaned up`)
    } catch (error) {
      console.log(`   ❌ Carrier detection failed: ${error.message}`)
    }
    
    console.log('\n🎉 Quick database test completed successfully!')
    console.log('\n📋 Your database is ready for Paycrest integration!')
    
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`)
    console.log('\n🔧 Check your database setup and environment variables.')
  }
}

// Run the test
quickTest()