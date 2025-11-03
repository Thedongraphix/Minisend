# Minisend Farcaster Notifications Setup

## ✅ Setup Complete!

Your Minisend app is now fully configured to send Farcaster notifications to users. Here's what has been set up:

---

## 📦 What Was Installed

### 1. **NPM Packages**
- `@farcaster/miniapp-node` - For webhook signature verification
- `@neynar/nodejs-sdk` - Neynar API integration (installed but not currently used)

### 2. **Environment Variables**
Added to `.env`:
```bash
NEYNAR_API_KEY=E3DC4D1A-753B-49A6-9E8F-051303763921
```

### 3. **Database Tables**
Created in Supabase:

#### `user_notifications`
Stores notification tokens for users who have enabled notifications.
- `fid` - User's Farcaster ID
- `app_fid` - Client app's FID (e.g., Base app = 309857)
- `notification_url` - Farcaster notification API endpoint
- `notification_token` - Secret token for sending notifications
- `enabled` - Whether notifications are active
- Composite unique key: `(fid, app_fid)`

#### `notification_history`
Audit log of all notifications sent.
- Tracks success/failure status
- Records error messages for debugging
- Indexes for efficient querying

---

## 🔧 Components Created

### 1. **Webhook Handler** (`app/api/webhooks/route.ts`)
- ✅ Uses `parseWebhookEvent()` with `verifyAppKeyWithNeynar` for signature verification
- ✅ Handles all 4 event types:
  - `miniapp_added` - User adds your Mini App
  - `miniapp_removed` - User removes your Mini App
  - `notifications_enabled` - User enables notifications
  - `notifications_disabled` - User disables notifications
- ✅ Automatically sends welcome notifications
- ✅ Properly uses both `fid` and `appFid` for unique identification

### 2. **Notification Service** (`lib/services/notification-service.ts`)
- ✅ Singleton service for sending notifications
- ✅ Token management (save, get, delete, disable)
- ✅ Built-in notification templates for common events
- ✅ Bulk notification support
- ✅ Automatic rate limit handling
- ✅ Comprehensive error tracking

### 3. **UI Components** (`app/components/NotificationPrompt.tsx`)
- `<NotificationPrompt />` - Full notification enrollment card
- `<NotificationToggle />` - Compact notification toggle button
- Both use `sdk.actions.addMiniApp()` to trigger enrollment

---

## 🎯 How to Use

### Send Notifications to Users

```typescript
import { getNotificationService } from '@/lib/services/notification-service';

const notificationService = getNotificationService();

// Send a notification
await notificationService.sendNotification(
  fid,        // User's Farcaster ID
  appFid,     // Client app FID (309857 for Base)
  {
    title: '✅ Transaction Complete',
    body: 'Your payment has been processed!',
    targetUrl: 'https://minisend.xyz?view=receipt'
  }
);
```

### Use in Your App

Add the notification prompt to your UI:

```tsx
import { NotificationPrompt, NotificationToggle } from './components/NotificationPrompt';

// Full enrollment card (recommended for first-time users)
<NotificationPrompt />

// Compact toggle for header/navigation
<NotificationToggle />
```

### Pre-built Notification Templates

```typescript
const notificationService = getNotificationService();

// Welcome notification
const welcomeTemplate = notificationService.getNotificationTemplate('welcome');

// Transaction completed
const template = notificationService.getNotificationTemplate('transaction_completed', {
  amount: '1000',
  currency: 'KES',
  orderId: 'abc123'
});

// Transaction failed
const failedTemplate = notificationService.getNotificationTemplate('transaction_failed', {
  orderId: 'abc123'
});

// Rate update
const rateTemplate = notificationService.getNotificationTemplate('rate_update', {
  rate: '150.50',
  currency: 'KES'
});

// Custom promotion
const promoTemplate = notificationService.getNotificationTemplate('promotion', {
  title: '🎁 Special Offer',
  body: '50% off transaction fees this weekend!'
});
```

---

## 🚀 Next Steps

### 1. **Test Your Webhook**
```bash
# Health check
curl https://minisend.xyz/api/webhooks

# Should return:
# {"status":"healthy","service":"Minisend Webhook Handler","timestamp":"..."}
```

### 2. **Verify Manifest Configuration**
Your webhook URL is already configured in `app/.well-known/farcaster.json/route.ts`:
```typescript
webhookUrl: `${URL}/api/webhooks`
```

### 3. **Deploy and Test**
1. Deploy your app to production
2. Open your Mini App in Farcaster/Base app
3. Trigger the "Save Frame" or notification prompt
4. You should receive a welcome notification!

### 4. **Integrate with Payments**
When a PayCrest transaction completes, send a notification:

```typescript
// In your payment completion handler
import { getNotificationService } from '@/lib/services/notification-service';

const notificationService = getNotificationService();

// After successful payment
await notificationService.sendNotification(
  userFid,    // Get from Farcaster context
  309857,     // Base app FID
  {
    title: '✅ Payment Delivered',
    body: `${amount} ${currency} sent successfully!`,
    targetUrl: `https://minisend.xyz?receipt=${orderId}`
  }
);
```

---

## 📊 Monitoring & Debugging

### Check Notification Status
Query your database to see notification enrollments:

```sql
-- Active notification users
SELECT fid, app_fid, enabled, miniapp_added_at
FROM user_notifications
WHERE enabled = true;

-- Recent notifications sent
SELECT fid, title, status, sent_at
FROM notification_history
ORDER BY sent_at DESC
LIMIT 10;

-- Failed notifications
SELECT * FROM notification_history
WHERE status != 'success'
ORDER BY sent_at DESC;
```

### Common Issues

1. **Webhook signature verification fails**
   - Check that `NEYNAR_API_KEY` is set correctly
   - Verify webhook URL in manifest matches deployed URL

2. **Notifications not received**
   - Check `user_notifications` table for user's token
   - Check `notification_history` for error messages
   - Verify user has enabled notifications in Farcaster

3. **Rate limiting**
   - Max 100 tokens per request
   - Service automatically handles rate limits
   - Check `notification_history` for `rate_limited` status

---

## 🔐 Security Notes

- ✅ All webhook events are verified using Farcaster signatures
- ✅ Notification tokens are stored securely in Supabase
- ✅ Service role key used for server-side operations
- ✅ RLS policies enabled on notification tables
- ✅ No sensitive data exposed to client

---

## 📚 API Reference

### NotificationService Methods

```typescript
class NotificationService {
  // Save notification details from webhook
  async saveNotificationDetails(
    fid: number,
    appFid: number,
    details: NotificationDetails,
    miniappAdded?: boolean
  ): Promise<void>

  // Get user's notification details
  async getNotificationDetails(
    fid: number,
    appFid: number
  ): Promise<UserNotification | null>

  // Send notification to user
  async sendNotification(
    fid: number,
    appFid: number,
    template: NotificationTemplate
  ): Promise<{ success: boolean; status: string; error?: string }>

  // Send to multiple users
  async sendBulkNotifications(
    recipients: Array<{ fid: number; appFid: number }>,
    template: NotificationTemplate
  ): Promise<{ successful: number; failed: number; results: Record<string, string> }>

  // Disable notifications
  async disableNotifications(
    fid: number,
    appFid: number
  ): Promise<void>

  // Delete notification details
  async deleteNotificationDetails(
    fid: number,
    appFid: number
  ): Promise<void>

  // Get pre-built templates
  getNotificationTemplate(
    event: NotificationEvent,
    data?: Record<string, unknown>
  ): NotificationTemplate
}
```

### Notification Constraints (Farcaster Spec)

- **Title**: Max 32 characters
- **Body**: Max 128 characters
- **Target URL**: Max 1024 characters (must be same domain)
- **Tokens**: Max 100 per request
- **Notification ID**: Used for idempotency

---

## 🎉 You're All Set!

Your notification system is ready to engage users with real-time updates about their transactions. Start by testing the webhook endpoint, then integrate notifications into your payment flow.

For questions or issues, refer to:
- [Farcaster Mini Apps Docs](https://docs.farcaster.xyz/developers/mini-apps)
- [Base Mini Apps Guide](https://docs.base.org/building-with-base/mini-apps)
- `.claude/mininotifications.md` - Original setup guide
