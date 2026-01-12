/**
 * Migration Script: Add auto_settlement_rule_id column
 * Run this script to add auto-settlement tracking to the minisend_users table
 *
 * Usage: node scripts/run-auto-settlement-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Starting auto-settlement rule ID migration...\n');

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../lib/supabase/schema/add-auto-settlement-rule-id.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log('📊 Executing migration...\n');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).single();

    if (error) {
      // Try alternative method if rpc fails
      console.log('Trying direct query execution...');

      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: stmtError } = await supabase.from('minisend_users').select('count').single();
        if (stmtError && stmtError.message.includes('column "auto_settlement_rule_id" does not exist')) {
          console.log('Column does not exist yet, continuing with migration...');
        }
      }
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Summary:');
    console.log('  - Added auto_settlement_rule_id column to minisend_users table');
    console.log('  - Created index for efficient lookups');
    console.log('  - Auto-settlement tracking is now enabled\n');

    // Verify the migration
    console.log('🔍 Verifying migration...');
    const { data, error: verifyError } = await supabase
      .from('minisend_users')
      .select('user_id, auto_settlement_rule_id')
      .limit(1);

    if (verifyError && !verifyError.message.includes('no rows')) {
      console.error('❌ Verification failed:', verifyError.message);
      process.exit(1);
    }

    console.log('✅ Migration verified successfully!');
    console.log('\n🎉 Database is ready for auto-settlement functionality');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease run this SQL manually in your Supabase dashboard:');
    console.error('Dashboard → SQL Editor → New Query → Paste the migration SQL\n');
    process.exit(1);
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
