/**
 * Setup script for Minisend authentication schema
 * Run with: node scripts/setup-auth-schema.js
 *
 * This script creates the necessary database tables for multi-platform auth
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env' });

async function setupAuthSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  console.log('🚀 Setting up Minisend authentication schema...\n');
  console.log('📊 Database:', supabaseUrl);
  console.log('');

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (testError && !testError.message.includes('does not exist')) {
      console.error('❌ Database connection failed:', testError.message);
      process.exit(1);
    }

    console.log('✅ Database connection successful\n');

    // Check if table already exists
    const { data: existingData, error: existingError } = await supabase
      .from('minisend_users')
      .select('id')
      .limit(1);

    if (!existingError) {
      console.log('⚠️  Table minisend_users already exists!');
      console.log('');

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Do you want to continue anyway? (yes/no): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        process.exit(0);
      }
    }

    // Read SQL file
    const schemaPath = path.join(__dirname, '..', 'lib', 'supabase', 'schema', 'users-auth.sql');

    if (!fs.existsSync(schemaPath)) {
      console.error('❌ SQL schema file not found at:', schemaPath);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(schemaPath, 'utf8');

    console.log('\n📋 MANUAL SETUP REQUIRED\n');
    console.log('Supabase requires SQL to be executed via the dashboard.');
    console.log('');
    console.log('Please follow these steps:');
    console.log('');
    console.log('1. Open Supabase Dashboard: ' + supabaseUrl.replace('/rest/v1', ''));
    console.log('2. Go to: SQL Editor → New Query');
    console.log('3. Copy the SQL from: ' + schemaPath);
    console.log('4. Paste and run it in the SQL Editor');
    console.log('');
    console.log('Or run this command to view the SQL:');
    console.log('  cat ' + schemaPath);
    console.log('');

    // Create a quick setup file
    const quickSetupPath = path.join(__dirname, '..', 'SETUP_SQL.sql');
    fs.writeFileSync(quickSetupPath, sqlContent);

    console.log('✅ SQL saved to: SETUP_SQL.sql (in project root)');
    console.log('   You can copy this file\'s contents to Supabase SQL Editor');
    console.log('');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

setupAuthSchema();
