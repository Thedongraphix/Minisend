# Pretium Receipt Usage Examples

## Quick Start

### Example 1: Display Receipt Button After Transaction

```typescript
'use client';

import { DownloadButton } from '@/app/components/DownloadButton';
import { useEffect, useState } from 'react';
import type { OrderData } from '@/lib/types/order';

export function TransactionSuccess({ transactionCode }: { transactionCode: string }) {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch order data from your API
    fetch(`/api/orders/${transactionCode}`)
      .then(res => res.json())
      .then(data => {
        setOrderData(data);
        setLoading(false);
      });
  }, [transactionCode]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!orderData) {
    return <div>Order not found</div>;
  }

  return (
    <div className="space-y-4">
      <h2>Transaction Successful! 🎉</h2>

      {/* M-Pesa Receipt Code */}
      {orderData.pretium_receipt_number && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">M-Pesa Receipt Code</p>
          <p className="text-2xl font-bold text-green-800">
            {orderData.pretium_receipt_number}
          </p>
        </div>
      )}

      {/* Transaction Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">Amount Sent</p>
        <p className="text-xl font-bold">
          {orderData.amount_in_local} {orderData.local_currency}
        </p>
        <p className="text-sm text-gray-500">
          ≈ ${orderData.amount_in_usdc} USDC
        </p>
      </div>

      {/* Download Receipt Button */}
      <DownloadButton
        orderData={orderData}
        variant="primary"
        size="lg"
        className="w-full"
      />
    </div>
  );
}
```

### Example 2: Check Receipt Availability

```typescript
import { isReceiptAvailable, getReceiptData } from '@/lib/pretium/receipt-helpers';

async function checkReceipt(transactionCode: string) {
  // Simple check
  const available = await isReceiptAvailable(transactionCode);
  console.log('Receipt available:', available);

  // Detailed check with data
  const receiptData = await getReceiptData(transactionCode);

  if (receiptData.available) {
    console.log('M-Pesa Code:', receiptData.mpesaCode);
    console.log('Download URL:', receiptData.receiptUrl);
    console.log('Order:', receiptData.order);
  } else {
    console.log('Receipt not ready yet');
  }
}
```

### Example 3: Generate Receipt Programmatically

```typescript
import { generateReceiptForTransaction } from '@/lib/pretium/receipt-helpers';

async function downloadReceipt(transactionCode: string) {
  // Generate PDF blob
  const pdfBlob = await generateReceiptForTransaction(transactionCode);

  if (!pdfBlob) {
    console.error('Failed to generate receipt');
    return;
  }

  // Create download link
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${transactionCode}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
```

### Example 4: Display Receipt Summary

```typescript
import { getReceiptSummary } from '@/lib/pretium/receipt-helpers';

export async function ReceiptCard({ transactionCode }: { transactionCode: string }) {
  const summary = await getReceiptSummary(transactionCode);

  if (!summary) {
    return <div>Receipt not found</div>;
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Receipt</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          summary.status === 'completed'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {summary.status}
        </span>
      </div>

      <div className="space-y-3">
        {/* M-Pesa Code */}
        {summary.mpesaReceiptNumber && (
          <div>
            <p className="text-sm text-gray-600">M-Pesa Code</p>
            <p className="text-lg font-mono font-bold text-green-600">
              {summary.mpesaReceiptNumber}
            </p>
          </div>
        )}

        {/* Amount */}
        <div>
          <p className="text-sm text-gray-600">Amount</p>
          <p className="text-lg font-bold">
            {summary.amount} {summary.currency}
          </p>
        </div>

        {/* Recipient */}
        {summary.recipientName && (
          <div>
            <p className="text-sm text-gray-600">Recipient</p>
            <p className="text-lg">{summary.recipientName}</p>
          </div>
        )}

        {/* Date */}
        <div>
          <p className="text-sm text-gray-600">Date</p>
          <p className="text-lg">
            {new Date(summary.date).toLocaleDateString()}
          </p>
        </div>

        {/* Download Link */}
        {summary.status === 'completed' && (
          <a
            href={summary.downloadUrl}
            download
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg font-medium transition-colors"
          >
            Download PDF Receipt
          </a>
        )}
      </div>
    </div>
  );
}
```

### Example 5: API Route to List User Receipts

```typescript
// app/api/user/receipts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get('wallet');

  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  // Get all orders for this wallet
  const orders = await DatabaseService.getOrdersByWallet(walletAddress);

  // Filter to completed orders with receipts
  const receipts = orders
    .filter(order => order.status === 'completed' && order.pretium_receipt_number)
    .map(order => ({
      transactionCode: order.pretium_transaction_code,
      mpesaCode: order.pretium_receipt_number,
      amount: order.amount_in_local,
      currency: order.local_currency,
      recipientName: order.account_name,
      date: order.created_at,
      downloadUrl: `/api/pretium/receipt/${order.pretium_transaction_code}`,
    }));

  return NextResponse.json({ receipts });
}
```

### Example 6: Transaction History with Receipts

```typescript
'use client';

import { useEffect, useState } from 'react';
import { CompactReceiptButton } from '@/app/components/DownloadButton';
import type { OrderData } from '@/lib/types/order';

export function TransactionHistory({ walletAddress }: { walletAddress: string }) {
  const [transactions, setTransactions] = useState<OrderData[]>([]);

  useEffect(() => {
    fetch(`/api/user/receipts?wallet=${walletAddress}`)
      .then(res => res.json())
      .then(data => setTransactions(data.receipts || []));
  }, [walletAddress]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Transaction History</h2>

      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="border rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium">{tx.account_name}</p>
                <p className="text-sm text-gray-600">
                  {tx.amount_in_local} {tx.local_currency}
                </p>
                {tx.pretium_receipt_number && (
                  <p className="text-xs text-green-600 font-mono">
                    M-Pesa: {tx.pretium_receipt_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {new Date(tx.created_at).toLocaleDateString()}
            </span>
            <CompactReceiptButton orderData={tx} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Example 7: Send Receipt via Email (Future Feature)

```typescript
// app/api/pretium/receipt/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateReceiptForTransaction } from '@/lib/pretium/receipt-helpers';
import { sendEmail } from '@/lib/email'; // Your email service

export async function POST(request: NextRequest) {
  const { transactionCode, email } = await request.json();

  // Generate receipt
  const pdfBlob = await generateReceiptForTransaction(transactionCode);

  if (!pdfBlob) {
    return NextResponse.json(
      { error: 'Receipt not available' },
      { status: 400 }
    );
  }

  // Convert to buffer for email attachment
  const buffer = Buffer.from(await pdfBlob.arrayBuffer());

  // Send email with attachment
  await sendEmail({
    to: email,
    subject: 'Your Minisend Transaction Receipt',
    text: 'Please find your transaction receipt attached.',
    attachments: [{
      filename: `receipt-${transactionCode}.pdf`,
      content: buffer,
      contentType: 'application/pdf'
    }]
  });

  return NextResponse.json({ success: true });
}
```

## Testing Examples

### Test Webhook → Receipt Flow

```bash
# 1. Send test webhook
curl -X POST http://localhost:3000/api/pretium/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETE",
    "transaction_code": "test-tx-123",
    "receipt_number": "TKT12345XY",
    "public_name": "Test User",
    "message": "Transaction processed successfully."
  }'

# 2. Download receipt
curl http://localhost:3000/api/pretium/receipt/test-tx-123 \
  --output test-receipt.pdf

# 3. Open PDF
open test-receipt.pdf  # macOS
xdg-open test-receipt.pdf  # Linux
start test-receipt.pdf  # Windows
```

### Test with Real Transaction

```typescript
// In your component or test file
import { getReceiptSummary } from '@/lib/pretium/receipt-helpers';

// Replace with actual transaction code from your database
const realTransactionCode = 'e25dac82-74e4-4278-a4b2-714b59638f74';

const summary = await getReceiptSummary(realTransactionCode);
console.log('Receipt Summary:', summary);

// Should output:
// {
//   transactionCode: "e25dac82-74e4-4278-a4b2-714b59638f74",
//   mpesaReceiptNumber: "TL6AT0AJ0Y",
//   recipientName: "Christopher Nyojwang Oketch",
//   amount: 1000,
//   currency: "KES",
//   date: "2025-12-06T20:06:27Z",
//   status: "completed",
//   downloadUrl: "/api/pretium/receipt/e25dac82-..."
// }
```

## Common Patterns

### Pattern 1: Conditional Receipt Display

Only show receipt button when available:

```typescript
{orderData.status === 'completed' && orderData.pretium_receipt_number && (
  <DownloadButton orderData={orderData} />
)}
```

### Pattern 2: Loading State While Checking

```typescript
const [receiptAvailable, setReceiptAvailable] = useState<boolean | null>(null);

useEffect(() => {
  isReceiptAvailable(transactionCode).then(setReceiptAvailable);
}, [transactionCode]);

if (receiptAvailable === null) return <Spinner />;
if (!receiptAvailable) return <p>Receipt not available</p>;
return <DownloadButton orderData={orderData} />;
```

### Pattern 3: Retry Receipt Generation

```typescript
async function retryReceipt(transactionCode: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const blob = await generateReceiptForTransaction(transactionCode);
      if (blob) return blob;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return null;
}
```

## Best Practices

1. **Always check receipt availability** before showing download button
2. **Display M-Pesa code prominently** - users need it for verification
3. **Handle loading states** - PDF generation takes 1-2 seconds
4. **Show error messages** - network failures, missing data, etc.
5. **Use compact button** in space-constrained layouts
6. **Cache receipt URLs** - they don't change after generation
7. **Log analytics** - track receipt downloads for insights

## Related Documentation

- [Pretium Receipts Overview](../pretium-receipts.md)
- [Receipt Generator API](../../lib/receipt-generator.ts)
- [Download Button Component](../../app/components/DownloadButton.tsx)
