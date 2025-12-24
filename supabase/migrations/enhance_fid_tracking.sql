-- Enhanced FID Tracking Migration
-- This migration adds comprehensive indexes and analytics views for tracking
-- Farcaster users, their transactions, and notification preferences

SET timezone = 'Africa/Nairobi';

-- ============================================================================
-- PART 1: Add composite indexes for optimal query performance
-- ============================================================================

-- Index for querying orders by FID and status (common leaderboard query)
CREATE INDEX IF NOT EXISTS idx_orders_fid_status
ON orders(fid, status)
WHERE fid IS NOT NULL;

-- Index for querying orders by FID and currency (analytics query)
CREATE INDEX IF NOT EXISTS idx_orders_fid_currency
ON orders(fid, local_currency)
WHERE fid IS NOT NULL;

-- Index for querying orders by FID and created_at (user history query)
CREATE INDEX IF NOT EXISTS idx_orders_fid_created
ON orders(fid, created_at DESC)
WHERE fid IS NOT NULL;

-- Index for wallet_address on orders table (joining with farcaster_users)
CREATE INDEX IF NOT EXISTS idx_orders_wallet_address
ON orders(wallet_address);

-- Composite index for amount queries (for volume calculations)
CREATE INDEX IF NOT EXISTS idx_orders_amounts
ON orders(amount_in_usdc, amount_in_local, local_currency)
WHERE fid IS NOT NULL;

-- ============================================================================
-- PART 2: Create analytics views for common queries
-- ============================================================================

-- View: User transaction summary with FID
CREATE OR REPLACE VIEW farcaster_user_transaction_summary AS
SELECT
  fu.fid,
  fu.username,
  fu.display_name,
  fu.pfp_url,
  fu.wallet_address,
  fu.created_at as profile_created_at,
  COUNT(o.id) as total_transactions,
  COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_transactions,
  COUNT(CASE WHEN o.status = 'failed' THEN 1 END) as failed_transactions,
  COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_transactions,
  COALESCE(SUM(o.amount_in_usdc), 0) as total_usdc_volume,
  COALESCE(SUM(CASE WHEN o.local_currency = 'KES' THEN o.amount_in_local ELSE 0 END), 0) as total_kes_volume,
  COALESCE(SUM(CASE WHEN o.local_currency = 'NGN' THEN o.amount_in_local ELSE 0 END), 0) as total_ngn_volume,
  MAX(o.created_at) as last_transaction_at,
  MIN(o.created_at) as first_transaction_at
FROM farcaster_users fu
LEFT JOIN orders o ON o.fid = fu.fid
GROUP BY fu.fid, fu.username, fu.display_name, fu.pfp_url, fu.wallet_address, fu.created_at;

COMMENT ON VIEW farcaster_user_transaction_summary IS 'Complete transaction summary for each Farcaster user with volume and status breakdowns';

-- View: FID leaderboard (ready for API consumption)
CREATE OR REPLACE VIEW farcaster_leaderboard AS
SELECT
  fu.fid,
  fu.username,
  fu.display_name,
  fu.pfp_url,
  COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_count,
  COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.amount_in_usdc ELSE 0 END), 0) as total_completed_usdc,
  COALESCE(SUM(CASE WHEN o.status = 'completed' AND o.local_currency = 'KES' THEN o.amount_in_local ELSE 0 END), 0) as total_completed_kes,
  COALESCE(SUM(CASE WHEN o.status = 'completed' AND o.local_currency = 'NGN' THEN o.amount_in_local ELSE 0 END), 0) as total_completed_ngn,
  MAX(o.created_at) as last_completed_at
FROM farcaster_users fu
LEFT JOIN orders o ON o.fid = fu.fid
GROUP BY fu.fid, fu.username, fu.display_name, fu.pfp_url
ORDER BY total_completed_usdc DESC;

COMMENT ON VIEW farcaster_leaderboard IS 'Leaderboard of Farcaster users ranked by completed transaction volume';

-- View: Missing FID profiles (users who transacted but have no profile)
CREATE OR REPLACE VIEW missing_farcaster_profiles AS
SELECT DISTINCT
  o.fid,
  o.wallet_address,
  COUNT(o.id) as transaction_count,
  SUM(o.amount_in_usdc) as total_usdc_volume,
  MAX(o.created_at) as last_transaction_at,
  MIN(o.created_at) as first_transaction_at
FROM orders o
WHERE o.fid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM farcaster_users fu WHERE fu.fid = o.fid
  )
GROUP BY o.fid, o.wallet_address
ORDER BY total_usdc_volume DESC;

COMMENT ON VIEW missing_farcaster_profiles IS 'FIDs that have transactions but no profile data - candidates for backfill';

-- View: Daily FID activity metrics
CREATE OR REPLACE VIEW farcaster_daily_activity AS
SELECT
  DATE(o.created_at AT TIME ZONE 'Africa/Nairobi') as activity_date,
  COUNT(DISTINCT o.fid) as unique_users,
  COUNT(o.id) as total_transactions,
  COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_transactions,
  SUM(o.amount_in_usdc) as total_usdc_volume,
  AVG(o.amount_in_usdc) as avg_transaction_usdc,
  COUNT(DISTINCT CASE WHEN o.local_currency = 'KES' THEN o.fid END) as kes_users,
  COUNT(DISTINCT CASE WHEN o.local_currency = 'NGN' THEN o.fid END) as ngn_users
FROM orders o
WHERE o.fid IS NOT NULL
GROUP BY DATE(o.created_at AT TIME ZONE 'Africa/Nairobi')
ORDER BY activity_date DESC;

COMMENT ON VIEW farcaster_daily_activity IS 'Daily activity metrics for Farcaster users including unique users and transaction volumes';

-- View: User retention metrics
CREATE OR REPLACE VIEW farcaster_user_retention AS
WITH user_first_tx AS (
  SELECT
    fid,
    MIN(DATE(created_at AT TIME ZONE 'Africa/Nairobi')) as first_tx_date,
    MAX(DATE(created_at AT TIME ZONE 'Africa/Nairobi')) as last_tx_date
  FROM orders
  WHERE fid IS NOT NULL AND status = 'completed'
  GROUP BY fid
),
cohorts AS (
  SELECT
    first_tx_date as cohort_date,
    DATE_PART('day', last_tx_date - first_tx_date) as days_since_first,
    COUNT(DISTINCT fid) as user_count
  FROM user_first_tx
  GROUP BY cohort_date, days_since_first
)
SELECT
  cohort_date,
  SUM(CASE WHEN days_since_first = 0 THEN user_count ELSE 0 END) as day_0_users,
  SUM(CASE WHEN days_since_first >= 1 THEN user_count ELSE 0 END) as day_1_plus_users,
  SUM(CASE WHEN days_since_first >= 7 THEN user_count ELSE 0 END) as day_7_plus_users,
  SUM(CASE WHEN days_since_first >= 30 THEN user_count ELSE 0 END) as day_30_plus_users
FROM cohorts
GROUP BY cohort_date
ORDER BY cohort_date DESC;

COMMENT ON VIEW farcaster_user_retention IS 'Cohort-based retention metrics showing user return rates';

-- ============================================================================
-- PART 3: Add helpful database functions
-- ============================================================================

-- Function: Get or create Farcaster user profile
CREATE OR REPLACE FUNCTION upsert_farcaster_user(
  p_wallet_address TEXT,
  p_fid INTEGER,
  p_username TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL,
  p_pfp_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO farcaster_users (
    wallet_address,
    fid,
    username,
    display_name,
    pfp_url
  )
  VALUES (
    p_wallet_address,
    p_fid,
    p_username,
    p_display_name,
    p_pfp_url
  )
  ON CONFLICT (wallet_address)
  DO UPDATE SET
    fid = COALESCE(EXCLUDED.fid, farcaster_users.fid),
    username = COALESCE(EXCLUDED.username, farcaster_users.username),
    display_name = COALESCE(EXCLUDED.display_name, farcaster_users.display_name),
    pfp_url = COALESCE(EXCLUDED.pfp_url, farcaster_users.pfp_url),
    updated_at = (NOW() AT TIME ZONE 'Africa/Nairobi')
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION upsert_farcaster_user IS 'Inserts or updates a Farcaster user profile, preserving existing data when new data is NULL';

-- Function: Get user statistics by FID
CREATE OR REPLACE FUNCTION get_farcaster_user_stats(p_fid INTEGER)
RETURNS TABLE (
  fid INTEGER,
  username TEXT,
  total_transactions BIGINT,
  completed_transactions BIGINT,
  total_usdc_volume NUMERIC,
  total_kes_volume NUMERIC,
  total_ngn_volume NUMERIC,
  preferred_currency TEXT,
  last_transaction TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fu.fid,
    fu.username,
    COUNT(o.id) as total_transactions,
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_transactions,
    COALESCE(SUM(o.amount_in_usdc), 0) as total_usdc_volume,
    COALESCE(SUM(CASE WHEN o.local_currency = 'KES' THEN o.amount_in_local ELSE 0 END), 0) as total_kes_volume,
    COALESCE(SUM(CASE WHEN o.local_currency = 'NGN' THEN o.amount_in_local ELSE 0 END), 0) as total_ngn_volume,
    (
      SELECT o2.local_currency
      FROM orders o2
      WHERE o2.fid = p_fid
      GROUP BY o2.local_currency
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as preferred_currency,
    MAX(o.created_at) as last_transaction
  FROM farcaster_users fu
  LEFT JOIN orders o ON o.fid = fu.fid
  WHERE fu.fid = p_fid
  GROUP BY fu.fid, fu.username;
END;
$$;

COMMENT ON FUNCTION get_farcaster_user_stats IS 'Get comprehensive statistics for a specific Farcaster user';

-- ============================================================================
-- PART 4: Grant permissions for views (RLS)
-- ============================================================================

-- Enable RLS on views (read-only access for all authenticated users)
-- Note: Views inherit permissions from underlying tables, but we explicitly grant SELECT

-- Grant public read access to analytics views
GRANT SELECT ON farcaster_user_transaction_summary TO anon, authenticated;
GRANT SELECT ON farcaster_leaderboard TO anon, authenticated;
GRANT SELECT ON farcaster_daily_activity TO anon, authenticated;
GRANT SELECT ON missing_farcaster_profiles TO anon, authenticated;
GRANT SELECT ON farcaster_user_retention TO anon, authenticated;

-- ============================================================================
-- PART 5: Add helpful comments and metadata
-- ============================================================================

COMMENT ON INDEX idx_orders_fid_status IS 'Optimizes queries filtering by FID and order status (leaderboard queries)';
COMMENT ON INDEX idx_orders_fid_currency IS 'Optimizes queries filtering by FID and currency (analytics queries)';
COMMENT ON INDEX idx_orders_fid_created IS 'Optimizes queries sorting by FID and creation time (user history)';
COMMENT ON INDEX idx_orders_wallet_address IS 'Optimizes joins between orders and farcaster_users tables';
COMMENT ON INDEX idx_orders_amounts IS 'Optimizes volume calculation queries';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Enhanced FID tracking migration completed successfully';
  RAISE NOTICE 'Added 5 indexes, 5 views, and 2 helper functions';
END $$;
