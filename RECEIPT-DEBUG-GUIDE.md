# Receipt Generation Debug Guide

## Current Status

✅ **Webhook data IS being saved correctly** to the database:
- Transaction code: `2ccaaa97-377b-4637-be74-bf7e8f43a673`
- Receipt number: `TL8AT0EQR8`
- Account name: `Christopher Nyojwang Oketch`
- Status: `completed`

## What We've Confirmed

1. ✅ Webhook handler receives data correctly
2. ✅ Database is updated with `pretium_receipt_number` and `account_name`
3. ✅ Receipt API endpoint reads data from database
4. ✅ Receipt generator has correct field mapping (`pretium_receipt_number` → `mpesaReceiptNumber`)
5. ✅ Code has been rebuilt successfully

## Debug Steps for Production

### 1. Check Production Logs

After clicking "Download Receipt" on production, check your Vercel/deployment logs for these messages:

```
[Receipt API] Order data from database: {
  pretium_receipt_number: 'TL8AT0EQR8',
  account_name: 'Christopher Nyojwang Oketch',
  transaction_hash: '0x...',
  status: 'completed'
}

[Receipt API] OrderData created with: {
  pretium_receipt_number: 'TL8AT0EQR8',
  account_name: 'Christopher Nyojwang Oketch'
}

[Receipt Generator] Order data received: {
  blockchain_tx_hash: '0x...',
  pretium_receipt_number: 'TL8AT0EQR8',
  account_name: 'Christopher Nyojwang Oketch',
  amount_in_local: 119
}

[Receipt Generator] Receipt data created: {
  mpesaReceiptNumber: 'TL8AT0EQR8',
  blockchainTxHash: '0x...',
  recipientName: 'Christopher Nyojwang Oketch',
  localAmount: 119
}
```

### 2. Possible Issues

#### Issue A: Cache Problem
**Symptom**: Old code is still running on production
**Solution**:
```bash
# Re-deploy to production
vercel --prod
# or
git push origin main  # if using Vercel GitHub integration
```

#### Issue B: Environment Variables
**Symptom**: Database connection issues
**Check**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

#### Issue C: Build Not Deployed
**Symptom**: Changes not reflecting
**Solution**:
```bash
npm run build
# Deploy the .next folder
```

### 3. Test Receipt API Directly

Test the endpoint directly in browser or with curl:

```bash
# Test receipt status
curl https://app.minisend.xyz/api/pretium/receipt-status/2ccaaa97-377b-4637-be74-bf7e8f43a673

# Expected response:
{
  "ready": true,
  "status": "completed",
  "hasReceiptNumber": true,
  "receiptNumber": "TL8AT0EQR8",
  "transactionCode": "2ccaaa97-377b-4637-be74-bf7e8f43a673"
}
```

```bash
# Test receipt download (should return PDF)
curl https://app.minisend.xyz/api/pretium/receipt/2ccaaa97-377b-4637-be74-bf7e8f43a673 -o test-receipt.pdf

# Check if PDF was generated
file test-receipt.pdf
# Should show: PDF document
```

## Files Modified

1. **app/components/DownloadButton.tsx** - Simplified download logic
2. **app/api/pretium/receipt/[transactionCode]/route.ts** - Added debug logging
3. **app/api/pretium/receipt-status/[transactionCode]/route.ts** - NEW status endpoint

## Database Schema

```sql
-- Orders table has these Pretium fields:
pretium_transaction_code TEXT  -- The transaction ID
pretium_receipt_number TEXT    -- M-Pesa code (e.g., TL8AT0EQR8)
account_name TEXT              -- Recipient name
status TEXT                    -- 'completed' when webhook arrives
```

## Verification Query

```javascript
// Run this in your Supabase SQL editor or via API
SELECT
  id,
  pretium_transaction_code,
  pretium_receipt_number,
  account_name,
  status,
  amount_in_local,
  local_currency,
  created_at
FROM orders
WHERE pretium_transaction_code = '2ccaaa97-377b-4637-be74-bf7e8f43a673';
```

**Expected Result:**
```json
{
  "id": "e38a4731-a053-44fb-a5b2-95ec2cf8dde4",
  "pretium_transaction_code": "2ccaaa97-377b-4637-be74-bf7e8f43a673",
  "pretium_receipt_number": "TL8AT0EQR8",
  "account_name": "Christopher Nyojwang Oketch",
  "status": "completed",
  "amount_in_local": 119,
  "local_currency": "KES"
}
```

## What Should Happen

1. User completes transaction
2. Pretium webhook arrives with receipt data
3. Database updated: `pretium_receipt_number = 'TL8AT0EQR8'`
4. User clicks "Download Receipt"
5. API fetches order from database
6. Receipt generator creates PDF with M-Pesa code
7. PDF shows: **"M-Pesa Confirmation: TL8AT0EQR8"**

## Next Steps

1. **Deploy to production** with the new logging
2. **Complete a test transaction**
3. **Wait 5-10 seconds** for webhook
4. **Click "Download Receipt"**
5. **Check production logs** for the debug messages
6. **Download the PDF** and verify M-Pesa code is visible

## If M-Pesa Code Still Missing

Send me:
1. The production logs showing all `[Receipt API]` and `[Receipt Generator]` messages
2. The transaction code
3. Screenshot of the receipt PDF
4. Result of the status check API call

## Clean Test Script

```javascript
// test-receipt-in-prod.js
const transactionCode = '2ccaaa97-377b-4637-be74-bf7e8f43a673';

// 1. Check status
fetch(`https://app.minisend.xyz/api/pretium/receipt-status/${transactionCode}`)
  .then(r => r.json())
  .then(data => {
    console.log('Status Check:', data);
    if (data.ready && data.receiptNumber) {
      console.log('✅ Receipt is ready with M-Pesa code:', data.receiptNumber);

      // 2. Download receipt
      return fetch(`https://app.minisend.xyz/api/pretium/receipt/${transactionCode}`);
    } else {
      console.log('❌ Receipt not ready');
      throw new Error('Receipt not ready');
    }
  })
  .then(r => r.blob())
  .then(blob => {
    console.log('✅ PDF downloaded, size:', blob.size, 'bytes');
    // Open PDF in browser
    const url = URL.createObjectURL(blob);
    window.open(url);
  })
  .catch(err => console.error('Error:', err));
```

## Production Deployment Checklist

- [x] Code changes made
- [x] Build completed successfully
- [ ] Deployed to production
- [ ] Test transaction completed
- [ ] Webhook received (check logs)
- [ ] Receipt downloaded
- [ ] M-Pesa code visible in PDF
