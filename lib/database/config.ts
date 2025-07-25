import { Pool } from 'pg';

// Database configuration for PayCrest integration
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

// Get database configuration from environment variables
export function getDatabaseConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'minisend',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  };

  // Validate required fields
  if (!config.password) {
    throw new Error('DB_PASSWORD environment variable is required');
  }

  return config;
}

// Create database pool singleton
let pool: Pool | null = null;

export function getDatabasePool(): Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = new Pool(config);
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
    
    // Handle client errors
    pool.on('connect', (client) => {
      client.on('error', (err) => {
        console.error('Database client error:', err);
      });
    });
  }
  
  return pool;
}

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const pool = getDatabasePool();
    const client = await pool.connect();
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', result.rows[0]);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Close database pool (for cleanup)
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}

// Database health check
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  details?: Record<string, unknown>;
}> {
  try {
    const pool = getDatabasePool();
    const client = await pool.connect();
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('orders', 'users', 'webhook_events', 'analytics_events', 'polling_attempts', 'settlements')
    `);
    
    const expectedTables = ['orders', 'users', 'webhook_events', 'analytics_events', 'polling_attempts', 'settlements'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    client.release();
    
    if (missingTables.length > 0) {
      return {
        status: 'unhealthy',
        message: `Missing required tables: ${missingTables.join(', ')}`,
        details: { existingTables, missingTables }
      };
    }
    
    return {
      status: 'healthy',
      message: 'Database is healthy and all required tables exist',
      details: { existingTables }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database health check failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
} 