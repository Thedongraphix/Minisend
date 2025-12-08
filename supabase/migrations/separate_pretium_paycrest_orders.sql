-- Set timezone to EAT (East Africa Time) to match existing schema
SET timezone = 'Africa/Nairobi';

-- ============================================================================
-- MIGRATION: Separate Pretium and PayCrest Orders into Different Tables
-- ============================================================================
-- This migration creates a dedicated table for Pretium orders and restructures
-- the existing orders table to be PayCrest-specific. It migrates existing data
-- to maintain backward compatibility.
-- ============================================================================

-- Create pretium_orders table with all Pretium-specific fields
CREATE TABLE IF NOT EXISTS pretium_orders (
  -- Primary identification
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_code TEXT NOT NULL UNIQUE, -- Pretium's unique transaction identifier
  user_id UUID REFERENCES users(id),
  wallet_address TEXT NOT NULL,

  -- Transaction details
  transaction_hash TEXT NOT NULL, -- Blockchain transaction hash
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  pretium_status TEXT, -- Raw status from Pretium API ('PENDING', 'COMPLETE', 'FAILED', etc.)

  -- Amount information
  amount_in_usdc DECIMAL(20, 6) NOT NULL, -- USDC amount sent by user
  amount_in_local DECIMAL(20, 2) NOT NULL, -- KES amount recipient receives
  local_currency TEXT NOT NULL DEFAULT 'KES', -- Currently only KES supported
  exchange_rate DECIMAL(20, 6) NOT NULL, -- Exchange rate used
  sender_fee DECIMAL(20, 2) DEFAULT 0, -- Platform fee collected

  -- Payment method details
  payment_type TEXT NOT NULL CHECK (payment_type IN ('MOBILE', 'BUY_GOODS', 'PAYBILL')),
  phone_number TEXT, -- For MOBILE payments
  till_number TEXT, -- For BUY_GOODS payments
  paybill_number TEXT, -- For PAYBILL payments
  paybill_account TEXT, -- For PAYBILL payments
  account_name TEXT NOT NULL, -- Recipient name

  -- Receipt information
  receipt_number TEXT, -- M-Pesa receipt number (available when completed)
  public_name TEXT, -- Public name from M-Pesa receipt

  -- Network information
  mobile_network TEXT DEFAULT 'SAFARICOM', -- Mobile network provider
  chain TEXT NOT NULL DEFAULT 'BASE', -- Blockchain network

  -- Metadata
  error_message TEXT, -- Error details if failed
  settlement_address TEXT, -- Pretium settlement address
  callback_url TEXT, -- Webhook URL for status updates

  -- Farcaster integration
  fid INTEGER, -- Farcaster ID for push notifications

  -- Raw API data for debugging
  raw_disburse_request JSONB, -- Original disburse request sent to Pretium
  raw_disburse_response JSONB, -- Original disburse response from Pretium
  raw_webhook_payloads JSONB[], -- Array of all webhook payloads received

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
  completed_at TIMESTAMP WITH TIME ZONE -- When payment was completed
);

-- Create indexes for pretium_orders
CREATE INDEX IF NOT EXISTS idx_pretium_orders_transaction_code ON pretium_orders(transaction_code);
CREATE INDEX IF NOT EXISTS idx_pretium_orders_wallet_address ON pretium_orders(wallet_address);
CREATE INDEX IF NOT EXISTS idx_pretium_orders_status ON pretium_orders(status);
CREATE INDEX IF NOT EXISTS idx_pretium_orders_user_id ON pretium_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pretium_orders_transaction_hash ON pretium_orders(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_pretium_orders_created_at ON pretium_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pretium_orders_fid ON pretium_orders(fid) WHERE fid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pretium_orders_receipt_number ON pretium_orders(receipt_number) WHERE receipt_number IS NOT NULL;

-- Enable RLS for pretium_orders
ALTER TABLE pretium_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for pretium_orders
CREATE POLICY "Service role has full access to pretium_orders" ON pretium_orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own pretium orders" ON pretium_orders
  FOR SELECT
  USING (wallet_address = current_setting('request.jwt.claim.wallet_address', true));

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pretium_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = (NOW() AT TIME ZONE 'Africa/Nairobi');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for pretium_orders
DROP TRIGGER IF EXISTS pretium_orders_updated_at_trigger ON pretium_orders;
CREATE TRIGGER pretium_orders_updated_at_trigger
  BEFORE UPDATE ON pretium_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_pretium_orders_updated_at();

-- Add table comment
COMMENT ON TABLE pretium_orders IS 'Pretium off-ramp orders for USDC to KES conversions via M-Pesa';

-- ============================================================================
-- MIGRATE EXISTING PRETIUM ORDERS FROM orders TABLE
-- ============================================================================

-- Insert all Pretium orders from orders table into pretium_orders
INSERT INTO pretium_orders (
  id,
  transaction_code,
  user_id,
  wallet_address,
  transaction_hash,
  status,
  pretium_status,
  amount_in_usdc,
  amount_in_local,
  local_currency,
  exchange_rate,
  sender_fee,
  payment_type,
  phone_number,
  till_number,
  paybill_number,
  paybill_account,
  account_name,
  receipt_number,
  public_name,
  error_message,
  settlement_address,
  fid,
  created_at,
  updated_at,
  completed_at
)
SELECT
  id,
  pretium_transaction_code,
  user_id,
  wallet_address,
  transaction_hash,
  status,
  paycrest_status, -- Map to pretium_status
  amount_in_usdc,
  amount_in_local,
  local_currency,
  rate, -- Map to exchange_rate
  sender_fee,
  -- Determine payment_type based on available fields
  CASE
    WHEN till_number IS NOT NULL AND till_number != '' THEN 'BUY_GOODS'
    WHEN paybill_number IS NOT NULL AND paybill_number != '' THEN 'PAYBILL'
    ELSE 'MOBILE'
  END as payment_type,
  NULLIF(phone_number, ''),
  NULLIF(till_number, ''),
  NULLIF(paybill_number, ''),
  NULLIF(paybill_account, ''),
  account_name,
  pretium_receipt_number,
  NULL, -- public_name not stored in old schema
  memo, -- Error messages were stored in memo field
  receive_address, -- Settlement address
  fid,
  created_at,
  updated_at,
  completed_at
FROM orders
WHERE payment_provider = 'PRETIUM_KES'
  AND pretium_transaction_code IS NOT NULL
ON CONFLICT (transaction_code) DO NOTHING; -- Skip if already migrated

-- ============================================================================
-- UPDATE orders TABLE TO BE PAYCREST-SPECIFIC
-- ============================================================================

-- Rename orders table to paycrest_orders for clarity
-- We do this in steps to maintain backward compatibility
-- First, create a view called 'orders' that will union both tables temporarily

-- Option 1: Just add comments and keep mixed table (safest for now)
COMMENT ON TABLE orders IS 'Mixed PayCrest and Pretium orders (legacy). New Pretium orders go to pretium_orders table.';

-- Option 2 (Alternative): If you want to completely separate, uncomment below
-- This is more aggressive and requires updating all application code first


-- Delete migrated Pretium orders from orders table
DELETE FROM orders
WHERE payment_provider = 'PRETIUM_KES'
  AND pretium_transaction_code IS NOT NULL
  AND pretium_transaction_code IN (SELECT transaction_code FROM pretium_orders);

-- Rename orders to paycrest_orders
ALTER TABLE orders RENAME TO paycrest_orders_new;

-- Create a union view called 'orders' for backward compatibility
CREATE OR REPLACE VIEW orders AS
SELECT
  id,
  paycrest_order_id,
  user_id,
  wallet_address,
  amount_in_usdc,
  amount_in_local,
  local_currency,
  phone_number,
  account_number,
  bank_code,
  bank_name,
  till_number,
  paybill_number,
  paybill_account,
  carrier,
  status,
  paycrest_status,
  transaction_hash,
  reference_id,
  rate,
  network,
  token,
  receive_address,
  valid_until,
  sender_fee,
  transaction_fee,
  total_amount,
  institution_code,
  recipient_data,
  account_name,
  memo,
  fid,
  'PAYCREST' as payment_provider_type,
  NULL as pretium_transaction_code,
  NULL as pretium_receipt_number,
  created_at,
  updated_at,
  completed_at
FROM paycrest_orders_new
WHERE payment_provider IN ('PAYCREST_KES', 'PAYCREST_NGN')

UNION ALL

SELECT
  id,
  transaction_code as paycrest_order_id, -- Map for compatibility
  user_id,
  wallet_address,
  amount_in_usdc,
  amount_in_local,
  local_currency,
  phone_number,
  NULL as account_number,
  NULL as bank_code,
  NULL as bank_name,
  till_number,
  paybill_number,
  paybill_account,
  mobile_network as carrier,
  status,
  pretium_status as paycrest_status,
  transaction_hash,
  transaction_code as reference_id,
  exchange_rate as rate,
  chain as network,
  'USDC' as token,
  settlement_address as receive_address,
  NULL as valid_until,
  sender_fee,
  0 as transaction_fee,
  amount_in_usdc as total_amount,
  NULL as institution_code,
  NULL as recipient_data,
  account_name,
  error_message as memo,
  fid,
  'PRETIUM' as payment_provider_type,
  transaction_code as pretium_transaction_code,
  receipt_number as pretium_receipt_number,
  created_at,
  updated_at,
  completed_at
FROM pretium_orders;


-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- View for all Pretium orders with status breakdown
CREATE OR REPLACE VIEW pretium_orders_analytics AS
SELECT
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_orders,
  SUM(amount_in_usdc) FILTER (WHERE status = 'completed') as total_usdc_volume,
  SUM(amount_in_local) FILTER (WHERE status = 'completed') as total_kes_volume,
  SUM(sender_fee) FILTER (WHERE status = 'completed') as total_fees_collected,
  AVG(exchange_rate) as avg_exchange_rate,
  COUNT(DISTINCT wallet_address) as unique_users,
  COUNT(*) FILTER (WHERE payment_type = 'MOBILE') as mobile_payments,
  COUNT(*) FILTER (WHERE payment_type = 'BUY_GOODS') as till_payments,
  COUNT(*) FILTER (WHERE payment_type = 'PAYBILL') as paybill_payments
FROM pretium_orders;

-- View for recent Pretium orders
CREATE OR REPLACE VIEW pretium_orders_recent AS
SELECT
  transaction_code,
  wallet_address,
  status,
  pretium_status,
  amount_in_usdc,
  amount_in_local,
  payment_type,
  COALESCE(phone_number, till_number, paybill_number) as payment_target,
  receipt_number,
  created_at,
  completed_at
FROM pretium_orders
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON VIEW pretium_orders_analytics IS 'Aggregated analytics for Pretium orders';
COMMENT ON VIEW pretium_orders_recent IS 'Most recent 100 Pretium orders for monitoring';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get order by transaction code (works for both Pretium and PayCrest)
CREATE OR REPLACE FUNCTION get_order_by_transaction_code(tx_code TEXT)
RETURNS TABLE (
  order_id UUID,
  provider TEXT,
  status TEXT,
  amount_usdc DECIMAL,
  amount_local DECIMAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Try Pretium first
  RETURN QUERY
  SELECT
    id as order_id,
    'PRETIUM' as provider,
    status,
    amount_in_usdc as amount_usdc,
    amount_in_local as amount_local,
    created_at
  FROM pretium_orders
  WHERE transaction_code = tx_code;

  IF NOT FOUND THEN
    -- Try PayCrest
    RETURN QUERY
    SELECT
      id as order_id,
      'PAYCREST' as provider,
      status,
      amount_in_usdc as amount_usdc,
      amount_in_local as amount_local,
      created_at
    FROM orders
    WHERE paycrest_order_id = tx_code OR pretium_transaction_code = tx_code;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_order_by_transaction_code IS 'Get order from either Pretium or PayCrest tables by transaction code';
