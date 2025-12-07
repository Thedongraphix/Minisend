-- ========================================
-- Pretium Receipt Data Diagnostic Queries
-- ========================================
-- Run these queries to verify receipt generation data

-- 1. CHECK RECENT PRETIUM TRANSACTIONS
-- Shows all fields needed for receipt generation
SELECT
  pretium_transaction_code,
  pretium_receipt_number,
  account_name,
  phone_number,
  till_number,
  paybill_number,
  paybill_account,
  amount_in_usdc,
  amount_in_local,
  rate,
  sender_fee,
  transaction_fee,
  transaction_hash,
  wallet_address,
  status,
  created_at,
  CASE
    WHEN pretium_receipt_number IS NULL THEN '❌ No M-Pesa Code'
    WHEN account_name IS NULL THEN '❌ No Recipient Name'
    WHEN transaction_hash IS NULL THEN '❌ No Blockchain Hash'
    WHEN (phone_number IS NULL AND till_number IS NULL AND paybill_number IS NULL) THEN '❌ No Payment Method'
    WHEN transaction_fee IS NULL THEN '⚠️  No Transaction Fee'
    WHEN sender_fee IS NULL THEN '⚠️  No Sender Fee'
    ELSE '✅ Ready for Receipt'
  END as receipt_readiness
FROM orders
WHERE payment_provider = 'PRETIUM_KES'
ORDER BY created_at DESC
LIMIT 10;

-- 2. FIND MISSING M-PESA CODES
-- Transactions that completed but don't have M-Pesa receipt number
SELECT
  pretium_transaction_code,
  status,
  paycrest_status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM orders
WHERE payment_provider = 'PRETIUM_KES'
  AND status = 'completed'
  AND pretium_receipt_number IS NULL
ORDER BY created_at DESC;

-- 3. CHECK WEBHOOK RECEIPT UPDATES
-- See which transactions got M-Pesa codes via webhook
SELECT
  pretium_transaction_code,
  pretium_receipt_number,
  account_name,
  status,
  created_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - created_at)) as seconds_to_complete
FROM orders
WHERE payment_provider = 'PRETIUM_KES'
  AND pretium_receipt_number IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 4. FIELD COMPLETENESS SUMMARY
-- Overall health check
SELECT
  COUNT(*) as total_transactions,
  COUNT(pretium_receipt_number) as has_mpesa_code,
  COUNT(transaction_hash) as has_blockchain_hash,
  COUNT(account_name) as has_recipient_name,
  COUNT(CASE WHEN phone_number IS NOT NULL OR till_number IS NOT NULL OR paybill_number IS NOT NULL THEN 1 END) as has_payment_method,
  COUNT(sender_fee) as has_sender_fee,
  COUNT(transaction_fee) as has_transaction_fee,
  ROUND(COUNT(pretium_receipt_number) * 100.0 / COUNT(*), 2) as mpesa_code_percent,
  ROUND(COUNT(transaction_hash) * 100.0 / COUNT(*), 2) as blockchain_hash_percent
FROM orders
WHERE payment_provider = 'PRETIUM_KES';

-- 5. SAMPLE RECEIPT DATA
-- Get a complete example to verify all fields
SELECT
  pretium_transaction_code as "Transaction Code",
  pretium_receipt_number as "M-Pesa Code",
  account_name as "Recipient",
  COALESCE(phone_number, till_number, paybill_number) as "Payment To",
  amount_in_local as "KES Amount",
  amount_in_usdc as "USDC Amount",
  rate as "Exchange Rate",
  sender_fee as "Sender Fee",
  transaction_fee as "TX Fee",
  transaction_hash as "Blockchain Hash",
  status as "Status"
FROM orders
WHERE payment_provider = 'PRETIUM_KES'
  AND pretium_receipt_number IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;

-- 6. FIND PROBLEM TRANSACTIONS
-- Transactions that should have all data but don't
SELECT
  pretium_transaction_code,
  status,
  created_at,
  CASE
    WHEN pretium_receipt_number IS NULL THEN 'Missing M-Pesa code'
    WHEN account_name IS NULL THEN 'Missing recipient name'
    WHEN transaction_hash IS NULL THEN 'Missing blockchain hash'
    WHEN transaction_fee IS NULL THEN 'Missing transaction fee'
    ELSE 'Unknown issue'
  END as issue
FROM orders
WHERE payment_provider = 'PRETIUM_KES'
  AND status IN ('completed', 'pending', 'processing')
  AND (
    pretium_receipt_number IS NULL OR
    account_name IS NULL OR
    transaction_hash IS NULL OR
    transaction_fee IS NULL
  )
ORDER BY created_at DESC;

-- 7. ANALYTICS EVENTS CHECK
-- Verify webhook events are being logged
SELECT
  event_name,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM analytics_events
WHERE event_name LIKE '%pretium%'
GROUP BY event_name
ORDER BY last_occurrence DESC;
