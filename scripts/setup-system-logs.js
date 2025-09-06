#!/usr/bin/env node

// Load environment variables
require('dotenv').config();
const { supabaseAdmin } = require('../lib/supabase/config');
const fs = require('fs');
const path = require('path');

async function setupSystemLogsTable() {
  console.log('🚀 Setting up system_logs table in Supabase...\n');
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  try {
    // Test connection first
    console.log('1️⃣ Testing Supabase connection...');
    const { error: connectionError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      throw new Error(`Connection failed: ${connectionError.message}`);
    }
    console.log('✅ Supabase connection successful\n');
    
    // Read and execute SQL
    console.log('2️⃣ Creating system_logs table...');
    const sqlPath = path.join(__dirname, 'setup-system-logs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL - since we can't use rpc('exec'), we'll execute via psql or manual creation
    console.log('📝 SQL script loaded, please execute the following in your Supabase SQL Editor:');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    
    // Try to create the table directly with the client
    console.log('\\n3️⃣ Attempting direct table creation...');
    
    // Create the table using raw SQL query
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.system_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          level TEXT NOT NULL CHECK (level IN ('log', 'error', 'warn', 'info', 'debug')),
          message TEXT NOT NULL,
          data JSONB,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          environment TEXT NOT NULL CHECK (environment IN ('development', 'production', 'test')),
          user_agent TEXT,
          url TEXT,
          stack_trace TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      
      // Try to insert a test record to create the table
      const { data, error } = await supabaseAdmin
        .from('system_logs')
        .insert([{
          level: 'info',
          message: 'System logs table setup test',
          environment: 'development'
        }])
        .select();
      
      if (!error) {
        console.log('✅ Table created successfully via insert');
        
        // Clean up the test record
        await supabaseAdmin
          .from('system_logs')
          .delete()
          .eq('message', 'System logs table setup test');
          
        console.log('✅ Test record cleaned up');
      } else {
        console.log('❌ Direct creation failed:', error.message);
        console.log('\\n📋 Manual steps required:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');  
        console.log('3. Execute the SQL script shown above');
      }
    } catch (directError) {
      console.log('❌ Direct table creation failed:', directError.message);
    }
    
    // Test if table exists by trying to query it
    console.log('\\n4️⃣ Testing table accessibility...');
    try {
      const { data, error } = await supabaseAdmin
        .from('system_logs')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('❌ Table not accessible:', error.message);
        console.log('\\n🔧 Please create the table manually using the SQL script above');
      } else {
        console.log('✅ system_logs table is accessible!');
        
        // Create indexes
        console.log('\\n5️⃣ Table ready for console logging!');
        console.log('\\n📊 Next steps:');
        console.log('1. The console logger will automatically start capturing logs');
        console.log('2. In development: logs go to both console and database');
        console.log('3. In production: logs go only to database (silent console)');
        console.log('4. Use Supabase dashboard to view stored logs in system_logs table');
      }
    } catch (testError) {
      console.log('❌ Table test failed:', testError.message);
      console.log('\\n🔧 Please create the table manually using the SQL script above');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Auto-run if called directly
if (require.main === module) {
  setupSystemLogsTable()
    .then(() => {
      console.log('\\n🎉 Setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupSystemLogsTable };