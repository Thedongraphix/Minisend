-- Minisend Multi-Platform Authentication Schema
-- This schema handles user authentication across Farcaster, Base App, and Web platforms

-- Users table to store authentication data and wallet mappings
CREATE TABLE IF NOT EXISTS minisend_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification (different per platform)
  user_id TEXT NOT NULL, -- FID for Farcaster, address for Base App, Privy ID for web
  platform TEXT NOT NULL CHECK (platform IN ('farcaster', 'baseapp', 'web')),

  -- Wallet information
  connected_wallet TEXT, -- The wallet they used to authenticate
  minisend_wallet TEXT, -- BlockRadar-assigned wallet address
  blockradar_address_id TEXT, -- BlockRadar address ID for reference

  -- Metadata
  email TEXT, -- Only for web users who use email login
  display_name TEXT,
  avatar_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one entry per user_id + platform combination
  UNIQUE(user_id, platform)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_minisend_users_wallet ON minisend_users(connected_wallet);
CREATE INDEX IF NOT EXISTS idx_minisend_users_minisend_wallet ON minisend_users(minisend_wallet);
CREATE INDEX IF NOT EXISTS idx_minisend_users_platform ON minisend_users(platform);

-- Authentication sessions table (optional, for tracking active sessions)
CREATE TABLE IF NOT EXISTS minisend_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES minisend_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,

  -- Session metadata
  user_agent TEXT,
  ip_address TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON minisend_auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON minisend_auth_sessions(session_token);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_minisend_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_minisend_users_updated_at
  BEFORE UPDATE ON minisend_users
  FOR EACH ROW
  EXECUTE FUNCTION update_minisend_users_updated_at();

-- View for analytics: user counts by platform
CREATE OR REPLACE VIEW minisend_user_stats AS
SELECT
  platform,
  COUNT(*) as total_users,
  COUNT(CASE WHEN minisend_wallet IS NOT NULL THEN 1 END) as users_with_wallet,
  COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_last_7_days,
  COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_last_30_days
FROM minisend_users
GROUP BY platform;

COMMENT ON TABLE minisend_users IS 'Stores user authentication data across Farcaster miniapp, Base App, and Web platforms';
COMMENT ON COLUMN minisend_users.user_id IS 'Platform-specific user identifier: FID (Farcaster), wallet address (Base App), or Privy ID (Web)';
COMMENT ON COLUMN minisend_users.minisend_wallet IS 'BlockRadar-assigned dedicated wallet address for deposits';
COMMENT ON VIEW minisend_user_stats IS 'Analytics view showing user counts and activity by platform';
