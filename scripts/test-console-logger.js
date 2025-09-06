#!/usr/bin/env node

// Test script for console logger
require('dotenv').config();
const { supabaseAdmin } = require('../lib/supabase/config');

async function testConsoleLogger() {
  console.log('🧪 Testing console logger system...\n');
  
  try {
    // 1. Create table if it doesn't exist
    console.log('1️⃣ Creating system_logs table...');
    
    const { data: existingTable, error: checkError } = await supabaseAdmin
      .from('system_logs')
      .select('count')
      .limit(1);
    
    if (checkError && checkError.message.includes('does not exist')) {
      console.log('📝 Table does not exist, creating...');
      
      // Try creating table via SQL execution (this may not work with all Supabase configurations)
      try {
        const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
          query: `
            CREATE TABLE IF NOT EXISTS public.system_logs (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              level TEXT NOT NULL,
              message TEXT NOT NULL,
              data JSONB,
              timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              environment TEXT NOT NULL,
              user_agent TEXT,
              url TEXT,
              stack_trace TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Enable all for service role" ON public.system_logs
              FOR ALL USING (true) WITH CHECK (true);
          `
        });
        
        if (createError) throw createError;
        console.log('✅ Table created via SQL');
      } catch (sqlError) {
        console.log('❌ Direct SQL creation failed, please create manually:');
        console.log(`
-- Copy and paste this into Supabase SQL Editor:

CREATE TABLE public.system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  environment TEXT NOT NULL,
  user_agent TEXT,
  url TEXT,
  stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for service role" ON public.system_logs
  FOR ALL USING (true) WITH CHECK (true);
        `);
        return false;
      }
    } else {
      console.log('✅ Table already exists');
    }
    
    // 2. Test direct insert
    console.log('\\n2️⃣ Testing direct log insertion...');
    
    const testLog = {
      level: 'info',
      message: 'Console logger test message',
      data: { test: true, timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      environment: 'test'
    };
    
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('system_logs')
      .insert([testLog])
      .select();
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
      return false;
    }
    
    console.log('✅ Test log inserted:', insertData[0].id);
    
    // 3. Test batch insert (simulate console logger behavior)
    console.log('\\n3️⃣ Testing batch log insertion...');
    
    const batchLogs = [
      {
        level: 'log',
        message: 'Batch test log 1',
        timestamp: new Date().toISOString(),
        environment: 'test'
      },
      {
        level: 'warn',
        message: 'Batch test warning',
        timestamp: new Date().toISOString(),
        environment: 'test'
      },
      {
        level: 'error',
        message: 'Batch test error',
        data: { error: 'Test error data' },
        timestamp: new Date().toISOString(),
        environment: 'test'
      }
    ];
    
    const { data: batchData, error: batchError } = await supabaseAdmin
      .from('system_logs')
      .insert(batchLogs)
      .select();
    
    if (batchError) {
      console.log('❌ Batch insert failed:', batchError.message);
      return false;
    }
    
    console.log(`✅ Batch insert successful: ${batchData.length} logs inserted`);
    
    // 4. Query logs back
    console.log('\\n4️⃣ Testing log retrieval...');
    
    const { data: retrievedLogs, error: queryError } = await supabaseAdmin
      .from('system_logs')
      .select('*')
      .eq('environment', 'test')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (queryError) {
      console.log('❌ Query failed:', queryError.message);
      return false;
    }
    
    console.log(`✅ Retrieved ${retrievedLogs.length} test logs`);
    retrievedLogs.forEach(log => {
      console.log(`   [${log.level.toUpperCase()}] ${log.message}`);
    });
    
    // 5. Cleanup test logs
    console.log('\\n5️⃣ Cleaning up test logs...');
    
    const { error: deleteError } = await supabaseAdmin
      .from('system_logs')
      .delete()
      .eq('environment', 'test');
    
    if (deleteError) {
      console.log('⚠️ Cleanup failed (logs will remain):', deleteError.message);
    } else {
      console.log('✅ Test logs cleaned up');
    }
    
    console.log('\\n🎉 Console logger database integration test completed successfully!');
    console.log('\\n📋 Next steps:');
    console.log('1. Run `npm run dev` to test in development mode');
    console.log('2. Check browser console - you should see logger initialization');
    console.log('3. Perform some actions that trigger console.log');
    console.log('4. Check Supabase system_logs table for stored logs');
    console.log('5. Deploy to production and verify console is silent');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run test if called directly
if (require.main === module) {
  testConsoleLogger()
    .then(success => {
      process.exit(success ? 0 : 1);
    });
}

module.exports = { testConsoleLogger };