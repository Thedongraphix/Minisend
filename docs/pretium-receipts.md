# Pretium Receipt Generation System

## Overview

Minisend automatically generates professional PDF receipts for all completed Pretium transactions. Receipts include M-Pesa receipt codes, transaction details, and QR codes for blockchain verification.

## How It Works

### 1. Webhook Processing

When Pretium completes a transaction, they send a webhook to `/api/pretium/webhook` with:

```json
{
  "status": "COMPLETE",
  "transaction_code": "e25dac82-74e4-4278-a4b2-714b59638f74",
  "receipt_number": "TL6AT0AJ0Y",
  "public_name": "Christopher Nyojwang Oketch",
  "message": "Transaction processed successfully."
}
```

The webhook handler:
1. Updates order status to `completed`
2. Stores `receipt_number` (M-Pesa code) in `pretium_receipt_number` field
3. Stores `public_name` in `account_name` field
4. Logs analytics event `pretium_receipt_ready`
5. Sends Farcaster notification if FID exists

### 2. Receipt Data Storage

Receipt data is stored in the `orders` table with these key fields:

- `pretium_transaction_code` - Pretium internal transaction ID
- `pretium_receipt_number` - M-Pesa receipt code (e.g., "TL6AT0AJ0Y")
- `account_name` - Recipient's public name
- `amount_in_local` - Amount in KES
- `amount_in_usdc` - Amount in USDC
- `sender_fee` - Platform fee
- `transaction_hash` - Blockchain transaction hash
- `created_at` - Transaction timestamp

### 3. Receipt Generation

#### API Endpoint

**GET** `/api/pretium/receipt/{transactionCode}`

Generates and downloads a PDF receipt for a completed transaction.

**Example:**
```bash
GET /api/pretium/receipt/e25dac82-74e4-4278-a4b2-714b59638f74
```

**Response:**
- `200 OK` - PDF file (application/pdf)
- `400 Bad Request` - Transaction not completed
- `404 Not Found` - Transaction not found
- `500 Internal Server Error` - Generation failed

**Response Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="minisend-receipt-{transactionCode}.pdf"
Cache-Control: public, max-age=31536000, immutable
```

#### Programmatic Usage

```typescript
import { generateReceiptForTransaction, getReceiptSummary } from '@/lib/pretium/receipt-helpers';

// Check if receipt is available
const summary = await getReceiptSummary(transactionCode);
if (summary?.status === 'completed') {
  // Generate receipt PDF
  const pdfBlob = await generateReceiptForTransaction(transactionCode);

  // Or get receipt URL
  const receiptUrl = `/api/pretium/receipt/${transactionCode}`;
}
```

#### Helper Functions

**`isReceiptAvailable(transactionCode)`**
- Returns `true` if receipt can be generated
- Checks if order exists, is completed, and has M-Pesa receipt number

**`getReceiptData(transactionCode)`**
- Returns receipt availability, order data, receipt URL, and M-Pesa code
- Example response:
  ```typescript
  {
    available: true,
    order: { /* full order object */ },
    receiptUrl: "/api/pretium/receipt/xyz",
    mpesaCode: "TL6AT0AJ0Y"
  }
  ```

**`getReceiptSummary(transactionCode)`**
- Returns formatted receipt summary for display
- Example response:
  ```typescript
  {
    transactionCode: "e25dac82-...",
    mpesaReceiptNumber: "TL6AT0AJ0Y",
    recipientName: "Christopher Nyojwang Oketch",
    amount: 1000,
    currency: "KES",
    date: "2025-12-06T20:06:27Z",
    status: "completed",
    downloadUrl: "/api/pretium/receipt/e25dac82-..."
  }
  ```

**`orderToReceiptData(order)`**
- Converts database Order to OrderData format for PDF generation

### 4. Receipt Design

Receipts include:

#### Header Section
- Minisend logo and branding
- Receipt number (e.g., "MSR12345678")
- Transaction date
- "RECEIPT" heading

#### Amount Card
- **Amount Sent:** Local currency amount (highlighted)
- **Recipient:** Name and phone number
- USDC equivalent shown below amount

#### Transaction Details
- Exchange rate (1 USDC = X KES)
- Network (Base Network)
- Token (USD Coin - USDC)
- From wallet address (truncated)
- Transaction fee
- **M-Pesa Code** (highlighted in green, e.g., "TL6AT0AJ0Y")

#### Support Section
- Email: support@minisend.xyz
- Website: app.minisend.xyz/support

#### Footer with QR Code
- QR code linking to blockchain transaction on BaseScan
- Transaction hash (truncated)
- "✓ ON-CHAIN" badge
- Network confirmation

#### Design Tokens
- **Primary Color:** Farcaster Purple (#7C65C1)
- **Secondary Color:** Base Blue (#0052FF)
- **Success Color:** Green (#22C55E) - for M-Pesa code
- **Typography:** Helvetica
- **Format:** A4 PDF

## Receipt Display in UI

### Using the DownloadButton Component

```typescript
import { DownloadButton } from '@/app/components/DownloadButton';

// In your component
<DownloadButton
  orderData={orderData}
  variant="primary"
  size="lg"
  className="w-full"
/>
```

**Props:**
- `orderData` - Order data object (must include `pretium_receipt_number`)
- `variant` - "primary" | "secondary" | "minimal"
- `size` - "sm" | "md" | "lg"
- `className` - Additional CSS classes

**Features:**
- Automatic PDF generation on click
- Loading state with spinner
- Error handling with user-friendly messages
- Farcaster Mini App support (Web Share API)
- Standard browser download fallback

### Compact Receipt Button

```typescript
import { CompactReceiptButton } from '@/app/components/DownloadButton';

<CompactReceiptButton orderData={orderData} />
```

Smaller icon-only button for compact layouts.

## Implementation Checklist

### Backend Setup ✓
- [x] Database schema with `pretium_receipt_number` field
- [x] Webhook handler stores receipt data
- [x] Receipt API endpoint (`/api/pretium/receipt/[transactionCode]`)
- [x] Receipt helper functions

### Receipt Generation ✓
- [x] PDF generator with M-Pesa code support
- [x] Receipt data mapping from Order to OrderData
- [x] QR code generation for blockchain verification
- [x] Professional branding and design

### Frontend Integration
- [x] DownloadButton component
- [ ] Display receipt button on transaction success
- [ ] Show M-Pesa code in transaction details
- [ ] Link to receipt from transaction history

### Analytics ✓
- [x] Log `pretium_receipt_ready` event when webhook received
- [x] Log `pretium_receipt_generated` event when PDF created

## Testing Receipt Generation

### 1. Test with Sample Webhook Data

```bash
curl -X POST http://localhost:3000/api/pretium/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETE",
    "transaction_code": "test-123",
    "receipt_number": "TKT23BLSNK",
    "public_name": "Test User",
    "message": "Transaction processed successfully."
  }'
```

### 2. Generate Receipt via API

```bash
curl http://localhost:3000/api/pretium/receipt/test-123 \
  --output receipt.pdf
```

### 3. Check Receipt Data

```typescript
import { getReceiptSummary } from '@/lib/pretium/receipt-helpers';

const summary = await getReceiptSummary('test-123');
console.log(summary);
```

## Database Queries

### Get all orders with receipts
```sql
SELECT
  pretium_transaction_code,
  pretium_receipt_number,
  account_name,
  amount_in_local,
  local_currency,
  status,
  created_at
FROM orders
WHERE pretium_receipt_number IS NOT NULL
  AND status = 'completed'
ORDER BY created_at DESC;
```

### Get receipt analytics
```sql
SELECT
  COUNT(*) as total_receipts,
  COUNT(DISTINCT wallet_address) as unique_users,
  SUM(amount_in_local) as total_kes,
  AVG(amount_in_local) as avg_kes
FROM orders
WHERE pretium_receipt_number IS NOT NULL
  AND status = 'completed'
  AND payment_provider = 'PRETIUM_KES';
```

### Find orders missing receipts
```sql
SELECT
  pretium_transaction_code,
  status,
  created_at
FROM orders
WHERE payment_provider = 'PRETIUM_KES'
  AND status = 'completed'
  AND pretium_receipt_number IS NULL
ORDER BY created_at DESC;
```

## Troubleshooting

### Receipt Not Available

**Problem:** API returns "Receipt not available"

**Possible Causes:**
1. Transaction not completed yet (status = 'pending')
2. M-Pesa receipt number not received from Pretium webhook
3. Transaction failed

**Solution:**
```typescript
const { available, order } = await getReceiptData(transactionCode);
console.log('Status:', order?.status);
console.log('Receipt Number:', order?.pretium_receipt_number);
```

### PDF Generation Fails

**Problem:** API returns 500 error

**Possible Causes:**
1. Missing order data (null values in required fields)
2. Invalid transaction hash
3. Image loading failure (logo)

**Solution:**
Check server logs for detailed error:
```bash
# Look for "Receipt generation error" in logs
```

### M-Pesa Code Not Showing

**Problem:** Receipt PDF doesn't show M-Pesa code

**Possible Causes:**
1. `pretium_receipt_number` is NULL in database
2. Webhook not received or failed to process

**Solution:**
```sql
SELECT pretium_receipt_number FROM orders
WHERE pretium_transaction_code = 'your-code-here';
```

## Future Enhancements

### Planned Features
- [ ] Email receipt delivery
- [ ] SMS receipt notification with M-Pesa code
- [ ] Receipt archive/history page
- [ ] Bulk receipt download (CSV export)
- [ ] Receipt branding customization
- [ ] Multi-language support

### Integration Ideas
- [ ] Auto-attach receipts to Farcaster notifications
- [ ] Store receipts in IPFS for permanent archive
- [ ] Generate receipt NFTs for on-chain verification
- [ ] WhatsApp receipt delivery

## Support

For issues with receipt generation:
1. Check transaction status in database
2. Verify webhook logs for receipt_number
3. Test API endpoint directly
4. Review server logs for errors
5. Contact support@minisend.xyz

## Related Files

- `/app/api/pretium/webhook/route.ts` - Webhook handler
- `/app/api/pretium/receipt/[transactionCode]/route.ts` - Receipt API
- `/lib/pretium/receipt-helpers.ts` - Helper functions
- `/lib/receipt-generator.ts` - PDF generation
- `/lib/types/receipt.ts` - Receipt type definitions
- `/app/components/DownloadButton.tsx` - UI component
