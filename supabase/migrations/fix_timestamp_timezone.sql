-- ============================================================================
-- MIGRATION: Fix Timestamp Timezone Issues
-- ============================================================================
-- This migration fixes the incorrect timezone storage in pretium_orders table
-- where timestamps were being stored as EAT time labeled as UTC, causing
-- a +3 hour display offset.
--
-- Changes:
-- 1. Update column defaults to use proper UTC timestamps
-- 2. Fix the trigger function to use UTC
-- 3. Convert existing data from incorrectly stored EAT to proper UTC
-- ============================================================================

-- Step 1: Fix existing data by converting from incorrect EAT storage to proper UTC
-- Current state: Database has EAT time stored as UTC (e.g., 11:52 EAT stored as 11:52 UTC)
-- Target state: Database has proper UTC time (e.g., 11:52 EAT → 08:52 UTC)
UPDATE pretium_orders
SET
  created_at = created_at - INTERVAL '3 hours',
  updated_at = updated_at - INTERVAL '3 hours',
  completed_at = CASE
    WHEN completed_at IS NOT NULL THEN completed_at - INTERVAL '3 hours'
    ELSE NULL
  END
WHERE created_at IS NOT NULL;

-- Step 2: Update column defaults to use proper UTC timestamps (NOW() returns UTC)
ALTER TABLE pretium_orders
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Step 3: Update the trigger function to use proper UTC timestamps
CREATE OR REPLACE FUNCTION update_pretium_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();  -- Use UTC time, not EAT
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Add comment documenting the fix
COMMENT ON COLUMN pretium_orders.created_at IS 'Transaction creation timestamp in UTC (converted from EAT on 2025-01-19)';
COMMENT ON COLUMN pretium_orders.updated_at IS 'Last update timestamp in UTC (converted from EAT on 2025-01-19)';
COMMENT ON COLUMN pretium_orders.completed_at IS 'Transaction completion timestamp in UTC (converted from EAT on 2025-01-19)';

-- Verification query (uncomment to check results):
-- SELECT
--   transaction_code,
--   created_at AT TIME ZONE 'UTC' as utc_time,
--   created_at AT TIME ZONE 'Africa/Nairobi' as eat_time,
--   created_at AT TIME ZONE 'Africa/Lagos' as wat_time
-- FROM pretium_orders
-- ORDER BY created_at DESC
-- LIMIT 10;
