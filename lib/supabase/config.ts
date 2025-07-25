import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
}

// Create Supabase client with service role key for admin operations
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test connection function
export const testConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Test basic connection by querying a simple table
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      return { success: false, message: `Connection test failed: ${error.message}` };
    }

    return { success: true, message: 'Supabase connection successful' };
  } catch (error) {
    return { success: false, message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

// Health check function
export const checkHealth = async (): Promise<{ healthy: boolean; details: Record<string, unknown> }> => {
  try {
    // Check if all required tables exist
    const tables = ['users', 'orders', 'webhook_events', 'analytics', 'polling_attempts', 'settlements', 'carrier_detections'];
    const healthChecks = await Promise.all(
      tables.map(async (table) => {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);

        return {
          table,
          accessible: !error,
          error: error?.message
        };
      })
    );

    const allHealthy = healthChecks.every(check => check.accessible);

    return {
      healthy: allHealthy,
      details: {
        timestamp: new Date().toISOString(),
        tables: healthChecks,
        connection: await testConnection()
      }
    };
  } catch (error) {
    return {
      healthy: false,
      details: {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

// Database schema validation
export const validateSchema = async (): Promise<{ valid: boolean; issues: string[] }> => {
  const issues: string[] = [];

  try {
    // Check for required tables
    const requiredTables = [
      'users', 'orders', 'webhook_events', 'analytics',
      'polling_attempts', 'settlements', 'carrier_detections'
    ];

            for (const table of requiredTables) {
          const { error } = await supabase
            .from(table)
            .select('*')
            .limit(1);

          if (error) {
            issues.push(`Table '${table}' not accessible: ${error.message}`);
          }
        }

    // Check for required views
    const requiredViews = ['order_analytics', 'user_analytics', 'polling_analytics'];
            for (const view of requiredViews) {
          try {
            const { error } = await supabase
              .from(view)
              .select('*')
              .limit(1);

            if (error) {
              issues.push(`View '${view}' not accessible: ${error.message}`);
            }
          } catch {
            issues.push(`View '${view}' not found or not accessible`);
          }
        }

    return {
      valid: issues.length === 0,
      issues
    };
  } catch (error) {
    issues.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { valid: false, issues };
  }
};

export default supabase;