-- Add client tracking to orders table
-- This tracks which client (Base app, Warpcast, etc.) the user is using

SET timezone = 'Africa/Nairobi';

-- Add client tracking columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS client_fid INTEGER,
ADD COLUMN IF NOT EXISTS platform_type TEXT,
ADD COLUMN IF NOT EXISTS location_type TEXT;

-- Add comments
COMMENT ON COLUMN orders.client_fid IS 'FID of the client app (9152 for Farcaster, check Base app FID)';
COMMENT ON COLUMN orders.platform_type IS 'web or mobile - from context.client.platformType';
COMMENT ON COLUMN orders.location_type IS 'Where user opened the app: launcher, cast_embed, notification, channel, etc.';

-- Create index for client tracking queries
CREATE INDEX IF NOT EXISTS idx_orders_client_tracking
ON orders(client_fid, platform_type)
WHERE client_fid IS NOT NULL;

-- Create a simple view that shows everything you want to track
CREATE OR REPLACE VIEW user_transaction_tracking AS
SELECT
  o.id,
  o.paycrest_order_id,
  -- User info
  o.fid as user_fid,
  fu.username as farcaster_username,
  fu.display_name as farcaster_display_name,
  o.wallet_address,
  -- Transaction amounts
  o.amount_in_usdc,
  o.amount_in_local,
  o.local_currency,
  -- Timestamps
  o.created_at,
  o.updated_at,
  o.completed_at,
  -- Status
  o.status,
  -- Client tracking
  o.client_fid,
  CASE
    WHEN o.client_fid = 9152 THEN 'Warpcast'
    WHEN o.client_fid IS NOT NULL THEN 'Base App or Other'
    ELSE 'Web (no client)'
  END as client_name,
  o.platform_type,
  o.location_type,
  -- Payment details
  o.phone_number,
  o.account_number,
  o.carrier
FROM orders o
LEFT JOIN farcaster_users fu ON fu.fid = o.fid
ORDER BY o.created_at DESC;

COMMENT ON VIEW user_transaction_tracking IS 'Complete view of user transactions with FID, username, amounts, timestamps, and client info';

-- Grant read access
GRANT SELECT ON user_transaction_tracking TO anon, authenticated;

-- Create helper function to get transactions by FID
CREATE OR REPLACE FUNCTION get_transactions_by_fid(p_fid INTEGER)
RETURNS TABLE (
  transaction_id UUID,
  farcaster_username TEXT,
  amount_usdc NUMERIC,
  amount_local NUMERIC,
  currency TEXT,
  transaction_time TIMESTAMP WITH TIME ZONE,
  status TEXT,
  client_name TEXT,
  platform TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as transaction_id,
    fu.username as farcaster_username,
    o.amount_in_usdc as amount_usdc,
    o.amount_in_local as amount_local,
    o.local_currency as currency,
    o.created_at as transaction_time,
    o.status,
    CASE
      WHEN o.client_fid = 9152 THEN 'Warpcast'
      WHEN o.client_fid IS NOT NULL THEN 'Base App or Other'
      ELSE 'Web'
    END as client_name,
    o.platform_type as platform
  FROM orders o
  LEFT JOIN farcaster_users fu ON fu.fid = o.fid
  WHERE o.fid = p_fid
  ORDER BY o.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_transactions_by_fid IS 'Get all transactions for a specific FID with readable client names';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Client tracking migration completed successfully';
  RAISE NOTICE 'Added client_fid, platform_type, location_type to orders table';
  RAISE NOTICE 'Created user_transaction_tracking view';
END $$;
