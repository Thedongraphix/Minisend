-- Set timezone to EAT (East Africa Time) to match existing schema
SET timezone = 'Africa/Nairobi';

-- Create user_notifications table for storing Farcaster notification tokens
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  fid INTEGER NOT NULL,
  app_fid INTEGER NOT NULL,
  notification_url TEXT NOT NULL,
  notification_token TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi'),
  last_notification_sent_at TIMESTAMP WITH TIME ZONE,
  miniapp_added_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(fid, app_fid)
);

-- Create index on fid for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_notifications_fid ON user_notifications(fid);

-- Create index on app_fid for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_notifications_app_fid ON user_notifications(app_fid);

-- Create composite index for fid + app_fid lookups
CREATE INDEX IF NOT EXISTS idx_user_notifications_fid_app_fid ON user_notifications(fid, app_fid);

-- Create index on enabled status for bulk operations
CREATE INDEX IF NOT EXISTS idx_user_notifications_enabled ON user_notifications(enabled);

-- Create notification_history table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  fid INTEGER NOT NULL,
  app_fid INTEGER NOT NULL,
  notification_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rate_limited', 'invalid_token')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Africa/Nairobi')
);

-- Create indexes for notification_history
CREATE INDEX IF NOT EXISTS idx_notification_history_fid ON notification_history(fid);
CREATE INDEX IF NOT EXISTS idx_notification_history_app_fid ON notification_history(app_fid);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_notification_id ON notification_history(notification_id);

-- Add RLS policies
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Allow service role full access to user_notifications
CREATE POLICY "Service role has full access to user_notifications" ON user_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow service role full access to notification_history
CREATE POLICY "Service role has full access to notification_history" ON notification_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = (NOW() AT TIME ZONE 'Africa/Nairobi');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS user_notifications_updated_at_trigger ON user_notifications;
CREATE TRIGGER user_notifications_updated_at_trigger
  BEFORE UPDATE ON user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_user_notifications_updated_at();

-- Add table comments
COMMENT ON TABLE user_notifications IS 'Stores Farcaster notification tokens for users who have enabled notifications';
COMMENT ON TABLE notification_history IS 'Audit log of all notifications sent through Farcaster';
