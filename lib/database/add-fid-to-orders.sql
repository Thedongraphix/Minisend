-- Add FID (Farcaster ID) column to orders table for notification support
-- This allows us to send notifications to users about their transactions

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS fid INTEGER;

-- Create index for efficient FID lookups
CREATE INDEX IF NOT EXISTS idx_orders_fid ON orders(fid);

-- Comment for documentation
COMMENT ON COLUMN orders.fid IS 'Farcaster user ID for sending transaction notifications';
