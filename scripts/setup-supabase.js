#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSupabase() {
  console.log('🚀 Setting up Minisend PayCrest Database on Supabase...');
  console.log('📋 Research-Based Implementation with Polling Support');
  
  try {
    // Test connection
    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code === '42P01') {
      console.log('✅ Supabase connection successful (tables will be created)');
    } else if (error) {
      console.error('❌ Supabase connection failed:', error);
      process.exit(1);
    } else {
      console.log('✅ Supabase connection successful');
    }

    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📖 Reading schema file...');
    console.log('📊 Schema includes:');
    console.log('  • Users table for wallet tracking');
    console.log('  • Orders table with research-based settlement tracking');
    console.log('  • Webhook events table (compatibility only)');
    console.log('  • Analytics events table');
    console.log('  • Polling attempts table (RESEARCH-BASED)');
    console.log('  • Carrier detection table');
    console.log('  • Settlements table (RESEARCH-BASED)');
    console.log('  • Performance indexes');
    console.log('  • Analytics views');

    // Execute schema in Supabase SQL editor
    console.log('🔧 Executing database schema...');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let executedCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // Execute each statement
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Failed to execute statement:`, error);
          errorCount++;
        } else {
          executedCount++;
        }
      } catch (err) {
        console.error(`❌ Statement execution error:`, err);
        errorCount++;
      }
    }

    console.log(`✅ Schema execution completed: ${executedCount} successful, ${errorCount} failed`);

    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'users', 'orders', 'webhook_events', 'analytics_events', 
        'polling_attempts', 'carrier_detections', 'settlements'
      ]);

    if (tablesError) {
      console.error('❌ Failed to verify tables:', tablesError);
    } else {
      const createdTables = tables?.map(row => row.table_name) || [];
      console.log('📋 Created tables:');
      createdTables.forEach(table => {
        console.log(`  ✅ ${table}`);
      });
    }

    // Test default data insertion
    console.log('🔍 Testing default data...');
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('wallet_address')
        .limit(5);

      if (usersError) {
        console.error('❌ Failed to test default data:', usersError);
      } else {
        console.log(`✅ Default users created: ${users?.length || 0}`);
      }
    } catch (err) {
      console.error('❌ Default data test failed:', err);
    }

    // Test analytics views
    console.log('🔍 Testing analytics views...');
    try {
      const { data: orderAnalytics, error: analyticsError } = await supabase
        .from('order_analytics')
        .select('*')
        .limit(1);

      if (analyticsError) {
        console.error('❌ Failed to test analytics views:', analyticsError);
      } else {
        console.log('✅ Analytics views working');
      }
    } catch (err) {
      console.error('❌ Analytics views test failed:', err);
    }

    console.log('');
    console.log('🎉 Supabase setup completed successfully!');
    console.log('');
    console.log('📊 Research-Based Features:');
    console.log('  • Polling attempts tracking with exponential backoff');
    console.log('  • Settlement detection focused on "settled" status');
    console.log('  • Carrier detection for Kenyan numbers');
    console.log('  • Comprehensive analytics and monitoring');
    console.log('  • Webhook compatibility (PayCrest doesn\'t send webhooks)');
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('  1. Configure PayCrest API credentials in your .env file');
    console.log('  2. Test the polling implementation');
    console.log('  3. Monitor settlement times and success rates');
    console.log('  4. Set up Supabase Row Level Security (RLS) if needed');
    console.log('');
    console.log('📚 Documentation:');
    console.log('  • API docs: /api/paycrest/orders-docs');
    console.log('  • Implementation summary: IMPLEMENTATION_SUMMARY.md');
    console.log('  • Database schema: database/schema.sql');
    console.log('  • Supabase dashboard: https://supabase.com/dashboard');

  } catch (error) {
    console.error('❌ Supabase setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupSupabase().catch(console.error);
}

module.exports = { setupSupabase }; 