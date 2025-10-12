# Notification System Integration Checklist

## ✅ Pre-Integration Verification

### System Status
- [x] All notification code is isolated
- [x] No imports in active payment flows
- [x] No database migrations applied
- [x] Current production code unaffected
- [x] Build passes with no errors

### Files Created (Not Active)
```
lib/
├── services/
│   └── notification-service.ts        (Standalone service)
├── types/
│   └── notification.ts                (Type definitions)
├── utils/
│   └── transaction-notifications.ts   (Helper functions)
├── database/
│   ├── notification-schema.sql        (Not applied)
│   └── add-fid-to-orders.sql         (Not applied)
└── examples/
    └── notification-integration-example.ts

app/
├── api/
│   ├── webhooks/
│   │   └── route.ts                  (Webhook endpoint - no traffic)
│   └── notifications/
│       └── send/
│           └── route.ts              (Internal API - not used)
└── hooks/
    └── useFarcasterUser.ts           (Hook - not imported)

scripts/
└── setup-notifications.sh            (Setup script)

Documentation/
├── NOTIFICATIONS.md                  (Full guide)
├── NOTIFICATIONS-READY.md            (Status document)
└── INTEGRATION-CHECKLIST.md          (This file)
```

## 📋 When Ready to Integrate

### Step 1: Database Setup
```bash
□ Backup current database
□ Review SQL schemas:
  - lib/database/notification-schema.sql
  - lib/database/add-fid-to-orders.sql
□ Apply migrations in staging first
□ Verify tables created correctly:
  - user_notifications
  - notification_history
□ Test rollback if needed
```

### Step 2: Environment Configuration
```bash
□ Generate INTERNAL_API_KEY
  openssl rand -hex 32

□ Add to .env.local:
  INTERNAL_API_KEY=<generated_key>

□ Add to production environment:
  - Vercel: Settings → Environment Variables
  - Add INTERNAL_API_KEY

□ Verify existing vars still work:
  - NEXT_PUBLIC_URL
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
```

### Step 3: Code Integration Points

#### 3.1 Order Creation (Add FID Capture)
File: `app/api/paycrest/orders/simple/route.ts`

```typescript
// Add import
import { /* existing imports */ } from '...';

// In POST handler, after parsing body:
const body = await request.json();
const { fid, ...orderData } = body; // Extract FID

// When creating order in database:
await DatabaseService.createOrder({
  ...orderData,
  fid, // Store FID
});
```

Component: `app/components/ExchangeFlow.tsx` or wherever order is created

```typescript
// Add import
import { useFarcasterFid } from '@/app/hooks/useFarcasterUser';

// In component:
const fid = useFarcasterFid();

// When calling API:
const response = await fetch('/api/paycrest/orders/simple', {
  method: 'POST',
  body: JSON.stringify({
    ...orderData,
    fid, // Include FID
  })
});
```

#### 3.2 Status Polling (Add Notifications)
File: `app/api/paycrest/status/[orderId]/route.ts`

```typescript
// Add imports at top
import {
  notifyTransactionCompleted,
  notifyTransactionValidated,
  notifyTransactionFailed
} from '@/lib/utils/transaction-notifications';

// After status update logic (around line 145-170):
if (order.status === 'validated' && previousStatus !== 'validated') {
  // Non-blocking notification
  notifyTransactionValidated(
    dbOrder.fid,
    orderId,
    dbOrder.amount_in_local,
    dbOrder.local_currency
  );
}

if (order.status === 'settled' && previousStatus !== 'settled') {
  // Non-blocking notification
  notifyTransactionCompleted(
    dbOrder.fid,
    orderId,
    dbOrder.amount_in_local,
    dbOrder.local_currency
  );
}

if (['refunded', 'expired'].includes(order.status)) {
  // Non-blocking notification
  notifyTransactionFailed(dbOrder.fid, orderId);
}
```

### Step 4: Testing in Staging

```bash
□ Deploy to staging environment
□ Test webhook endpoint responds:
  curl https://staging.minisend.xyz/api/webhooks

□ Check manifest webhook URL:
  curl https://staging.minisend.xyz/.well-known/farcaster.json

□ Add Mini App in Farcaster (staging)
□ Verify webhook receives miniapp_added event
□ Check database for notification token
□ Create test transaction with FID
□ Verify notification received in Farcaster
□ Test notification for completed transaction
□ Test notification for failed transaction
```

### Step 5: Production Rollout

```bash
□ Apply database migrations to production
□ Set INTERNAL_API_KEY in production
□ Deploy code with notification integration
□ Monitor webhook endpoint:
  - Check logs for webhook POST requests
  - Verify notification tokens being stored

□ Monitor notification delivery:
  SELECT status, COUNT(*)
  FROM notification_history
  WHERE sent_at > NOW() - INTERVAL '1 hour'
  GROUP BY status;

□ Track user adoption:
  SELECT COUNT(*)
  FROM user_notifications
  WHERE enabled = TRUE;
```

## 🔍 Verification Commands

### Check No Active Integration (Current State)
```bash
# Should return 0 - no imports in active code
cd /home/chrisdev/Minisend
grep -r "notification-service\|transaction-notifications\|useFarcasterUser" \
  app/components app/api/paycrest \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules" \
  | wc -l
```

### After Integration - Verify Imports
```bash
# Should show imports in order creation and status endpoints
grep -r "notification-service\|transaction-notifications" \
  app/api/paycrest \
  --include="*.ts"
```

### Database Verification
```sql
-- Check tables exist (after migration)
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('user_notifications', 'notification_history');

-- Check FID column added to orders
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'fid';

-- Check notification tokens (after users add app)
SELECT COUNT(*) as enabled_users
FROM user_notifications
WHERE enabled = TRUE;

-- Check notification history (after sending)
SELECT
  status,
  COUNT(*) as count,
  MAX(sent_at) as last_sent
FROM notification_history
GROUP BY status;
```

## 🚨 Rollback Plan

If issues arise after integration:

### Quick Rollback
```bash
# 1. Revert code changes
git revert <commit-hash>

# 2. Deploy previous version
git push origin main

# 3. Database stays as-is (tables don't hurt)
# 4. Notifications simply stop sending
```

### Full Rollback (if needed)
```sql
-- Remove FID column from orders (if needed)
ALTER TABLE orders DROP COLUMN IF EXISTS fid;

-- Drop notification tables (if needed)
DROP TABLE IF EXISTS notification_history CASCADE;
DROP TABLE IF EXISTS user_notifications CASCADE;
```

## 📊 Success Metrics

Track these after integration:

### Week 1
- [ ] Webhook events received: > 0
- [ ] Notification tokens stored: > 0
- [ ] Welcome notifications sent: > 0
- [ ] Transaction notifications sent: > 0
- [ ] Notification success rate: > 90%

### Week 2-4
- [ ] User notification opt-in rate: > 20%
- [ ] Notification open rate: Track in Farcaster
- [ ] Zero impact on payment success rate
- [ ] No increase in payment processing time

## 📝 Integration Notes

### Important Reminders

1. **Non-Blocking Design**: All notification calls use fire-and-forget pattern
   - Notification failures won't break transactions
   - Helper functions catch and suppress errors

2. **FID is Optional**: System works without FID
   - If no FID, notifications simply don't send
   - Payment flow continues normally

3. **Backward Compatible**:
   - Old orders without FID continue working
   - New orders with FID get notifications

4. **No Console Logs**: Per project guidelines
   - All notification code avoids browser console logs
   - Server logs are minimal

### Common Issues

**Issue**: Webhook not receiving events
- **Fix**: Verify manifest webhookUrl is correct
- **Fix**: Ensure app is published and users can add it

**Issue**: Notifications not sending
- **Fix**: Check INTERNAL_API_KEY is set
- **Fix**: Verify Supabase credentials
- **Fix**: Check notification_history table for errors

**Issue**: FID not captured
- **Fix**: Verify useFarcasterFid() hook is called
- **Fix**: Check FID is included in API request body
- **Fix**: Confirm user is in Mini App (not web browser)

## ✅ Final Checklist

Before marking integration complete:

- [ ] All database migrations applied successfully
- [ ] Environment variables configured in production
- [ ] Code deployed with FID capture and notification triggers
- [ ] Webhook endpoint accessible and responding
- [ ] At least one test notification sent successfully
- [ ] Notification history table populating correctly
- [ ] Zero regression in payment flow functionality
- [ ] Documentation reviewed and accurate
- [ ] Team trained on notification system
- [ ] Monitoring dashboard set up (optional)

## 📚 Reference Documentation

- Full guide: `NOTIFICATIONS.md`
- Status: `NOTIFICATIONS-READY.md`
- Examples: `lib/examples/notification-integration-example.ts`
- Setup: `scripts/setup-notifications.sh`

---

**Remember**: The notification system is currently isolated and won't affect any production flows until you explicitly integrate it following this checklist.
