# Dune Analytics Implementation Guide for Minisend

## Understanding Dune Analytics

Based on Dune's architecture, there are **two ways** to use Dune with Minisend:

1. **Create Queries in Dune UI** to analyze on-chain Base Network data (recommended)
2. **Use Dune API** to execute pre-created queries and embed results in your app

## ⚠️ Important: Current Implementation Needs Update

The current `lib/dune-analytics.ts` tries to send events to Dune's query execution endpoint, which is incorrect. Dune doesn't accept custom event data via API.

### What Dune Actually Does:
- Indexes blockchain data automatically (Ethereum, Base, Polygon, etc.)
- Allows you to create SQL queries on this data
- Provides API to execute these queries programmatically

---

## Recommended Approach: Query On-Chain Data

Since all Minisend transactions happen on Base blockchain using USDC, we can track everything directly in Dune without sending events.

### Step 1: Create Dune Queries for Minisend

Go to [Dune.com](https://dune.com/queries) and create these queries:

#### Query 1: Daily Minisend Transaction Volume

```sql
-- Daily USDC volume through Minisend
-- Save this query and note the query ID
SELECT
    DATE_TRUNC('day', block_time) as date,
    COUNT(*) as transaction_count,
    SUM(value / 1e6) as total_usdc_volume,
    AVG(value / 1e6) as average_transaction_size,
    COUNT(DISTINCT "from") as unique_users,
    SUM(value / 1e6) / COUNT(DISTINCT "from") as avg_volume_per_user
FROM base.erc20_base_transfers
WHERE
    -- USDC contract on Base
    contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    -- PayCrest receiver addresses (get these from your PayCrest dashboard)
    AND "to" IN (
        0xYourPayCrestWallet1,  -- Replace with actual addresses
        0xYourPayCrestWallet2
    )
    AND block_time >= NOW() - INTERVAL '{{Days}}' day
GROUP BY 1
ORDER BY 1 DESC
```

**Add Parameter:**
- Name: `Days`
- Type: Number
- Default: 30

#### Query 2: Hourly Transaction Flow

```sql
-- Hourly transaction patterns
SELECT
    DATE_TRUNC('hour', block_time) as hour,
    COUNT(*) as tx_count,
    SUM(value / 1e6) as volume_usdc,
    AVG(value / 1e6) as avg_tx_size
FROM base.erc20_base_transfers
WHERE
    contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    AND "to" IN (/* Your PayCrest addresses */)
    AND block_time >= NOW() - INTERVAL '7' day
GROUP BY 1
ORDER BY 1 DESC
```

#### Query 3: User Retention & Behavior

```sql
-- Track returning users and transaction frequency
WITH user_stats AS (
    SELECT
        "from" as wallet_address,
        MIN(block_time) as first_transaction,
        MAX(block_time) as last_transaction,
        COUNT(*) as total_transactions,
        SUM(value / 1e6) as total_volume_usdc,
        AVG(value / 1e6) as avg_transaction_size
    FROM base.erc20_base_transfers
    WHERE
        contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        AND "to" IN (/* Your PayCrest addresses */)
        AND block_time >= NOW() - INTERVAL '{{Days}}' day
    GROUP BY 1
)
SELECT
    CASE
        WHEN total_transactions = 1 THEN 'One-time users'
        WHEN total_transactions BETWEEN 2 AND 5 THEN 'Regular users'
        WHEN total_transactions > 5 THEN 'Power users'
    END as user_category,
    COUNT(*) as user_count,
    SUM(total_volume_usdc) as total_volume,
    AVG(total_volume_usdc) as avg_volume_per_user,
    AVG(total_transactions) as avg_transactions_per_user
FROM user_stats
GROUP BY 1
ORDER BY 2 DESC
```

#### Query 4: Transaction Size Distribution

```sql
-- Distribution of transaction sizes
WITH tx_buckets AS (
    SELECT
        value / 1e6 as usdc_amount,
        CASE
            WHEN value / 1e6 < 10 THEN '< $10'
            WHEN value / 1e6 < 50 THEN '$10-$50'
            WHEN value / 1e6 < 100 THEN '$50-$100'
            WHEN value / 1e6 < 500 THEN '$100-$500'
            WHEN value / 1e6 < 1000 THEN '$500-$1000'
            ELSE '$1000+'
        END as amount_bucket
    FROM base.erc20_base_transfers
    WHERE
        contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        AND "to" IN (/* Your PayCrest addresses */)
        AND block_time >= NOW() - INTERVAL '{{Days}}' day
)
SELECT
    amount_bucket,
    COUNT(*) as transaction_count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM tx_buckets
GROUP BY 1
ORDER BY
    CASE amount_bucket
        WHEN '< $10' THEN 1
        WHEN '$10-$50' THEN 2
        WHEN '$50-$100' THEN 3
        WHEN '$100-$500' THEN 4
        WHEN '$500-$1000' THEN 5
        ELSE 6
    END
```

#### Query 5: Gas Cost Analysis

```sql
-- Analyze transaction costs
SELECT
    DATE_TRUNC('day', t.block_time) as date,
    COUNT(*) as transaction_count,
    AVG(tx.gas_price * tx.gas_used / 1e18) as avg_gas_cost_eth,
    MAX(tx.gas_price * tx.gas_used / 1e18) as max_gas_cost_eth,
    MIN(tx.gas_price * tx.gas_used / 1e18) as min_gas_cost_eth,
    -- Convert to USD if price data available
    AVG(tx.gas_price * tx.gas_used / 1e18 * p.price) as avg_gas_cost_usd
FROM base.erc20_base_transfers t
INNER JOIN base.transactions tx
    ON t.tx_hash = tx.hash
LEFT JOIN prices.usd p
    ON DATE_TRUNC('day', t.block_time) = p.day
    AND p.blockchain = 'ethereum'
    AND p.symbol = 'ETH'
WHERE
    t.contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    AND t."to" IN (/* Your PayCrest addresses */)
    AND t.block_time >= NOW() - INTERVAL '{{Days}}' day
GROUP BY 1
ORDER BY 1 DESC
```

#### Query 6: Top Users by Volume

```sql
-- Identify your highest-value users
SELECT
    "from" as wallet_address,
    COUNT(*) as transaction_count,
    SUM(value / 1e6) as total_volume_usdc,
    AVG(value / 1e6) as avg_transaction_size,
    MIN(block_time) as first_transaction,
    MAX(block_time) as last_transaction,
    EXTRACT(DAY FROM (MAX(block_time) - MIN(block_time))) as days_active
FROM base.erc20_base_transfers
WHERE
    contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    AND "to" IN (/* Your PayCrest addresses */)
    AND block_time >= NOW() - INTERVAL '{{Days}}' day
GROUP BY 1
ORDER BY 3 DESC
LIMIT 100
```

### Step 2: Create Visualizations in Dune

For each query:

1. **Click "New Visualization"**
2. **Choose chart type:**
   - Query 1 (Daily Volume): Area chart or Bar chart
   - Query 2 (Hourly): Line chart
   - Query 3 (User Retention): Pie chart or Bar chart
   - Query 4 (Transaction Size): Bar chart
   - Query 5 (Gas Costs): Line chart with dual axis
   - Query 6 (Top Users): Table

3. **Configure axes:**
   - X-axis: Date/Time field
   - Y-axis: Metric (volume, count, etc.)
   - Group by: Category if needed

### Step 3: Create a Minisend Dashboard

1. Go to [Dune Dashboards](https://dune.com/browse/dashboards)
2. Click "New Dashboard"
3. Name it "Minisend Analytics"
4. Add all your queries as widgets
5. Arrange them in a logical flow

---

## Using Dune API to Execute Queries

Once you have queries created, you can execute them via API and display results in your app.

### Updated `lib/dune-analytics.ts`

Replace the current implementation with:

```typescript
/**
 * Dune Analytics Integration for Minisend
 *
 * This module executes pre-created Dune queries via API to fetch
 * on-chain analytics data for display in the Minisend dashboard.
 */

const DUNE_API_KEY = process.env.DUNE_API_KEY;
const DUNE_API_BASE = 'https://api.dune.com/api/v1';

interface DuneQueryResult {
  execution_id: string;
  state: 'QUERY_STATE_PENDING' | 'QUERY_STATE_EXECUTING' | 'QUERY_STATE_COMPLETED' | 'QUERY_STATE_FAILED';
  result?: {
    rows: Array<Record<string, any>>;
    metadata: {
      column_names: string[];
      row_count: number;
    };
  };
}

/**
 * Execute a Dune query by ID
 * @param queryId - The Dune query ID (from the URL, e.g., 4601471)
 * @param parameters - Optional query parameters
 */
export async function executeDuneQuery(
  queryId: number,
  parameters?: Record<string, string | number>
): Promise<DuneQueryResult | null> {
  if (!DUNE_API_KEY) {
    console.warn('Dune API key not configured');
    return null;
  }

  try {
    // Execute the query
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
        }),
      }
    );

    if (!executeResponse.ok) {
      throw new Error(`Dune API error: ${executeResponse.status}`);
    }

    const { execution_id } = await executeResponse.json();

    // Poll for results
    return await pollQueryResults(execution_id);
  } catch (error) {
    console.error('Error executing Dune query:', error);
    return null;
  }
}

/**
 * Poll for query results
 */
async function pollQueryResults(
  executionId: string,
  maxAttempts = 10
): Promise<DuneQueryResult | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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

      if (result.state === 'QUERY_STATE_COMPLETED') {
        return result;
      }

      if (result.state === 'QUERY_STATE_FAILED') {
        throw new Error('Query execution failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error polling query results (attempt ${attempt + 1}):`, error);
    }
  }

  return null;
}

/**
 * Get latest query results without re-executing
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
    console.error('Error fetching latest query results:', error);
    return null;
  }
}

// Query IDs - Update these after creating queries in Dune
export const DUNE_QUERIES = {
  DAILY_VOLUME: 0, // Replace with your query ID
  HOURLY_FLOW: 0,
  USER_RETENTION: 0,
  TRANSACTION_SIZE: 0,
  GAS_COSTS: 0,
  TOP_USERS: 0,
};
```

### Example Usage in React Component

```typescript
// app/components/DuneAnalyticsDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { executeDuneQuery, DUNE_QUERIES } from '@/lib/dune-analytics';

export function DuneAnalyticsDashboard() {
  const [dailyVolume, setDailyVolume] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);

      // Execute the daily volume query with 30-day parameter
      const result = await executeDuneQuery(DUNE_QUERIES.DAILY_VOLUME, {
        Days: 30
      });

      if (result?.result) {
        setDailyVolume(result.result.rows);
      }

      setLoading(false);
    }

    fetchAnalytics();
  }, []);

  if (loading) return <div>Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Minisend Analytics</h2>

      {/* Display data */}
      <div className="grid grid-cols-3 gap-4">
        {dailyVolume?.slice(0, 7).map((day: any) => (
          <div key={day.date} className="p-4 bg-gray-100 rounded">
            <div className="text-sm text-gray-600">{day.date}</div>
            <div className="text-2xl font-bold">${day.total_usdc_volume.toFixed(2)}</div>
            <div className="text-sm">{day.transaction_count} transactions</div>
          </div>
        ))}
      </div>

      {/* Embed Dune visualization */}
      <div className="mt-8">
        <iframe
          src="https://dune.com/embeds/YOUR_QUERY_ID/YOUR_VIZ_ID"
          style={{ width: '100%', height: '400px', border: 'none' }}
        />
      </div>
    </div>
  );
}
```

---

## Setup Checklist

### 1. Get PayCrest Receiver Addresses
- [ ] Contact PayCrest or check transaction history
- [ ] Identify all wallet addresses that receive USDC from your users
- [ ] Add these addresses to queries

### 2. Create Dune Account & Queries
- [ ] Sign up at [dune.com](https://dune.com)
- [ ] Create Query 1: Daily Volume
- [ ] Create Query 2: Hourly Flow
- [ ] Create Query 3: User Retention
- [ ] Create Query 4: Transaction Size Distribution
- [ ] Create Query 5: Gas Cost Analysis
- [ ] Create Query 6: Top Users
- [ ] Note all query IDs

### 3. Create Dashboard
- [ ] Create new Dune dashboard
- [ ] Add all queries as visualizations
- [ ] Make dashboard public or get embed codes

### 4. Update Code
- [ ] Replace `lib/dune-analytics.ts` with new implementation
- [ ] Update `DUNE_QUERIES` object with your query IDs
- [ ] Create analytics dashboard component (optional)

### 5. Test
- [ ] Execute queries via API
- [ ] Verify data is returned correctly
- [ ] Test with different parameters
- [ ] Embed visualizations in your app

---

## Cost Considerations

Dune API pricing:
- **Free tier**: 3 queries per day
- **Premium**: $99/month - 1000 queries per day
- **Plus**: $399/month - 10,000 queries per day

**Recommendation**:
- Start with manual dashboard viewing (free)
- Add API integration when you need programmatic access
- Cache query results to minimize API calls

---

## Alternative: Manual Dashboard Only

If you don't need API integration:

1. Create queries in Dune (free)
2. Build dashboard (free)
3. Share dashboard link with stakeholders
4. Manually check analytics periodically

This is completely free and still provides all the insights!
