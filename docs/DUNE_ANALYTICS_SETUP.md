# Dune Analytics Setup Guide for Minisend

This guide explains how to set up Dune Analytics to receive and visualize blockchain events from Minisend.

## Overview

Minisend tracks events client-side and sends them to Dune Analytics via API. However, Dune works differently than traditional analytics platforms - it's primarily designed for querying blockchain data, not receiving custom events.

## Important: Dune Analytics Architecture

### Current Implementation Issue
The current `lib/dune-analytics.ts` implementation attempts to send custom events to Dune's API. However, **Dune Analytics is primarily a blockchain data analytics platform** that:

1. Indexes on-chain data automatically from blockchains
2. Allows SQL queries on blockchain data
3. Does NOT have a standard API for receiving custom application events

### Recommended Approach

You have **three options** to integrate Minisend with Dune:

---

## Option 1: Query On-Chain Data Directly (Recommended)

Since all Minisend transactions happen on Base blockchain, you can query them directly in Dune without sending custom events.

### Step 1: Identify Your Smart Contracts

```sql
-- Query to find all USDC transfers from Minisend users
SELECT
    block_time,
    tx_hash,
    "from" as sender_address,
    "to" as receiver_address,
    value / 1e6 as usdc_amount,
    tx_from as transaction_initiator
FROM base.erc20_base_transfers
WHERE contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 -- USDC on Base
    AND block_time >= NOW() - INTERVAL '30' DAY
    AND "from" IN (
        -- List your known Minisend wallet addresses or
        -- Use a subquery to identify them
    )
ORDER BY block_time DESC
```

### Step 2: Track Minisend-Specific Transactions

```sql
-- Identify Minisend transactions by known receiver addresses (PayCrest addresses)
CREATE OR REPLACE VIEW minisend_transactions AS
SELECT
    evt_block_time as timestamp,
    evt_tx_hash as transaction_hash,
    "from" as user_wallet,
    "to" as paycrest_wallet,
    value / 1e6 as usdc_amount,
    -- Enrich with additional data
    tx.gas_price,
    tx.gas_used,
    (tx.gas_price * tx.gas_used) / 1e18 as gas_cost_eth
FROM erc20_base.evt_Transfer t
INNER JOIN base.transactions tx ON t.evt_tx_hash = tx.hash
WHERE contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    AND "to" IN (
        -- Add known PayCrest receiver addresses here
        0x... -- PayCrest wallet 1
    )
    AND evt_block_time >= '2024-01-01'
ORDER BY evt_block_time DESC
```

### Step 3: Calculate Metrics

```sql
-- Daily transaction volume
SELECT
    DATE_TRUNC('day', timestamp) as date,
    COUNT(*) as transaction_count,
    SUM(usdc_amount) as total_volume_usdc,
    AVG(usdc_amount) as avg_transaction_size,
    COUNT(DISTINCT user_wallet) as unique_users
FROM minisend_transactions
GROUP BY 1
ORDER BY 1 DESC
```

---

## Option 2: Use Dune's Event Ingestion API (Beta)

Dune has a beta feature for ingesting custom events. This requires special access.

### Setup Steps:

1. **Request Access**: Contact Dune support to enable event ingestion API
2. **Create a Dataset**: Define your schema in Dune
3. **Update the API Endpoint**: Modify `lib/dune-analytics.ts`

### Modified Implementation

```typescript
// lib/dune-analytics.ts
const DUNE_API_URL = 'https://api.dune.com/api/v1/table/upload/csv'; // Correct endpoint
const DUNE_NAMESPACE = 'minisend'; // Your namespace
const DUNE_TABLE_NAME = 'events'; // Your table name

async function sendToDune(event: DuneEvent): Promise<void> {
  if (!DUNE_API_KEY) return;

  try {
    // Convert event to CSV row
    const csvRow = `${event.event_name},${event.timestamp},${event.wallet_address},${JSON.stringify(event.properties)}`;

    const response = await fetch(
      `${DUNE_API_URL}?namespace=${DUNE_NAMESPACE}&table_name=${DUNE_TABLE_NAME}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
          'X-Dune-API-Key': DUNE_API_KEY,
        },
        body: csvRow,
      }
    );

    if (!response.ok) {
      throw new Error(`Dune API error: ${response.status}`);
    }
  } catch (error) {
    // Silent fail
  }
}
```

### Dune Query for Custom Events

```sql
-- Query your custom events
SELECT
    event_name,
    timestamp,
    wallet_address,
    JSON_EXTRACT_SCALAR(properties, '$.amount') as amount,
    JSON_EXTRACT_SCALAR(properties, '$.currency') as currency,
    JSON_EXTRACT_SCALAR(properties, '$.success') as success
FROM dune.minisend.events
WHERE event_name LIKE 'transaction_%'
    AND timestamp >= NOW() - INTERVAL '7' DAY
ORDER BY timestamp DESC
```

---

## Option 3: Hybrid Approach (Best for Minisend)

Combine on-chain data with off-chain tracking via a separate database, then visualize in Dune.

### Architecture:

1. **Supabase** (You already have this): Store application events
2. **Dune**: Query on-chain blockchain data
3. **Correlation**: Link blockchain transactions with application events

### Implementation:

#### A. Continue using Supabase for app events
Your existing `analytics_events` table already captures everything.

#### B. Create Dune queries for blockchain data
Use the on-chain queries from Option 1.

#### C. Create a correlation table in Supabase
```sql
-- Add to your Supabase schema
CREATE TABLE blockchain_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    transaction_hash TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    usdc_amount NUMERIC NOT NULL,
    block_number BIGINT,
    block_timestamp TIMESTAMPTZ,
    gas_used BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tx_hash ON blockchain_transactions(transaction_hash);
```

#### D. Export Supabase data to Dune (periodic sync)
Create a script to export transaction hashes to CSV for Dune upload:

```typescript
// scripts/export-to-dune.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function exportTransactionsToDune() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get last 24 hours of transactions
  const { data: transactions } = await supabase
    .from('blockchain_transactions')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  // Convert to CSV
  const csv = transactions?.map(tx =>
    `${tx.transaction_hash},${tx.wallet_address},${tx.usdc_amount},${tx.created_at}`
  ).join('\n');

  // Save for manual upload to Dune or use API
  fs.writeFileSync('minisend-transactions.csv', `tx_hash,wallet,amount,timestamp\n${csv}`);
}
```

#### E. Query in Dune with joined data

```sql
-- Join on-chain data with your uploaded transaction list
WITH minisend_txs AS (
    SELECT * FROM dune.minisend.transactions -- Your uploaded CSV
)
SELECT
    t.evt_block_time as timestamp,
    t.evt_tx_hash as tx_hash,
    t.value / 1e6 as usdc_amount,
    mt.order_id,
    mt.wallet as minisend_wallet,
    -- Calculate profit/fees
    (t.value / 1e6) - mt.expected_amount as fee_captured
FROM erc20_base.evt_Transfer t
INNER JOIN minisend_txs mt ON t.evt_tx_hash = mt.tx_hash
WHERE t.contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
ORDER BY t.evt_block_time DESC
```

---

## Recommended Dune Queries for Minisend

### 1. Transaction Volume Dashboard

```sql
-- Daily USDC volume through Minisend
SELECT
    DATE_TRUNC('day', evt_block_time) as date,
    COUNT(*) as tx_count,
    SUM(value / 1e6) as total_usdc,
    AVG(value / 1e6) as avg_tx_size,
    COUNT(DISTINCT "from") as unique_senders
FROM erc20_base.evt_Transfer
WHERE contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 -- USDC Base
    AND "to" IN (
        -- Add your known PayCrest receiver addresses
        0xYourPayCrestWallet1,
        0xYourPayCrestWallet2
    )
    AND evt_block_time >= NOW() - INTERVAL '30' DAY
GROUP BY 1
ORDER BY 1 DESC
```

### 2. User Retention Analysis

```sql
-- Track returning users
WITH user_transactions AS (
    SELECT
        "from" as wallet,
        DATE_TRUNC('day', evt_block_time) as tx_date,
        COUNT(*) as tx_count
    FROM erc20_base.evt_Transfer
    WHERE contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        AND "to" IN (/* PayCrest addresses */)
    GROUP BY 1, 2
)
SELECT
    tx_date,
    COUNT(DISTINCT wallet) as total_users,
    COUNT(DISTINCT CASE WHEN tx_count > 1 THEN wallet END) as repeat_users,
    COUNT(DISTINCT CASE WHEN tx_count > 1 THEN wallet END)::FLOAT / COUNT(DISTINCT wallet) as repeat_rate
FROM user_transactions
GROUP BY 1
ORDER BY 1 DESC
```

### 3. Gas Cost Analysis

```sql
-- Analyze transaction costs
SELECT
    DATE_TRUNC('hour', t.evt_block_time) as hour,
    AVG(tx.gas_price * tx.gas_used / 1e18) as avg_gas_cost_eth,
    AVG(tx.gas_price * tx.gas_used / 1e18 * prices.price) as avg_gas_cost_usd,
    MAX(tx.gas_price * tx.gas_used / 1e18 * prices.price) as max_gas_cost_usd
FROM erc20_base.evt_Transfer t
INNER JOIN base.transactions tx ON t.evt_tx_hash = tx.hash
LEFT JOIN prices.usd p ON p.minute = DATE_TRUNC('minute', t.evt_block_time)
    AND p.blockchain = 'ethereum'
    AND p.symbol = 'ETH'
WHERE t.contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    AND t."to" IN (/* PayCrest addresses */)
GROUP BY 1
ORDER BY 1 DESC
```

### 4. Currency Distribution (if you track conversion destinations)

```sql
-- Assuming you have a mapping table uploaded to Dune
SELECT
    m.destination_currency,
    COUNT(*) as tx_count,
    SUM(t.value / 1e6) as total_usdc,
    AVG(t.value / 1e6) as avg_amount
FROM erc20_base.evt_Transfer t
INNER JOIN dune.minisend.currency_mapping m ON t.evt_tx_hash = m.tx_hash
WHERE t.contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
GROUP BY 1
ORDER BY 2 DESC
```

### 5. Wallet Balance Distribution

```sql
-- See how much USDC users hold before transacting
WITH latest_balances AS (
    SELECT DISTINCT ON (address)
        address,
        balance / 1e6 as usdc_balance
    FROM erc20_base.balances
    WHERE contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        AND blockchain = 'base'
    ORDER BY address, block_time DESC
)
SELECT
    CASE
        WHEN usdc_balance < 10 THEN '< $10'
        WHEN usdc_balance < 100 THEN '$10-$100'
        WHEN usdc_balance < 1000 THEN '$100-$1000'
        ELSE '$1000+'
    END as balance_bucket,
    COUNT(*) as user_count
FROM latest_balances
WHERE address IN (
    SELECT DISTINCT "from" FROM erc20_base.evt_Transfer
    WHERE "to" IN (/* PayCrest addresses */)
)
GROUP BY 1
ORDER BY 2 DESC
```

---

## Action Items

### Immediate Actions:

1. **Decide on Architecture**: Choose Option 1 (on-chain only), Option 2 (event ingestion), or Option 3 (hybrid)

2. **Get PayCrest Receiver Addresses**:
   - Contact PayCrest or check your transaction history
   - These are the wallet addresses that receive USDC from your users

3. **Create Dune Account**:
   - Sign up at dune.com
   - Create a new project for Minisend

4. **Create First Query**:
   - Use the "Transaction Volume Dashboard" query above
   - Replace placeholder addresses with actual PayCrest wallets

5. **Build Dashboard**:
   - Add queries as visualizations
   - Create charts for volume, users, retention

### If Using Event Ingestion (Option 2):

1. Contact Dune support: support@dune.com
2. Request beta access to event ingestion API
3. Wait for namespace creation
4. Update `lib/dune-analytics.ts` with correct endpoint
5. Test with sample events

### If Using Hybrid (Option 3 - Recommended):

1. Keep current Supabase analytics (you already have this)
2. Create Dune queries for on-chain data (use queries above)
3. Periodically export correlation data from Supabase
4. Upload CSV to Dune for enriched analysis
5. Build dashboards that combine both data sources

---

## Current Implementation Status

The current `lib/dune-analytics.ts` tries to send events to:
```
https://api.dune.com/api/v1/query/execute
```

This endpoint is for **executing queries**, not receiving events. You need to either:

1. **Remove event sending** and just use Dune for querying blockchain data (Option 1)
2. **Get event ingestion access** and update the endpoint (Option 2)
3. **Keep Supabase for events** and use Dune only for blockchain queries (Option 3)

**Recommendation**: Use **Option 3** as it leverages your existing Supabase infrastructure and Dune's blockchain querying strengths.
