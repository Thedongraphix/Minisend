-- Notification tokens storage for Farcaster Mini App users
-- This table stores notification details for users who have enabled notifications

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid INTEGER NOT NULL UNIQUE, -- Farcaster ID
  notification_url TEXT NOT NULL, -- URL to send notifications to
  notification_token TEXT NOT NULL, -- Secret token for authentication
  enabled BOOLEAN DEFAULT TRUE, -- Whether notifications are currently enabled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_notification_sent_at TIMESTAMP WITH TIME ZONE,
  miniapp_added_at TIMESTAMP WITH TIME ZONE, -- When user added the miniapp

  -- Indexes for performance
  CONSTRAINT user_notifications_fid_key UNIQUE (fid)
);

-- Index for quick lookups by FID
CREATE INDEX IF NOT EXISTS idx_user_notifications_fid ON user_notifications(fid);

-- Index for finding enabled notification users
CREATE INDEX IF NOT EXISTS idx_user_notifications_enabled ON user_notifications(enabled) WHERE enabled = TRUE;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_notifications_timestamp
  BEFORE UPDATE ON user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_user_notifications_updated_at();

-- Notification history table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid INTEGER NOT NULL, -- Farcaster ID
  notification_id TEXT NOT NULL, -- UUID for the notification
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_url TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed', 'rate_limited'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Foreign key to user_notifications
  FOREIGN KEY (fid) REFERENCES user_notifications(fid) ON DELETE CASCADE
);

-- Index for querying notification history by FID
CREATE INDEX IF NOT EXISTS idx_notification_history_fid ON notification_history(fid);

-- Index for querying by sent date
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at DESC);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);

-- Comments for documentation
COMMENT ON TABLE user_notifications IS 'Stores notification tokens for Farcaster Mini App users';
COMMENT ON COLUMN user_notifications.fid IS 'Farcaster user ID';
COMMENT ON COLUMN user_notifications.notification_url IS 'API endpoint for sending notifications';
COMMENT ON COLUMN user_notifications.notification_token IS 'Authentication token for notifications';
COMMENT ON COLUMN user_notifications.enabled IS 'Whether notifications are currently active';

COMMENT ON TABLE notification_history IS 'Audit log of all sent notifications';
COMMENT ON COLUMN notification_history.status IS 'success, failed, or rate_limited';
