-- Deposit Events Tracking
-- Tracks deposits to user wallets so we can match swap/settlement events
-- back to the original depositor for email notifications.

CREATE TABLE IF NOT EXISTS deposit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Blockradar transaction reference
  blockradar_tx_id TEXT NOT NULL UNIQUE,

  -- User info (denormalized for fast lookup during swap matching)
  user_id TEXT,
  email TEXT,
  minisend_wallet TEXT NOT NULL,

  -- Deposit details
  amount TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  blockchain_slug TEXT NOT NULL,
  blockchain_name TEXT NOT NULL,
  tx_hash TEXT,

  -- Settlement tracking
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'settled')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for matching swap events to unsettled deposits
CREATE INDEX IF NOT EXISTS idx_deposit_events_status ON deposit_events(status);
CREATE INDEX IF NOT EXISTS idx_deposit_events_wallet ON deposit_events(minisend_wallet);
CREATE INDEX IF NOT EXISTS idx_deposit_events_amount ON deposit_events(amount, status);

COMMENT ON TABLE deposit_events IS 'Tracks user deposits for matching swap/settlement webhook events to users';
COMMENT ON COLUMN deposit_events.status IS 'received = awaiting settlement, settled = USDC on Base confirmed';
