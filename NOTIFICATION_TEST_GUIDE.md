# Notification Testing Guide

## ✅ What's Been Fixed

### 1. Save Frame Button Fixed
**Issue:** Button was using `useAddFrame` from OnchainKit which doesn't return notification details.

**Solution:** Updated to use `sdk.actions.addMiniApp()` from `@farcaster/miniapp-sdk` which properly handles the notification enrollment flow.

**Location:** `app/page.tsx`

### 2. Notification Prompt Added
**Feature:** New notification enrollment component added to Home screen.

**Location:** `app/components/NotificationPrompt.tsx` (integrated into Home component)

### 3. Webhook Handler Ready
**Status:** Fully configured with proper signature verification using `@farcaster/miniapp-node`.

**Handles:**
- `miniapp_added` → Saves notification token & sends welcome notification
- `notifications_enabled` → Updates token & sends confirmation
- `notifications_disabled` → Disables notifications
- `miniapp_removed` → Removes all notification data

**Location:** `app/api/webhooks/route.ts`

---

## 🧪 How to Test Notifications

### Step 1: Deploy Your App
Your app must be deployed and accessible via HTTPS for the webhook to work.

```bash
# If using Vercel
vercel --prod

# Or push to your Git repository if auto-deployment is set up
git add .
git commit -m "feat(notifications): implement Farcaster notification system"
git push
```

### Step 2: Verify Environment Variables
Make sure these are set in your deployment platform (Vercel/Netlify):

```bash
NEYNAR_API_KEY=E3DC4D1A-753B-49A6-9E8F-051303763921
FARCASTER_HEADER=eyJmaWQiOjg4NzAzOCwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDBDRjY3MjRFZWFiNzZGMjU4MDJGMDJBNEQ2NUNBMjBENjkzNTJBODQifQ
FARCASTER_PAYLOAD=eyJkb21haW4iOiJtaW5pc2VuZC54eXoifQ
FARCASTER_SIGNATURE=7J0IFYPbwL6EozTx3901xrjfqodfu/LGat4mz8ZH3JETxhWmWq+4UzfLgzSwFBqAJONDdS4ev3xHHBV1Dp4Olhw=
NEXT_PUBLIC_URL=https://minisend.xyz
```

### Step 3: Test Webhook Endpoint
```bash
# Health check
curl https://minisend.xyz/api/webhooks

# Should return:
# {"status":"healthy","service":"Minisend Webhook Handler","timestamp":"..."}
```

### Step 4: Test in Farcaster/Base App
1. Open your Mini App in Farcaster or Base app
2. You should see the "Save Frame" button in the top right
3. Click "Save Frame" button
4. You should see a prompt to enable notifications
5. Accept the prompt

**Expected Result:**
- Button changes to "Saved" with checkmark
- You receive a welcome notification: "🎉 Welcome to Minisend!"
- Your notification token is saved to the database

### Step 5: Verify Database
Check your Supabase dashboard:

```sql
-- Check if notification token was saved
SELECT * FROM user_notifications
WHERE enabled = true
ORDER BY created_at DESC
LIMIT 5;

-- Check notification history
SELECT * FROM notification_history
ORDER BY sent_at DESC
LIMIT 5;
```

You should see:
- **user_notifications:** Your user's FID, app_fid (309857 for Base), notification_url, and notification_token
- **notification_history:** The welcome notification with status 'success'

### Step 6: Test Notification Prompt
1. After the app loads, you should see a blue notification prompt card on the home screen
2. Click "Enable Notifications" button
3. Should trigger the same `sdk.actions.addMiniApp()` flow

---

## 🔍 Debugging Tips

### If "Save Frame" button shows error:

1. **Check browser console** for error messages
2. **Verify you're in Farcaster/Base app context:**
   ```javascript
   // The app needs to be opened within Farcaster/Base app
   // Won't work in regular browser
   ```

### If webhook doesn't receive events:

1. **Check webhook URL in manifest:**
   ```bash
   curl https://minisend.xyz/.well-known/farcaster.json
   ```
   Should show: `"webhookUrl": "https://minisend.xyz/api/webhooks"`

2. **Check Vercel/deployment logs** for incoming webhook requests

3. **Verify signature verification:**
   - The webhook uses `verifyAppKeyWithNeynar` which requires `NEYNAR_API_KEY`
   - Check deployment logs for authentication errors

### If notification doesn't arrive:

1. **Check notification_history table** for the entry
2. **Look for status:**
   - `success` = Notification sent successfully
   - `rate_limited` = Too many notifications sent
   - `invalid_token` = Token was revoked
   - `failed` = Network/API error

3. **Common issues:**
   - User disabled notifications after adding app
   - Notification token expired
   - Rate limit exceeded (check `error_message` column)

---

## 📤 Sending Test Notifications

### From API Route
Create a test API endpoint to send notifications:

```typescript
// app/api/test-notification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getNotificationService } from '@/lib/services/notification-service';

export async function POST(request: NextRequest) {
  const { fid, appFid } = await request.json();

  const notificationService = getNotificationService();

  const result = await notificationService.sendNotification(
    fid,
    appFid || 309857, // Base app FID
    {
      title: '✅ Test Notification',
      body: 'This is a test notification from Minisend!',
      targetUrl: 'https://minisend.xyz'
    }
  );

  return NextResponse.json(result);
}
```

Test it:
```bash
curl -X POST https://minisend.xyz/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{"fid": YOUR_FID, "appFid": 309857}'
```

### From Transaction Complete Handler
Integrate into your payment flow:

```typescript
// After successful payment
import { getNotificationService } from '@/lib/services/notification-service';

const notificationService = getNotificationService();

await notificationService.sendNotification(
  userFid, // Get from Farcaster context
  309857,  // Base app FID
  {
    title: '✅ Payment Complete',
    body: `${amount} ${currency} delivered successfully!`,
    targetUrl: `https://minisend.xyz?receipt=${orderId}`
  }
);
```

---

## 📊 Monitor Notifications

### Check Notification Stats
```sql
-- Success rate
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM notification_history
GROUP BY status;

-- Recent notifications
SELECT
  fid,
  title,
  status,
  sent_at,
  error_message
FROM notification_history
ORDER BY sent_at DESC
LIMIT 10;

-- Failed notifications
SELECT * FROM notification_history
WHERE status != 'success'
ORDER BY sent_at DESC;
```

---

## ✨ Next Steps

1. **Test the flow end-to-end** in production
2. **Monitor webhook logs** for incoming events
3. **Send test notifications** to verify delivery
4. **Integrate notifications into payment flow**
5. **Set up analytics** to track notification engagement

---

## 🎉 Summary

Your Farcaster notification system is fully configured with:
- ✅ Proper SDK implementation (`sdk.actions.addMiniApp()`)
- ✅ Webhook handler with signature verification
- ✅ Database tables for token storage
- ✅ Notification service for sending notifications
- ✅ UI components for user enrollment
- ✅ Welcome notifications
- ✅ Complete error handling

**Time to test!** 🚀
