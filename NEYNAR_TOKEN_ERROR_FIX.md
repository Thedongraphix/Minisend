# Fix: "No valid tokens provided" Error

## 🎯 The Core Issue

You're getting `HTTP 400: {"code":"InvalidInput","message":"No valid tokens provided","property":"tokens"}` because:

**You created database tables for self-managed notifications, but you're using Neynar-managed notifications.**

These are two completely different systems!

## 📋 Understanding the Two Approaches

### Self-Managed (What your DB tables are for)
```
User enables → Webhook to YOUR server → YOU store token → YOU send notifications
```
- Requires: `user_notifications` table
- Requires: Your webhook endpoint at `/api/webhooks`
- Webhook URL: `https://minisend.xyz/api/webhooks`

### Neynar-Managed (What you're actually using)
```
User enables → Webhook to NEYNAR → NEYNAR stores token → YOU send via Neynar API
```
- ❌ No database tables needed
- ❌ Your webhook never called
- ✅ Just send FID to Neynar
- Webhook URL: `https://api.neynar.com/f/app/6169a7fa-658f-4d01-b6a5-ec7fb4bd802e/event`

## 🔍 Debug Commands

### 1. Check Your Database (Will be Empty)

```bash
# Connect to your Supabase database
psql $DATABASE_URL

# Or use the SQL file:
psql $DATABASE_URL -f scripts/debug-notifications.sql
```

**Expected Result:** `user_notifications` table will be **EMPTY** because Neynar stores tokens, not you.

### 2. Check Orders with FIDs

```sql
-- See which orders have FIDs for notifications
SELECT
  id,
  paycrest_order_id,
  fid,
  status,
  created_at
FROM orders
WHERE fid IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

**If all FIDs are NULL:** Users are accessing from web, not Farcaster.

### 3. Check Neynar Configuration

```bash
# Run the diagnostic script
./scripts/check-neynar-status.sh
```

This checks:
- ✅ API key exists
- ✅ Manifest webhook points to Neynar
- ✅ Neynar API is accessible

## ✅ How to Fix

### Step 1: Verify Neynar App Exists

1. **Go to:** https://dev.neynar.com/
2. **Login** with your Farcaster account
3. **Check:** Do you see an app with webhook URL matching your manifest?
   ```
   https://api.neynar.com/f/app/6169a7fa-658f-4d01-b6a5-ec7fb4bd802e/event
   ```

**If NO app exists:**
- This is your problem!
- Create the app in Neynar dev portal
- Use the webhook URL Neynar provides
- Update your manifest with correct URL

**If app exists:**
- Check the "Subscribers" or "Users" count
- If it's 0, no one has enabled notifications yet

### Step 2: Test with YOUR FID

1. **Get your FID:**
   - Go to warpcast.com/~/settings
   - Or check your Farcaster profile URL

2. **Open Minisend in Farcaster:**
   - Open Warpcast app
   - Navigate to Minisend
   - Find the "Enable Notifications" button
   - Click it and confirm

3. **Wait 2-3 seconds** for webhook to process

4. **Test notification:**
   ```bash
   npm run test-notification YOUR_FID
   ```

### Step 3: Check Neynar Dev Portal

After enabling notifications:
1. Go to https://dev.neynar.com/
2. Open your app
3. Check "Mini App" tab
4. You should see:
   - 1 subscriber (you)
   - Ability to send broadcast notification

### Step 4: Test Transaction Notifications

1. Create a test order in Minisend (from Farcaster)
2. Complete the transaction
3. When order reaches "validated" status
4. You should receive notification

Check logs:
```bash
# In your production logs, look for:
grep "🔔 Attempting to send" logs
grep "✅ Notification sent successfully" logs
```

## 🐛 Common Issues

### Issue: "No valid tokens provided"

**Cause:** No one has enabled notifications yet

**Solution:**
1. You (developer) must be the first to enable
2. Open app in Farcaster, click "Enable Notifications"
3. Confirm in Farcaster client
4. Test with `npm run test-notification YOUR_FID`

### Issue: Database tables are empty

**This is NORMAL** for Neynar-managed approach!

Your `user_notifications` table should be empty because:
- Neynar stores tokens, not you
- Your webhook endpoint is not being called
- You only need FID to send notifications

### Issue: Orders don't have FIDs

**Cause:** Users accessing from web, not Farcaster

**Check:**
```sql
SELECT
  COUNT(*) as total,
  COUNT(fid) as with_fid
FROM orders;
```

**Solution:** Ensure you're testing from Farcaster app, not web browser

### Issue: Notification works in dev portal but not in code

**Cause:** API key mismatch or incorrect FID

**Debug:**
```bash
# Check your API key
grep NEYNAR_API_KEY .env

# Verify it matches Neynar dev portal
```

## 🎬 Quick Test Procedure

```bash
# 1. Check configuration
./scripts/check-neynar-status.sh

# 2. Enable notifications (in Farcaster app)
# - Open Minisend in Warpcast
# - Click "Enable Notifications"
# - Confirm permission

# 3. Test immediately
npm run test-notification YOUR_FID

# Expected: ✅ Notification sent successfully
```

## 📊 Monitoring

### Check Neynar Analytics
1. https://dev.neynar.com/
2. Your app → Mini App tab
3. View:
   - Total subscribers
   - Notifications sent
   - Delivery rates
   - Open rates

### Check Your Logs
```bash
# Notification attempts
grep "🔔" logs

# Successes
grep "✅ Notification sent" logs

# Failures
grep "❌ Failed to send" logs
```

## 🔑 Key Takeaway

**With Neynar-managed notifications:**
- ❌ Don't expect data in `user_notifications` table
- ❌ Your webhook endpoint won't be called
- ✅ Just send FID to Neynar API
- ✅ Neynar handles all token storage and management

**The error "No valid tokens provided" means:**
→ No users have enabled notifications through Neynar yet
→ You must be the first to enable and test

**Next step:** Enable notifications in Farcaster app, then test with your FID!
