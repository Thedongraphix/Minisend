# Minisend Notification System

Complete implementation of Farcaster Mini App notifications for real-time transaction updates.

## Overview

Minisend uses the Farcaster Frame Notifications API to send real-time updates to users about their transactions. Users receive notifications when transactions complete, fail, or change status.

## Architecture

### Components

1. **Webhook Handler** (`/api/webhooks`)
   - Receives events from Farcaster when users interact with the app
   - Handles: `miniapp_added`, `miniapp_removed`, `notifications_enabled`, `notifications_disabled`

2. **Notification Service** (`lib/services/notification-service.ts`)
   - Core service for managing and sending notifications
   - Handles notification templates, bulk sending, and history tracking

3. **Database Schema**
   - `user_notifications` table: Stores notification tokens and user preferences
   - `notification_history` table: Audit log of all sent notifications

4. **Transaction Helpers** (`lib/utils/transaction-notifications.ts`)
   - Helper functions to send notifications for transaction events
   - Non-blocking design prevents notification failures from affecting transactions

## Setup Instructions

### 1. Database Setup

Run the notification schema migration:

```bash
# Apply the notification tables
psql $DATABASE_URL -f lib/database/notification-schema.sql

# Add FID column to orders table
psql $DATABASE_URL -f lib/database/add-fid-to-orders.sql
```

Or use Supabase SQL Editor to run the SQL files directly.

### 2. Environment Variables

Add these to your `.env.local` and production environment:

```bash
# Internal API key for sending notifications (generate a secure random string)
INTERNAL_API_KEY=your_secure_random_key_here

# Supabase credentials (should already be configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL (should already be configured)
NEXT_PUBLIC_URL=https://minisend.xyz
```

### 3. Verify Webhook URL

The webhook URL is already configured in `.well-known/farcaster.json/route.ts`:

```typescript
webhookUrl: `${URL}/api/webhooks`
```

Ensure your manifest is properly set up by visiting:
```
https://your-domain.com/.well-known/farcaster.json
```

### 4. Test the Webhook

Test that your webhook is accessible:

```bash
curl https://your-domain.com/api/webhooks
# Should return: {"status":"healthy",...}
```

## Usage

### Client-Side: Get User FID

Use the `useFarcasterUser` hook to get the current user's FID:

```typescript
import { useFarcasterUser, useFarcasterFid } from '@/app/hooks/useFarcasterUser';

function MyComponent() {
  const { user, isInMiniApp } = useFarcasterUser();
  // or just get the FID
  const fid = useFarcasterFid();

  return (
    <div>
      {isInMiniApp && <p>Welcome, {user?.displayName}!</p>}
    </div>
  );
}
```

### Server-Side: Send Notifications

#### Option 1: Using Transaction Helpers (Recommended)

```typescript
import { notifyTransactionCompleted } from '@/lib/utils/transaction-notifications';

// In your transaction completion logic
await notifyTransactionCompleted(
  userFid,
  orderId,
  amount,
  currency
);
```

#### Option 2: Using NotificationService Directly

```typescript
import { getNotificationService } from '@/lib/services/notification-service';

const notificationService = getNotificationService();

// Send custom notification
await notificationService.sendNotification(fid, {
  title: 'Custom Title',
  body: 'Custom message',
  targetUrl: 'https://minisend.xyz/my-page'
});

// Send bulk notification
const template = notificationService.getNotificationTemplate('rate_update', {
  rate: 140.5,
  currency: 'KES'
});

await notificationService.sendBulkNotifications([fid1, fid2, fid3], template);
```

#### Option 3: Using Internal API

```typescript
// Send notification via API (useful for external services)
await fetch('https://minisend.xyz/api/notifications/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.INTERNAL_API_KEY!
  },
  body: JSON.stringify({
    fid: 12345,
    event: 'transaction_completed',
    data: {
      orderId: 'ord_123',
      amount: 1000,
      currency: 'KES'
    }
  })
});
```

## Notification Events

### Built-in Events

1. **welcome** - Sent when user adds the Mini App
   ```
   Title: "🎉 Welcome to Minisend!"
   Body: "Convert USDC to KES or NGN instantly..."
   ```

2. **transaction_completed** - Sent when transaction settles
   ```
   Title: "✅ Transaction Complete"
   Body: "1000 KES delivered successfully!"
   ```

3. **transaction_validated** - Sent when funds are delivered
   ```
   Title: "✓ Payment Validated"
   Body: "Your KES transfer has been validated..."
   ```

4. **transaction_failed** - Sent when transaction fails
   ```
   Title: "❌ Transaction Failed"
   Body: "Your transaction couldn't be completed..."
   ```

5. **rate_update** - Sent when exchange rates change
   ```
   Title: "📊 Rate Update"
   Body: "New rates: 1 USDC = 140.50 KES"
   ```

6. **promotion** - Custom promotional messages

### Adding Custom Events

Edit `lib/types/notification.ts` to add new event types:

```typescript
export type NotificationEvent =
  | 'transaction_completed'
  | 'my_custom_event'; // Add your event
```

Then add the template in `NotificationService.getNotificationTemplate()`:

```typescript
case 'my_custom_event':
  return {
    title: 'Event Title',
    body: 'Event message',
    targetUrl: this.appUrl,
  };
```

## Integration with Transactions

### Capturing FID During Order Creation

Update your order creation endpoint to capture the user's FID:

```typescript
// In /api/paycrest/orders/simple/route.ts
const body = await request.json();
const { fid, ...orderData } = body;

// Store FID with order
await DatabaseService.createOrder({
  ...orderData,
  fid, // Store FID for notifications
});
```

### Sending Notifications on Status Changes

The notification integration is already set up in the status endpoint. When a transaction changes status, notifications are automatically sent.

To integrate into other endpoints:

```typescript
import { notifyTransactionValidated } from '@/lib/utils/transaction-notifications';

// In your status check logic
if (order.status === 'validated' && previousStatus !== 'validated') {
  // Send notification (non-blocking)
  notifyTransactionValidated(
    order.fid,
    order.id,
    order.amount,
    order.currency
  );
}
```

## Testing

### Testing Webhook Locally

1. Use ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```

2. Update your manifest with the ngrok URL

3. Add the Mini App in Farcaster to trigger webhook events

### Testing Notifications

Create a test script:

```typescript
// scripts/test-notification.ts
import { getNotificationService } from '@/lib/services/notification-service';

async function testNotification() {
  const service = getNotificationService();

  const result = await service.sendNotification(YOUR_FID, {
    title: 'Test Notification',
    body: 'This is a test!',
    targetUrl: 'https://minisend.xyz'
  });

 console.log('Result:', result);
}

testNotification();
```

## Rate Limits

Farcaster imposes rate limits on notifications:

- **Per user**: Respect reasonable notification frequency
- **Bulk sends**: Limited to 100 tokens per request
- **Rate limited tokens**: Service automatically handles rate limit responses

## Security

### Webhook Security

- Webhook signature validation is implemented (TODO: Full signature verification)
- Only accepts properly formatted Farcaster webhook payloads

### API Security

- Internal notification API requires `INTERNAL_API_KEY` header
- Notification tokens are stored securely in database
- Invalid tokens are automatically disabled

### Best Practices

1. **Never log notification tokens** - They're secret credentials
2. **Validate FIDs** - Ensure FID belongs to the user making the request
3. **Rate limit wisely** - Don't spam users with notifications
4. **Handle failures gracefully** - Notification failures shouldn't break transactions

## Monitoring

### Check Notification Status

Query notification history:

```sql
-- Recent notifications
SELECT * FROM notification_history
ORDER BY sent_at DESC
LIMIT 100;

-- Success rate
SELECT
  status,
  COUNT(*) as count
FROM notification_history
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Users with notifications enabled
SELECT COUNT(*) FROM user_notifications
WHERE enabled = TRUE;
```

### Monitoring Dashboard

Consider building a dashboard to track:
- Notification delivery rate
- Failed notifications
- Users with notifications enabled
- Notification history by user

## Troubleshooting

### Notifications Not Sending

1. **Check user has notifications enabled**
   ```sql
   SELECT * FROM user_notifications WHERE fid = YOUR_FID;
   ```

2. **Check webhook is receiving events**
   - Visit `https://your-domain.com/api/webhooks` (should return healthy status)
   - Check server logs for webhook POST requests

3. **Verify manifest configuration**
   - Visit `https://your-domain.com/.well-known/farcaster.json`
   - Ensure `webhookUrl` is correct

4. **Check notification history for errors**
   ```sql
   SELECT * FROM notification_history
   WHERE status = 'failed'
   ORDER BY sent_at DESC
   LIMIT 10;
   ```

### Webhook Not Receiving Events

1. Ensure webhook URL is publicly accessible (not localhost)
2. Check that manifest is properly signed and deployed
3. Verify app is added to Farcaster with the correct manifest

## Resources

- [Farcaster Frame Notifications Docs](https://docs.farcaster.xyz/developers/frames/notifications)
- [Farcaster Mini App Docs](https://docs.base.org/base-app/build-with-minikit/)
- [MiniKit SDK Reference](https://docs.base.org/base-app/build-with-minikit/overview)

## Support

For issues or questions:
- Check the troubleshooting section above
- Review notification_history table for error details
- Check server logs for webhook processing errors
- Contact support@minisend.xyz


{/* Service Notice Banner */}
      <div className="w-full max-w-md mx-auto px-4 mb-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-center">
          <p className="text-yellow-400 text-sm font-medium">
            Temporarily out of service. Resuming at 8PM EAT.
          </p>
        </div>
      </div>

      basic stuff