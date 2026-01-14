# BlockRadar Webhook Setup Guide

## Overview

This guide explains how to set up BlockRadar webhooks to send email notifications to users when they deposit funds to their Minisend wallets.

---

## Architecture

### Flow
```
User deposits USDC on any supported chain (Base, Polygon, Lisk, Celo)
    ↓
BlockRadar Gateway receives deposit
    ↓
BlockRadar sends webhook to /api/blockradar/webhook
    ↓
System looks up user by their Minisend wallet address
    ↓
Resend sends email notification to user
    ↓
User receives email with deposit amount, blockchain, and estimated settlement time
```

### Webhook Events
We're handling these BlockRadar webhook events:
- `gateway-deposit.success` - Deposit successfully received and being processed
- `gateway-deposit.failed` - Deposit attempt failed

---

## Configuration Steps

### 1. Get Resend API Key

1. Go to https://resend.com/
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (starts with `re_`)

### 2. Configure Email Domain in Resend

1. In Resend dashboard, go to Domains
2. Add your domain: `minisend.xyz`
3. Follow DNS configuration steps:
   - Add the provided TXT, MX, and CNAME records to your DNS
   - Wait for verification (usually 5-10 minutes)
4. Once verified, you can send from `info@minisend.xyz`

**Note:** Until domain is verified, you can test with Resend's sandbox mode which sends to your verified email only.

### 3. Add Environment Variable

Add this to your `.env` file:

```env
# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
```

### 4. Configure Webhook in BlockRadar Dashboard

1. Log in to BlockRadar Dashboard
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Configure the webhook:
   - **Name:** Minisend Gateway Deposits
   - **URL:** `https://app.minisend.xyz/api/blockradar/webhook`
   - **Events:** Select these events:
     - `gateway-deposit.success`
     - `gateway-deposit.failed`
   - **Status:** Active

5. Save the webhook configuration

---

## Email Templates

### Success Email
Sent when a deposit is successfully received:
- **Subject:** `✅ {amount} {symbol} Deposit Received`
- **Contains:**
  - Deposit amount and asset symbol
  - Network/blockchain name
  - Estimated settlement time (chain-specific)
  - Transaction hash
  - What's happening next explanation

### Failed Email
Sent when a deposit attempt fails:
- **Subject:** `⚠️ Deposit Failed - {amount} {symbol}`
- **Contains:**
  - Deposit amount and asset symbol
  - Network/blockchain name
  - Transaction hash
  - Troubleshooting guidance

---

## Settlement Time Estimates

The system provides chain-specific settlement times:

| Blockchain | Estimated Settlement Time |
|------------|---------------------------|
| Polygon    | 8-15 seconds              |
| Celo       | 5-10 seconds              |
| Avalanche  | 8-15 seconds              |
| Base       | 13-19 minutes             |
| Ethereum   | 13-19 minutes             |
| Optimism   | 13-19 minutes             |
| Arbitrum   | 13-19 minutes             |
| Lisk       | 13-19 minutes             |

These times reflect blockchain finality requirements for safe cross-chain settlement via BlockRadar Gateway.

---

## Testing

### 1. Test Email Delivery

First, verify Resend is configured correctly:

1. Check that `RESEND_API_KEY` is in your `.env`
2. Restart your development server: `npm run dev`
3. Check logs for any Resend initialization errors

### 2. Test Webhook Endpoint Locally

You can test the webhook endpoint with a sample payload:

```bash
curl -X POST http://localhost:3000/api/blockradar/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "gateway-deposit.success",
    "data": {
      "id": "test-123",
      "reference": "ref-123",
      "senderAddress": "0x1234...",
      "recipientAddress": "YOUR_TEST_USER_MINISEND_WALLET",
      "amount": "10.50",
      "amountUSD": "10.50",
      "hash": "0xabcd...",
      "status": "SUCCESS",
      "type": "GATEWAY_DEPOSIT",
      "note": "Test deposit",
      "asset": {
        "name": "USD Coin",
        "symbol": "USDC",
        "decimals": 6
      },
      "blockchain": {
        "name": "Polygon",
        "slug": "polygon"
      },
      "createdAt": "2026-01-15T00:00:00Z"
    }
  }'
```

Replace `YOUR_TEST_USER_MINISEND_WALLET` with an actual Minisend wallet address from your database.

### 3. Test with Real Deposit (Testnet)

1. Create a test user account
2. Get their Minisend wallet address
3. Send test USDC to that address on a testnet (Base Sepolia, Polygon Amoy, etc.)
4. Verify:
   - Webhook is received (check server logs)
   - User is found in database
   - Email is sent to user's email address
   - Email contains correct information

### Expected Logs

**Successful webhook processing:**
```
📨 BlockRadar webhook received: {
  event: 'gateway-deposit.success',
  type: 'GATEWAY_DEPOSIT',
  amount: '10.50',
  blockchain: 'polygon',
  status: 'SUCCESS'
}
✅ Deposit notification sent: {
  email: 'user@example.com',
  amount: '10.50',
  assetSymbol: 'USDC',
  blockchain: 'Polygon'
}
```

**User not found:**
```
📨 BlockRadar webhook received: { ... }
⚠️ User not found for address: 0x123...
```

**No email address:**
```
📨 BlockRadar webhook received: { ... }
⚠️ User has no email: user-id-123
```

---

## Security Considerations

### 1. Webhook Verification (Future Enhancement)

Currently, the webhook accepts all requests. For production, you should:
- Add webhook signature verification
- Validate the webhook secret from BlockRadar
- Reject invalid or tampered requests

**Implementation suggestion:**
```typescript
const webhookSecret = process.env.BLOCKRADAR_WEBHOOK_SECRET;
const signature = request.headers.get('x-webhook-signature');
// Verify signature matches expected value
```

### 2. Rate Limiting

The webhook endpoint should be rate-limited to prevent abuse. Consider adding rate limiting for the webhook route in your middleware.

### 3. Error Handling

The webhook always returns HTTP 200, even on errors, to prevent BlockRadar from retrying repeatedly. Errors are logged for investigation:
- User lookup failures
- Email sending failures
- Database errors

All errors are caught and logged without blocking the webhook response.

---

## Troubleshooting

### Issue: No webhook received

**Check:**
- Webhook URL is accessible from internet (not localhost)
- Webhook is configured in BlockRadar dashboard
- Webhook events are selected correctly
- Webhook status is "Active"

**Test webhook connectivity:**
```bash
# From BlockRadar dashboard, use "Test Webhook" feature
# Or manually trigger a test deposit
```

### Issue: User not found in database

**Check:**
- User has signed up and has a Minisend wallet assigned
- Minisend wallet address matches exactly (case-sensitive)
- Database query is working correctly

**Debug:**
```sql
-- Check if user exists in database
SELECT user_id, email, minisend_wallet
FROM minisend_users
WHERE minisend_wallet = '0x...';
```

### Issue: Email not sending

**Check:**
- `RESEND_API_KEY` is correctly set in `.env`
- Resend API key is valid and not expired
- Domain is verified in Resend dashboard (for production)
- User has a valid email address in database

**Check Resend Dashboard:**
- Go to https://resend.com/emails
- View sent emails and delivery status
- Check for any bounce or failure notifications

### Issue: Wrong settlement time estimate

**Check:**
- Blockchain slug matches expected format (lowercase)
- Settlement times are up to date with current chain finality

**Update settlement times:**
Edit `app/api/blockradar/webhook/route.ts` around line 50-60 if settlement times change.

---

## Monitoring

### Key Metrics to Track

1. **Webhook Delivery Success Rate**
   - Monitor how many webhooks are successfully processed
   - Track webhook failures and retries

2. **Email Delivery Success Rate**
   - Monitor Resend dashboard for email delivery stats
   - Track bounces, complaints, and failed deliveries

3. **User Notification Coverage**
   - Track what percentage of deposits result in email notifications
   - Identify users without email addresses

4. **Settlement Time Accuracy**
   - Monitor actual settlement times vs. estimates provided
   - Adjust estimates if consistently inaccurate

### Recommended Dashboard Queries

**Deposits without notifications:**
```sql
-- Find deposits that didn't trigger notifications
-- (requires deposit tracking in database)
```

**Users without emails:**
```sql
SELECT COUNT(*)
FROM minisend_users
WHERE email IS NULL OR email = '';
```

---

## Maintenance

### Regular Tasks

1. **Monitor Resend Email Quota**
   - Free tier: 100 emails/day
   - Upgrade as user base grows

2. **Update Settlement Times**
   - Review chain finality times quarterly
   - Update estimates if chain upgrades occur

3. **Review Email Templates**
   - Test email rendering across email clients
   - Update design as needed
   - Keep content accurate and helpful

4. **Check Webhook Health**
   - Monitor webhook failure rates in BlockRadar dashboard
   - Investigate any spike in failures

---

## Production Checklist

Before going live:

- [ ] `RESEND_API_KEY` configured in production environment
- [ ] Email domain verified in Resend
- [ ] Webhook URL accessible from internet
- [ ] Webhook configured in BlockRadar dashboard
- [ ] Test email sent successfully
- [ ] Test webhook with real deposit on testnet
- [ ] Email templates reviewed and approved
- [ ] Monitoring in place for webhook failures
- [ ] Error alerts configured for email delivery failures
- [ ] Settlement time estimates verified for each chain

---

## Next Steps

1. **Add Webhook Secret Verification**
   - Get webhook secret from BlockRadar
   - Add signature verification to webhook handler
   - Reject invalid requests

2. **Enhanced Email Templates**
   - Add company logo
   - Improve mobile responsiveness
   - Add links to transaction explorer

3. **Notification Preferences**
   - Allow users to opt-out of deposit notifications
   - Add notification settings to user profile

4. **Additional Webhook Events**
   - Handle `withdrawal` events
   - Handle `settlement.completed` events
   - Send notifications for other wallet activities

---

**Last Updated:** 2026-01-15

**Status:** ✅ Ready for Testing
