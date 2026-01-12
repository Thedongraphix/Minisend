-- Migration: Add auto_settlement_rule_id to minisend_users table
-- This column stores the BlockRadar auto-settlement rule ID for each user's deposit address
-- Purpose: Track and manage automatic USDC sweeping from user deposits to master wallet

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'minisend_users'
    AND column_name = 'auto_settlement_rule_id'
  ) THEN
    ALTER TABLE minisend_users
    ADD COLUMN auto_settlement_rule_id TEXT;

    RAISE NOTICE 'Column auto_settlement_rule_id added successfully';
  ELSE
    RAISE NOTICE 'Column auto_settlement_rule_id already exists';
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_minisend_users_auto_settlement_rule
ON minisend_users(auto_settlement_rule_id);

-- Add comment explaining the column's purpose
COMMENT ON COLUMN minisend_users.auto_settlement_rule_id IS
'BlockRadar auto-settlement rule ID that automatically sweeps USDC deposits from this user''s child address to the master wallet';

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE 'Auto-settlement rule tracking is now enabled for all users';
END $$;
