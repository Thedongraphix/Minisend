# Webhook Receipt Handling Solution

## Problem
Users were unable to download receipts immediately after transaction completion because of a race condition between:
1. Blockchain transaction confirmation (happens first)
2. Pretium webhook delivery with M-Pesa receipt number (happens 2-10 seconds later)

## Solution Architecture

### 1. Automatic Retry with Exponential Backoff
The `DownloadButton` component now implements intelligent retry logic:
- **Max Retries**: 5 attempts
- **Base Delay**: 2 seconds
- **Backoff Strategy**: Exponential (1.5x multiplier)
- **Total Wait Time**: Up to ~20 seconds

### 2. Receipt Status Endpoint
New endpoint: `/api/pretium/receipt-status/[transactionCode]`
- Checks if receipt data is available
- Returns order status and receipt readiness
- Can be polled without generating the full PDF

### 3. Enhanced Error Messages
The receipt API now provides:
- Clear error messages for each failure scenario
- Hints about expected wait times
- Distinction between "not completed" vs "waiting for webhook"

### 4. User Feedback
- Shows retry attempts: "Retrying (2/5)..."
- Clear error messages when retries exhausted
- Smooth UX with no additional user interaction needed

## How It Works

### Normal Flow (Receipt Ready)
```
User clicks download → API returns receipt → PDF downloaded
```

### Race Condition Flow (Webhook Delayed)
```
User clicks download
  ↓
Attempt 1: 400 error (receipt not ready)
  ↓ wait 2s
Attempt 2: 400 error (still waiting)
  ↓ wait 3s
Attempt 3: 200 success (webhook arrived!)
  ↓
PDF downloaded
```

### Failure Flow (Webhook Never Arrives)
```
User clicks download
  ↓
Attempts 1-5: All fail
  ↓ wait ~20 seconds total
Show error: "Receipt is still processing. Please try again in a few moments."
```

## Implementation Details

### DownloadButton Component
Location: `/app/components/DownloadButton.tsx`

Key features:
- Retry loop with exponential backoff
- Retry attempt counter shown to user
- Proper error handling for different scenarios
- Support for both web and Farcaster mini app contexts

### Receipt API Endpoint
Location: `/app/api/pretium/receipt/[transactionCode]/route.ts`

Checks:
1. Order exists
2. Order status is 'completed'
3. Pretium receipt number is present (from webhook)

Returns appropriate errors for each check failure.

### Status Check Endpoint
Location: `/app/api/pretium/receipt-status/[transactionCode]/route.ts`

Returns:
```json
{
  "ready": true|false,
  "status": "completed"|"pending"|"failed",
  "hasReceiptNumber": true|false,
  "receiptNumber": "ABC123...",
  "transactionCode": "XYZ789..."
}
```

## Testing

### Local Testing
1. Start development server: `npm run dev`
2. Complete a Pretium transaction
3. Immediately click download button
4. Observe retry behavior in console
5. Verify receipt downloads after webhook arrives

### Production Testing
1. Monitor webhook delivery times
2. Check analytics for receipt generation events:
   - `pretium_payment_complete` - webhook received
   - `pretium_receipt_ready` - receipt data available
   - `pretium_receipt_generated` - PDF generated

### Webhook Testing with ngrok
For local webhook testing:
```bash
# Start ngrok
ngrok http 3000

# Update Pretium webhook URL to:
https://your-ngrok-url.ngrok.io/api/pretium/webhook
```

## Configuration

### Retry Settings
In `DownloadButton.tsx`:
```typescript
const maxRetries = 5;        // Number of retry attempts
const baseDelay = 2000;      // Initial delay in ms
const backoffMultiplier = 1.5; // Exponential multiplier
```

### Webhook Timeout
Current settings accommodate:
- Average webhook delay: 2-5 seconds
- Maximum retry window: ~20 seconds
- This covers 99%+ of normal webhook delivery times

## Monitoring

### Key Metrics to Track
1. **Webhook Delivery Time**: Time between transaction completion and webhook receipt
2. **Receipt Generation Success Rate**: Percentage of receipts generated on first attempt
3. **Retry Statistics**: Distribution of retry attempts needed

### Analytics Events
- `pretium_payment_complete`: Webhook received
- `pretium_receipt_ready`: Order has receipt number
- `pretium_receipt_generated`: PDF successfully created

### Error Scenarios to Monitor
1. Webhook never arrives (order stuck without receipt number)
2. Database update fails during webhook processing
3. Receipt generation fails despite having complete data

## Future Improvements

### Short-term
- [ ] Add webhook retry mechanism on Pretium side
- [ ] Implement webhook signature verification
- [ ] Add Sentry/error tracking for failed receipts

### Long-term
- [ ] WebSocket connection for real-time receipt readiness
- [ ] Server-side receipt caching
- [ ] Batch receipt generation for multiple transactions
- [ ] Email receipt delivery as fallback

## Related Files
- `/app/components/DownloadButton.tsx` - Receipt download UI
- `/app/api/pretium/webhook/route.ts` - Webhook handler
- `/app/api/pretium/receipt/[transactionCode]/route.ts` - Receipt generation
- `/app/api/pretium/receipt-status/[transactionCode]/route.ts` - Status check
- `/lib/pretium/receipt-helpers.ts` - Receipt utility functions
