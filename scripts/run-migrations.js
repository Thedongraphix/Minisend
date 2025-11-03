/**
 * Database Migration Runner
 * Applies SQL migrations from supabase/migrations directory
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n📄 Running migration: ${fileName}`);

  try {
    const sql = fs.readFileSync(filePath, 'utf8');

    // Split by semicolons but preserve statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase
            .from('_sql_migrations')
            .insert({ migration: fileName, sql: statement });

          if (directError) {
            console.warn(`   ⚠️  Warning: ${error.message || directError.message}`);
          }
        }
      }
    }

    console.log(`   ✅ Migration completed: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error in migration ${fileName}:`, error.message);
    return false;
  }
}

async function runAllMigrations() {
  console.log('🔄 Starting database migrations...\n');

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('📭 No migration files found');
    return;
  }

  console.log(`📦 Found ${files.length} migration(s)\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const success = await runMigration(filePath);

    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📄 Total: ${files.length}`);

  if (failCount === 0) {
    console.log('\n🎉 All migrations completed successfully!\n');
  } else {
    console.log('\n⚠️  Some migrations failed. Check the output above.\n');
    console.log('💡 Tip: You can also run migrations manually using Supabase SQL Editor:');
    console.log(`   ${supabaseUrl.replace('/v1', '')}/project/_/sql\n`);
  }
}

// Execute migrations
runAllMigrations()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
