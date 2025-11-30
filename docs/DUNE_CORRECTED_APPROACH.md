# Corrected Dune Analytics Approach for Minisend

## ⚠️ Important Discovery: How PayCrest Actually Works

After reviewing the PayCrest API documentation, I discovered the critical detail:

**PayCrest generates unique temporary `receiveAddress` for EACH order**, not fixed wallet addresses.

### PayCrest Order Flow:
1. Minisend calls `/sender/orders` API with payment details
2. PayCrest **generates a unique temporary wallet address** (`receiveAddress`)
3. User sends USDC to this unique temporary address
4. PayCrest processes the payment and sends local currency to recipient
5. The temporary address is **never reused**

### Example Response:
```json
{
  "data": {
    "id": "order-123",
    "receiveAddress": "0x1a2b3c4d...",  // ← Unique for THIS order only
    "amount": "50",
    "validUntil": "2024-01-15T10:30:00Z"
  }
}
```

## Why This Changes Everything for Dune

### ❌ Original Approach (Won't Work):
```sql
-- This won't work because there's no fixed PayCrest wallet
SELECT * FROM base.erc20_base_transfers
WHERE "to" IN (0xPayCrestWallet1, 0xPayCrestWallet2) -- No such thing!
```

### ✅ Correct Approach: Track Your User Wallets

Since PayCrest generates unique addresses per order, we need to track transactions **from your users' wallets** instead:

```sql
-- Track all USDC transfers FROM known Minisend users
SELECT
    block_time,
    tx_hash,
    "from" as minisend_user,
    "to" as paycrest_receive_address,
    value / 1e6 as usdc_amount
FROM base.erc20_base_transfers
WHERE
    contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    AND "from" IN (
        -- Your known user wallet addresses
        0xUserWallet1,
        0xUserWallet2,
        -- etc...
    )
```

**Problem**: You need to know user wallet addresses in advance.

## Recommended Solution: Hybrid Approach with Supabase

Since Dune can't identify Minisend transactions without knowing addresses in advance, the best approach is:

### Architecture:

```
┌─────────────────────────────────────┐
│      Minisend Application           │
├─────────────────────────────────────┤
│  1. Create PayCrest order (API)    │
│  2. Get receiveAddress from API     │
│  3. Store in Supabase:              │
│     - order_id                      │
│     - receive_address (unique!)     │
│     - wallet_address (user)         │
│     - amount                        │
│     - created_at                    │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│         Supabase Database           │
├─────────────────────────────────────┤
│  orders table:                      │
│  - paycrest_order_id                │
│  - receive_address (unique!)        │
│  - wallet_address                   │
│  - amount                           │
│                                     │
│  ← YOU ALREADY HAVE THIS! ✅        │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      Export Script (Daily/Weekly)   │
├─────────────────────────────────────┤
│  Extract from Supabase:             │
│  - All receive_addresses            │
│  - All wallet_addresses             │
│  - Create CSV for Dune upload       │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      Upload to Dune (Manual/API)    │
├─────────────────────────────────────┤
│  Create table: minisend_addresses   │
│  - receive_address                  │
│  - user_wallet                      │
│  - order_id                         │
│  - created_at                       │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│        Dune SQL Queries             │
├─────────────────────────────────────┤
│  Join on-chain data with addresses  │
│  Get complete transaction picture   │
└─────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Export Minisend Addresses from Supabase

Create a script to export your order data:

```typescript
// scripts/export-minisend-addresses.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function exportMinisendAddresses() {
  // Get all orders with their PayCrest receive addresses
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      paycrest_order_id,
      paycrest_receive_address,
      wallet_address,
      amount_in_usdc,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (!orders) {
    console.error('No orders found');
    return;
  }

  // Create CSV format for Dune
  const csvHeader = 'receive_address,user_wallet,order_id,usdc_amount,created_at\n';
  const csvRows = orders.map(order =>
    `${order.paycrest_receive_address},${order.wallet_address},${order.paycrest_order_id},${order.amount_in_usdc},${order.created_at}`
  ).join('\n');

  const csv = csvHeader + csvRows;

  // Save to file
  fs.writeFileSync('minisend-addresses.csv', csv);
  console.log(`✅ Exported ${orders.length} orders to minisend-addresses.csv`);
}

exportMinisendAddresses();
```

### Step 2: Upload CSV to Dune

1. **Manual Upload** (Free):
   - Go to Dune.com
   - Create a new dataset: "minisend_addresses"
   - Upload the CSV file
   - Dune creates a table you can query

2. **API Upload** (Requires Premium):
   ```bash
   curl -X POST "https://api.dune.com/api/v1/table/upload/csv" \
     -H "X-Dune-API-Key: YOUR_API_KEY" \
     -H "Content-Type: text/csv" \
     --data-binary @minisend-addresses.csv
   ```

### Step 3: Create Dune Queries (Corrected)

Now you can query on-chain data and join with your uploaded addresses:

#### Query 1: Daily Transaction Volume

```sql
-- Join on-chain transfers with your uploaded addresses
WITH minisend_transfers AS (
    SELECT
        t.block_time,
        t.tx_hash,
        t."from" as user_wallet,
        t."to" as receive_address,
        t.value / 1e6 as usdc_amount,
        m.order_id,
        m.created_at as order_created_at
    FROM base.erc20_base_transfers t
    INNER JOIN dune.yourusername.minisend_addresses m
        ON t."to" = m.receive_address
    WHERE t.contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
)
SELECT
    DATE_TRUNC('day', block_time) as date,
    COUNT(*) as transaction_count,
    SUM(usdc_amount) as total_volume_usdc,
    AVG(usdc_amount) as avg_transaction_size,
    COUNT(DISTINCT user_wallet) as unique_users
FROM minisend_transfers
WHERE block_time >= NOW() - INTERVAL '{{Days}}' day
GROUP BY 1
ORDER BY 1 DESC
```

#### Query 2: Transaction Success Rate

```sql
-- Compare orders created vs transactions completed
WITH orders_created AS (
    SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as orders_count,
        SUM(CAST(usdc_amount AS DOUBLE)) as expected_volume
    FROM dune.yourusername.minisend_addresses
    WHERE created_at >= NOW() - INTERVAL '30' day
    GROUP BY 1
),
transactions_completed AS (
    SELECT
        DATE_TRUNC('day', t.block_time) as date,
        COUNT(*) as tx_count,
        SUM(t.value / 1e6) as actual_volume
    FROM base.erc20_base_transfers t
    INNER JOIN dune.yourusername.minisend_addresses m
        ON t."to" = m.receive_address
    WHERE t.contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        AND t.block_time >= NOW() - INTERVAL '30' day
    GROUP BY 1
)
SELECT
    o.date,
    o.orders_count,
    COALESCE(t.tx_count, 0) as transactions_completed,
    o.expected_volume,
    COALESCE(t.actual_volume, 0) as actual_volume,
    CASE
        WHEN o.orders_count > 0
        THEN (COALESCE(t.tx_count, 0) * 100.0 / o.orders_count)
        ELSE 0
    END as success_rate_percent
FROM orders_created o
LEFT JOIN transactions_completed t ON o.date = t.date
ORDER BY o.date DESC
```

#### Query 3: User Wallet Analysis

```sql
-- Analyze user wallet behavior
SELECT
    user_wallet,
    COUNT(DISTINCT order_id) as total_orders,
    COUNT(DISTINCT tx_hash) as completed_transactions,
    SUM(usdc_amount) as total_volume,
    AVG(usdc_amount) as avg_transaction_size,
    MIN(block_time) as first_transaction,
    MAX(block_time) as last_transaction,
    EXTRACT(DAY FROM (MAX(block_time) - MIN(block_time))) as days_active
FROM (
    SELECT
        t.tx_hash,
        t.block_time,
        m.user_wallet,
        m.order_id,
        t.value / 1e6 as usdc_amount
    FROM base.erc20_base_transfers t
    INNER JOIN dune.yourusername.minisend_addresses m
        ON t."to" = m.receive_address
    WHERE t.contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
)
GROUP BY 1
ORDER BY 3 DESC
LIMIT 100
```

#### Query 4: Payment Time Analysis

```sql
-- How long from order creation to payment
WITH order_timing AS (
    SELECT
        m.order_id,
        m.created_at as order_created,
        MIN(t.block_time) as payment_received,
        EXTRACT(EPOCH FROM (MIN(t.block_time) - m.created_at)) / 60 as minutes_to_pay,
        SUM(t.value / 1e6) as amount_paid
    FROM dune.yourusername.minisend_addresses m
    LEFT JOIN base.erc20_base_transfers t
        ON t."to" = m.receive_address
        AND t.contract_address = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    WHERE m.created_at >= NOW() - INTERVAL '30' day
    GROUP BY 1, 2
)
SELECT
    CASE
        WHEN minutes_to_pay IS NULL THEN 'Not Paid'
        WHEN minutes_to_pay < 1 THEN '< 1 minute'
        WHEN minutes_to_pay < 5 THEN '1-5 minutes'
        WHEN minutes_to_pay < 15 THEN '5-15 minutes'
        WHEN minutes_to_pay < 60 THEN '15-60 minutes'
        ELSE '> 1 hour'
    END as time_bucket,
    COUNT(*) as order_count,
    AVG(amount_paid) as avg_amount
FROM order_timing
GROUP BY 1
ORDER BY
    CASE
        WHEN minutes_to_pay IS NULL THEN 6
        WHEN minutes_to_pay < 1 THEN 1
        WHEN minutes_to_pay < 5 THEN 2
        WHEN minutes_to_pay < 15 THEN 3
        WHEN minutes_to_pay < 60 THEN 4
        ELSE 5
    END
```

## Automated Export Script

Add this to your package.json:

```json
{
  "scripts": {
    "export-dune": "ts-node scripts/export-minisend-addresses.ts"
  }
}
```

Run weekly or daily:
```bash
npm run export-dune
```

Then upload the generated CSV to Dune.

## Alternative: Use Supabase for Analytics (Recommended)

Since you already have all the data in Supabase, you might not even need Dune!

### Create Supabase Views for Analytics:

```sql
-- Daily volume view
CREATE OR REPLACE VIEW analytics_daily_volume AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as order_count,
    SUM(amount_in_usdc) as total_volume_usdc,
    AVG(amount_in_usdc) as avg_transaction_size,
    COUNT(DISTINCT wallet_address) as unique_users,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM orders
GROUP BY 1
ORDER BY 1 DESC;

-- User retention view
CREATE OR REPLACE VIEW analytics_user_retention AS
SELECT
    wallet_address,
    COUNT(*) as total_orders,
    SUM(amount_in_usdc) as total_volume,
    AVG(amount_in_usdc) as avg_order_size,
    MIN(created_at) as first_order,
    MAX(created_at) as last_order,
    EXTRACT(DAY FROM (MAX(created_at) - MIN(created_at))) as days_active,
    CASE
        WHEN COUNT(*) = 1 THEN 'One-time'
        WHEN COUNT(*) BETWEEN 2 AND 5 THEN 'Regular'
        ELSE 'Power User'
    END as user_category
FROM orders
GROUP BY wallet_address;
```

Then query in your app:
```typescript
const { data: dailyVolume } = await supabase
  .from('analytics_daily_volume')
  .select('*')
  .gte('date', '2024-01-01')
  .order('date', { ascending: false });
```

## Summary

### ✅ What to Do:

1. **Keep using Supabase** for analytics (you already have all the data!)
2. **Create analytics views** in Supabase (SQL above)
3. **Optional**: Export to Dune weekly for blockchain-specific analysis
4. **Build dashboard** in your app using Supabase data

### ❌ What Won't Work:

- Querying Dune for "PayCrest wallet addresses" (they don't exist - each order gets a unique address)
- Tracking Minisend transactions without knowing the wallet addresses first

### 💡 Key Insight:

**You already have better data in Supabase than what Dune can provide!**

Dune is great for analyzing protocols with fixed addresses (like Uniswap, Aave, etc.), but for your use case where PayCrest generates unique addresses per order, Supabase is actually the better analytics platform.
