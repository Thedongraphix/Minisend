/**
 * Verify Authentication Setup
 * Checks if the auth tables were created successfully
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

async function verifySetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Verifying authentication setup...\n');

  let allGood = true;

  // Check minisend_users table
  const { data: users, error: usersError } = await supabase
    .from('minisend_users')
    .select('*')
    .limit(1);

  if (usersError) {
    console.log('❌ minisend_users table: NOT FOUND');
    console.log('   Error:', usersError.message);
    allGood = false;
  } else {
    console.log('✅ minisend_users table: EXISTS');
  }

  // Check minisend_auth_sessions table
  const { data: sessions, error: sessionsError } = await supabase
    .from('minisend_auth_sessions')
    .select('*')
    .limit(1);

  if (sessionsError) {
    console.log('❌ minisend_auth_sessions table: NOT FOUND');
    console.log('   Error:', sessionsError.message);
    allGood = false;
  } else {
    console.log('✅ minisend_auth_sessions table: EXISTS');
  }

  // Check minisend_user_stats view
  const { data: stats, error: statsError } = await supabase
    .from('minisend_user_stats')
    .select('*');

  if (statsError) {
    console.log('❌ minisend_user_stats view: NOT FOUND');
    console.log('   Error:', statsError.message);
    allGood = false;
  } else {
    console.log('✅ minisend_user_stats view: EXISTS');
  }

  console.log('');

  if (allGood) {
    console.log('🎉 All authentication tables and views are set up correctly!');
    console.log('');
    console.log('You can now:');
    console.log('  1. npm run dev');
    console.log('  2. Test web authentication at http://localhost:3000');
    console.log('');
  } else {
    console.log('⚠️  Some tables are missing. Please run the SQL in Supabase Dashboard.');
    console.log('');
    console.log('SQL file location: SETUP_SQL.sql');
    console.log('Dashboard: ' + supabaseUrl.replace('/rest/v1', ''));
    console.log('');
  }
}

verifySetup().catch(error => {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
});
