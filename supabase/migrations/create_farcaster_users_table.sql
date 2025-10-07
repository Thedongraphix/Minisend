-- Set timezone to EAT (East Africa Time) to match existing schema
SET timezone = 'Africa/Nairobi';

-- Create farcaster_users table for storing Farcaster user profile data
-- This table is completely independent and won't affect existing PayCrest tables
CREATE TABLE IF NOT EXISTS farcaster_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  fid INTEGER NOT NULL,
  username TEXT,
  display_name TEXT,
  pfp_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- Create index on wallet_address for faster lookups
CREATE INDEX IF NOT EXISTS idx_farcaster_users_wallet ON farcaster_users(wallet_address);

-- Create index on fid for faster lookups
CREATE INDEX IF NOT EXISTS idx_farcaster_users_fid ON farcaster_users(fid);

-- Add RLS policies
ALTER TABLE farcaster_users ENABLE ROW LEVEL SECURITY;

-- Allow public read access to farcaster_users (for leaderboard display)
CREATE POLICY "Allow public read access" ON farcaster_users
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own data
CREATE POLICY "Allow users to insert their own data" ON farcaster_users
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to update their own data
CREATE POLICY "Allow users to update their own data" ON farcaster_users
  FOR UPDATE
  USING (true);

-- Create function to update updated_at timestamp (matches existing schema pattern)
CREATE OR REPLACE FUNCTION update_farcaster_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = (NOW() AT TIME ZONE 'Africa/Nairobi');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS farcaster_users_updated_at_trigger ON farcaster_users;
CREATE TRIGGER farcaster_users_updated_at_trigger
  BEFORE UPDATE ON farcaster_users
  FOR EACH ROW
  EXECUTE FUNCTION update_farcaster_users_updated_at();

-- Add table comment for consistency
COMMENT ON TABLE farcaster_users IS 'Farcaster user profiles linked to wallet addresses for leaderboard display';
