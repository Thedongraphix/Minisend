#!/usr/bin/env node

// Simple script to create system_logs table using Supabase Admin API
require('dotenv').config();
const { supabaseAdmin } = require('../lib/supabase/config');

async function createSystemLogsTable() {
  console.log('🚀 Creating system_logs table...');
  
  try {
    // Test connection
    const { error: testError } = await supabaseAdmin.from('users').select('count').limit(1);
    if (testError) {
      throw new Error(`Connection failed: ${testError.message}`);
    }
    console.log('✅ Supabase connection OK');
    
    // Try to create table by inserting a record (this will auto-create the table structure)
    const testLog = {
      level: 'info',
      message: 'Table creation test',
      timestamp: new Date().toISOString(),
      environment: 'development'
    };
    
    const { data, error } = await supabaseAdmin
      .from('system_logs')
      .insert([testLog])
      .select();
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ Table does not exist. Please create it manually in Supabase dashboard.');
        console.log('\\n📋 Go to Supabase Dashboard > SQL Editor and run:');
        console.log(`
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

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Enable all for service role" ON public.system_logs
  FOR ALL USING (true) WITH CHECK (true);
        `);
        return false;
      } else {
        throw error;
      }
    }
    
    console.log('✅ Table exists and is accessible');
    
    // Clean up test record
    if (data && data.length > 0) {
      await supabaseAdmin
        .from('system_logs')
        .delete()
        .eq('id', data[0].id);
      console.log('✅ Test record cleaned up');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  createSystemLogsTable()
    .then((success) => {
      if (success) {
        console.log('\\n🎉 system_logs table is ready!');
      } else {
        console.log('\\n⚠️ Please create the table manually as shown above');
      }
      process.exit(success ? 0 : 1);
    });
}

module.exports = { createSystemLogsTable };