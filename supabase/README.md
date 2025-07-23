# MiniSend Supabase Setup

This directory contains the database schema and configuration for MiniSend's Supabase integration.

## Quick Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and API keys

2. **Run the Schema**
   ```sql
   -- Copy and paste the contents of schema.sql into your Supabase SQL editor
   -- This will create all tables, indexes, policies, and functions
   ```

3. **Configure Environment Variables**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

## Database Schema

### Core Tables

- **`users`** - User profiles with wallet addresses and Farcaster integration
- **`payment_orders`** - PayCrest payment orders with full transaction lifecycle
- **`webhook_events`** - PayCrest webhook events for real-time status updates
- **`analytics_events`** - Application analytics and user behavior tracking
- **`carrier_detection_logs`** - Kenyan mobile carrier detection accuracy logs

### Views

- **`user_transaction_summary`** - Aggregated user transaction statistics
- **`daily_analytics`** - Daily transaction and user metrics

### Functions & Triggers

- **`update_updated_at_column()`** - Automatically updates `updated_at` timestamps
- **`set_validation_timestamp()`** - Sets validation/settlement timestamps on status changes

## Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Allow users to see only their own data
- Allow service role (API) full access for backend operations
- Protect sensitive information while enabling necessary functionality

## Usage Examples

### Create a User
```typescript
import { UserService } from '@/lib/supabase/users';

const user = await UserService.upsertUser({
  wallet_address: '0x...',
  farcaster_fid: 12345,
  farcaster_username: 'username'
});
```

### Track a Payment Order
```typescript
import { OrderService } from '@/lib/supabase/orders';

const order = await OrderService.createOrder({
  paycrest_order_id: 'paycrest_123',
  paycrest_reference: 'ref_123',
  wallet_address: '0x...',
  amount: 100,
  currency: 'KES',
  // ... other fields
});
```

### Store Webhook Events
```typescript
import { WebhookService } from '@/lib/supabase/webhooks';

const webhook = await WebhookService.storeWebhookEvent({
  event_type: 'payment_order.validated',
  paycrest_order_id: 'paycrest_123',
  payload: webhookData,
  signature: 'webhook_signature'
});
```

### Track Analytics
```typescript
import { AnalyticsService } from '@/lib/supabase/analytics';

await AnalyticsService.trackOrderCreated(
  walletAddress,
  orderId,
  amount,
  currency,
  recipientPhone
);
```

## API Endpoints

The following API endpoints are available:

- **`GET /api/transactions/history`** - Get user transaction history
- **`GET /api/analytics/dashboard`** - Admin analytics dashboard
- **`POST /api/paycrest/webhook`** - PayCrest webhook handler (auto-stores events)

## Database Maintenance

### Cleanup Old Data
```typescript
// Clean up old webhook events (30+ days)
await WebhookService.cleanupOldWebhooks(30);

// Clean up old analytics events (90+ days)
await AnalyticsService.cleanupOldAnalytics(90);
```

### Monitor Performance
- Check database size regularly
- Monitor slow queries in Supabase dashboard
- Review RLS policy performance
- Set up database backups

## Security Considerations

1. **Environment Variables**
   - Never commit API keys to version control
   - Use service role key only on backend
   - Rotate keys periodically

2. **Row Level Security**
   - All tables have RLS enabled
   - Users can only access their own data
   - Service role bypasses RLS for backend operations

3. **Data Privacy**
   - Phone numbers are stored but not exposed in client queries
   - Wallet addresses are primary identifiers
   - Sensitive data is JSON-encrypted in metadata fields

## Monitoring & Alerts

Set up monitoring for:
- Database connection health
- Failed webhook processing
- Unusual transaction patterns
- High error rates in analytics events

## Backup Strategy

1. **Automatic Backups**
   - Supabase provides automatic daily backups
   - Enable point-in-time recovery for production

2. **Manual Exports**
   - Export critical data regularly
   - Store backups in separate cloud storage
   - Test restore procedures

## Troubleshooting

### Common Issues

1. **RLS Permission Denied**
   - Check if service role key is being used for backend operations
   - Verify RLS policies are correctly configured

2. **Webhook Processing Failures**
   - Check `webhook_events` table for processing errors
   - Verify webhook signature validation

3. **Analytics Not Tracking**
   - Ensure analytics events don't throw errors that break main flow
   - Check for client-side JS errors preventing analytics calls

### Debug Queries

```sql
-- Check recent orders
SELECT * FROM payment_orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Check webhook processing
SELECT event_type, processed, COUNT(*) 
FROM webhook_events 
GROUP BY event_type, processed;

-- Check user activity
SELECT DATE(timestamp), COUNT(*) 
FROM analytics_events 
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp);
```