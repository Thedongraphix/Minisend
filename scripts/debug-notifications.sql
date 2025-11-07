-- ============================================
-- NOTIFICATION DEBUGGING QUERIES
-- ============================================

-- 1. Check if user_notifications table has any data
-- (Should be EMPTY for Neynar-managed notifications)
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN enabled = true THEN 1 END) as enabled_users
FROM user_notifications;

-- 2. List all notification tokens (if any)
SELECT
  fid,
  app_fid,
  enabled,
  created_at,
  last_notification_sent_at
FROM user_notifications
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check notification history
SELECT
  COUNT(*) as total_notifications,
  status,
  COUNT(*) as count
FROM notification_history
GROUP BY status;

-- 4. Recent notification attempts
SELECT
  fid,
  title,
  body,
  status,
  error_message,
  sent_at
FROM notification_history
ORDER BY sent_at DESC
LIMIT 20;

-- 5. Check which orders have FIDs (for notification sending)
SELECT
  COUNT(*) as total_orders,
  COUNT(fid) as orders_with_fid,
  COUNT(CASE WHEN fid IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as percentage_with_fid
FROM orders;

-- 6. Recent orders with FID
SELECT
  id,
  paycrest_order_id,
  fid,
  status,
  local_currency,
  amount_in_local,
  created_at
FROM orders
WHERE fid IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 7. Orders without FID (web users)
SELECT
  COUNT(*) as web_orders
FROM orders
WHERE fid IS NULL;

-- 8. Check if anyone has enabled notifications recently
SELECT
  fid,
  notification_url,
  enabled,
  miniapp_added_at,
  created_at
FROM user_notifications
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
