#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'minisend',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function setupDatabase() {
  console.log('🚀 Setting up Minisend PayCrest Database...');
  console.log('📋 Research-Based Implementation with Polling Support');
  
  // Validate configuration
  if (!config.password) {
    console.error('❌ DB_PASSWORD environment variable is required');
    process.exit(1);
  }

  const pool = new Pool(config);

  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');

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
    console.log('  • Helper functions');

    // Execute schema
    console.log('🔧 Executing database schema...');
    await client.query(schema);
    console.log('✅ Database schema executed successfully');

    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'users', 'orders', 'webhook_events', 'analytics_events', 
        'polling_attempts', 'carrier_detections', 'settlements'
      )
      ORDER BY table_name
    `;

    const tablesResult = await client.query(tablesQuery);
    const createdTables = tablesResult.rows.map(row => row.table_name);

    console.log('📋 Created tables:');
    createdTables.forEach(table => {
      console.log(`  ✅ ${table}`);
    });

    // Check for views
    console.log('🔍 Verifying view creation...');
    const viewsQuery = `
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public' 
      AND viewname IN ('order_analytics', 'settlement_analytics', 'polling_analytics')
      ORDER BY viewname
    `;

    const viewsResult = await client.query(viewsQuery);
    const createdViews = viewsResult.rows.map(row => row.viewname);

    console.log('📊 Created views:');
    createdViews.forEach(view => {
      console.log(`  ✅ ${view}`);
    });

    // Check for functions
    console.log('🔍 Verifying function creation...');
    const functionsQuery = `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN (
        'update_updated_at_column', 'track_polling_attempt', 
        'track_settlement', 'update_user_stats'
      )
      ORDER BY routine_name
    `;

    const functionsResult = await client.query(functionsQuery);
    const createdFunctions = functionsResult.rows.map(row => row.routine_name);

    console.log('⚙️ Created functions:');
    createdFunctions.forEach(func => {
      console.log(`  ✅ ${func}`);
    });

    // Test default data
    console.log('🔍 Testing default data...');
    const usersQuery = 'SELECT COUNT(*) as count FROM users';
    const usersResult = await client.query(usersQuery);
    console.log(`✅ Default users created: ${usersResult.rows[0].count}`);

    // Test triggers
    console.log('🔍 Verifying trigger creation...');
    const triggersQuery = `
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND trigger_name IN ('update_orders_updated_at', 'update_users_updated_at')
      ORDER BY trigger_name
    `;

    const triggersResult = await client.query(triggersQuery);
    const createdTriggers = triggersResult.rows.map(row => row.trigger_name);

    console.log('🔗 Created triggers:');
    createdTriggers.forEach(trigger => {
      console.log(`  ✅ ${trigger}`);
    });

    // Test indexes
    console.log('🔍 Verifying index creation...');
    const indexesQuery = `
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
      ORDER BY indexname
    `;

    const indexesResult = await client.query(indexesQuery);
    const createdIndexes = indexesResult.rows.map(row => row.indexname);

    console.log('📈 Created indexes:');
    createdIndexes.forEach(index => {
      console.log(`  ✅ ${index}`);
    });

    client.release();

    console.log('');
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📊 Research-Based Features:');
    console.log('  • Polling attempts tracking with exponential backoff');
    console.log('  • Settlement detection focused on "settled" status');
    console.log('  • Carrier detection for Kenyan numbers');
    console.log('  • Comprehensive analytics and monitoring');
    console.log('  • Webhook compatibility (PayCrest doesn\'t send webhooks)');
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('  1. Set up environment variables for database connection');
    console.log('  2. Configure PayCrest API credentials');
    console.log('  3. Test the polling implementation');
    console.log('  4. Monitor settlement times and success rates');
    console.log('');
    console.log('📚 Documentation:');
    console.log('  • API docs: /api/paycrest/orders-docs');
    console.log('  • Implementation summary: IMPLEMENTATION_SUMMARY.md');
    console.log('  • Database schema: database/schema.sql');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase }; 