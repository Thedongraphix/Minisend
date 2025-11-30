/**
 * Dune Analytics Integration for Minisend
 *
 * This module executes pre-created Dune queries via API to fetch
 * on-chain analytics data from Base blockchain.
 *
 * IMPORTANT: Dune doesn't accept custom events. Instead:
 * 1. Create queries in Dune UI that analyze on-chain USDC transfers
 * 2. Use this module to execute those queries programmatically
 * 3. Display results in your dashboard
 *
 * See docs/DUNE_IMPLEMENTATION_GUIDE.md for setup instructions.
 */

const DUNE_API_KEY = process.env.DUNE_API_KEY;
const DUNE_API_BASE = 'https://api.dune.com/api/v1';

// Query execution state
type QueryState =
  | 'QUERY_STATE_PENDING'
  | 'QUERY_STATE_EXECUTING'
  | 'QUERY_STATE_COMPLETED'
  | 'QUERY_STATE_FAILED'
  | 'QUERY_STATE_CANCELLED';

// API response types
interface DuneExecutionResponse {
  execution_id: string;
  state: QueryState;
}

interface DuneQueryResult {
  execution_id: string;
  query_id: number;
  state: QueryState;
  submitted_at: string;
  expires_at: string;
  execution_started_at?: string;
  execution_ended_at?: string;
  result?: {
    rows: Array<Record<string, any>>;
    metadata: {
      column_names: string[];
      column_types: string[];
      row_count: number;
      result_set_bytes: number;
      total_row_count: number;
      datapoint_count: number;
      pending_time_millis: number;
      execution_time_millis: number;
    };
  };
  error?: {
    type: string;
    message: string;
  };
}

/**
 * Execute a Dune query and wait for results
 *
 * @param queryId - The Dune query ID (from the URL, e.g., 4601471)
 * @param parameters - Optional query parameters (e.g., { Days: 30 })
 * @param maxPolls - Maximum number of polling attempts (default: 20)
 * @returns Query results or null if failed
 *
 * @example
 * const result = await executeDuneQuery(123456, { Days: 30 });
 * if (result?.result) {
 *   console.log(result.result.rows);
 * }
 */
export async function executeDuneQuery(
  queryId: number,
  parameters?: Record<string, string | number>,
  maxPolls = 20
): Promise<DuneQueryResult | null> {
  if (!DUNE_API_KEY) {
    if (typeof window === 'undefined') {
      console.warn('Dune API key not configured');
    }
    return null;
  }

  try {
    // Step 1: Execute the query
    const executeResponse = await fetch(
      `${DUNE_API_BASE}/query/${queryId}/execute`,
      {
        method: 'POST',
        headers: {
          'X-Dune-API-Key': DUNE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query_parameters: parameters || {},
          performance: 'medium', // Options: 'low', 'medium', 'high'
        }),
      }
    );

    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      throw new Error(`Dune API error ${executeResponse.status}: ${errorText}`);
    }

    const executionData: DuneExecutionResponse = await executeResponse.json();

    // Step 2: Poll for results
    return await pollQueryResults(executionData.execution_id, maxPolls);
  } catch (error) {
    if (typeof window === 'undefined') {
      console.error('Error executing Dune query:', error);
    }
    return null;
  }
}

/**
 * Poll for query execution results
 *
 * @param executionId - The execution ID from the execute endpoint
 * @param maxAttempts - Maximum number of polling attempts
 * @returns Query results or null if failed/timeout
 */
async function pollQueryResults(
  executionId: string,
  maxAttempts = 20
): Promise<DuneQueryResult | null> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(
        `${DUNE_API_BASE}/execution/${executionId}/results`,
        {
          headers: {
            'X-Dune-API-Key': DUNE_API_KEY!,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Dune API error: ${response.status}`);
      }

      const result: DuneQueryResult = await response.json();

      // Check execution state
      if (result.state === 'QUERY_STATE_COMPLETED') {
        return result;
      }

      if (result.state === 'QUERY_STATE_FAILED') {
        throw new Error(`Query failed: ${result.error?.message || 'Unknown error'}`);
      }

      if (result.state === 'QUERY_STATE_CANCELLED') {
        throw new Error('Query was cancelled');
      }

      // Wait before next poll (exponential backoff)
      const delay = Math.min(1000 * Math.pow(1.5, attempts), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));

      attempts++;
    } catch (error) {
      if (typeof window === 'undefined') {
        console.error(`Error polling query results (attempt ${attempts + 1}):`, error);
      }
      attempts++;
    }
  }

  // Timeout reached
  if (typeof window === 'undefined') {
    console.warn(`Query execution timed out after ${maxAttempts} attempts`);
  }
  return null;
}

/**
 * Get latest cached query results without re-executing
 *
 * This is useful for queries that don't need real-time data.
 * Results are cached by Dune for 24 hours.
 *
 * @param queryId - The Dune query ID
 * @returns Latest cached results or null if not available
 *
 * @example
 * const cachedResult = await getLatestQueryResults(123456);
 */
export async function getLatestQueryResults(
  queryId: number
): Promise<DuneQueryResult | null> {
  if (!DUNE_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${DUNE_API_BASE}/query/${queryId}/results/latest`,
      {
        headers: {
          'X-Dune-API-Key': DUNE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Dune API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (typeof window === 'undefined') {
      console.error('Error fetching latest query results:', error);
    }
    return null;
  }
}

/**
 * Check query execution status
 *
 * @param executionId - The execution ID to check
 * @returns Current execution status
 */
export async function getExecutionStatus(
  executionId: string
): Promise<DuneQueryResult | null> {
  if (!DUNE_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${DUNE_API_BASE}/execution/${executionId}/status`,
      {
        headers: {
          'X-Dune-API-Key': DUNE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Dune API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (typeof window === 'undefined') {
      console.error('Error checking execution status:', error);
    }
    return null;
  }
}

/**
 * Cancel a running query execution
 *
 * @param executionId - The execution ID to cancel
 * @returns Success status
 */
export async function cancelExecution(executionId: string): Promise<boolean> {
  if (!DUNE_API_KEY) {
    return false;
  }

  try {
    const response = await fetch(
      `${DUNE_API_BASE}/execution/${executionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'X-Dune-API-Key': DUNE_API_KEY,
        },
      }
    );

    return response.ok;
  } catch (error) {
    if (typeof window === 'undefined') {
      console.error('Error cancelling execution:', error);
    }
    return false;
  }
}

/**
 * Query IDs for Minisend analytics
 *
 * INSTRUCTIONS:
 * 1. Create queries in Dune UI using the SQL from DUNE_IMPLEMENTATION_GUIDE.md
 * 2. Save each query and note its ID from the URL
 * 3. Update these values with your actual query IDs
 */
export const DUNE_QUERIES = {
  // Daily transaction volume and metrics
  DAILY_VOLUME: 0, // TODO: Replace with your query ID

  // Hourly transaction flow patterns
  HOURLY_FLOW: 0, // TODO: Replace with your query ID

  // User retention and behavior analysis
  USER_RETENTION: 0, // TODO: Replace with your query ID

  // Transaction size distribution
  TRANSACTION_SIZE: 0, // TODO: Replace with your query ID

  // Gas cost analysis
  GAS_COSTS: 0, // TODO: Replace with your query ID

  // Top users by volume
  TOP_USERS: 0, // TODO: Replace with your query ID
};

/**
 * Health check for Dune Analytics integration
 *
 * @returns True if API key is configured
 */
export function isDuneAnalyticsEnabled(): boolean {
  return !!DUNE_API_KEY;
}

/**
 * Test Dune API connection
 *
 * @returns True if API is accessible
 */
export async function testDuneConnection(): Promise<boolean> {
  if (!DUNE_API_KEY) {
    return false;
  }

  try {
    // Try to get latest results for a test query
    // This will fail gracefully if the query doesn't exist
    const response = await fetch(
      `${DUNE_API_BASE}/query/1/results/latest`,
      {
        headers: {
          'X-Dune-API-Key': DUNE_API_KEY,
        },
      }
    );

    // If we get 200 or 404, API is working (404 just means query doesn't exist)
    return response.status === 200 || response.status === 404;
  } catch {
    return false;
  }
}

/**
 * Helper function to format Dune results for charts
 *
 * @param rows - Query result rows
 * @param xField - Field name for x-axis
 * @param yField - Field name for y-axis
 * @returns Formatted data for chart libraries
 */
export function formatChartData(
  rows: Array<Record<string, any>>,
  xField: string,
  yField: string
): Array<{ x: any; y: any }> {
  return rows.map(row => ({
    x: row[xField],
    y: row[yField],
  }));
}
