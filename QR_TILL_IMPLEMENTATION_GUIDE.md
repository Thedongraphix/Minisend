# QR Code & Till Number Payment Implementation Guide

## Overview

This guide extends the existing Minisend PayCrest integration to support:
1. **QR Code Generation** - Generate M-Pesa QR codes for payments
2. **Till Number Payments** - Support till numbers alongside phone numbers

## Current Architecture Analysis

### Existing PayCrest Flow
```
User Input → PayCrest Order Creation → USDC Transfer → Status Polling → KES Delivery
```

### Integration Points
- `app/components/SimpleUSDCPayment.tsx` - Main payment component
- `app/api/paycrest/orders/simple/route.ts` - Order creation API
- `app/api/paycrest/status/[orderId]/route.ts` - Status polling
- `lib/utils/phoneCarrier.ts` - Carrier detection utilities

## Implementation Plan

### Phase 1: Till Number Support (1-2 days)
Extend existing payment forms to accept till numbers as payment destinations.

### Phase 2: QR Code Generation (2-3 days)  
Add QR code generation for M-Pesa payments using existing order data.

---

## Phase 1: Till Number Implementation

### 1.1 Update Payment Interface

**File: `app/components/SimpleUSDCPayment.tsx`**

Extend the existing interface to support till numbers:

```typescript
interface SimpleUSDCPaymentProps {
  amount: string;
  phoneNumber?: string;
  tillNumber?: string; // NEW: Add till number support
  accountNumber?: string;
  bankCode?: string;
  accountName: string;
  currency: 'KES' | 'NGN';
  returnAddress: string;
  rate?: number | null;
  onSuccess: () => void;
  onError: (error: string) => void;
}
```

### 1.2 Update PayCrest API Integration

**File: `app/api/paycrest/orders/simple/route.ts`**

Modify the order creation to handle till numbers:

```typescript
// Add to existing request body interface
const { 
  amount, 
  phoneNumber, 
  tillNumber, // NEW
  accountNumber,
  bankCode,
  accountName, 
  currency,
  returnAddress,
  rate
} = body;

// Update validation logic
if (currency === 'KES' && !phoneNumber && !tillNumber) {
  return NextResponse.json(
    { error: 'Phone number or till number is required for KES transactions' },
    { status: 400 }
  );
}

// Update identifier formatting
let formattedIdentifier: string;
let institution: string;

if (currency === 'KES') {
  if (tillNumber) {
    // Till number formatting - use as provided
    formattedIdentifier = tillNumber;
    institution = 'TILLNO'; // PayCrest institution code for till numbers
  } else {
    // Existing phone number logic
    const cleanPhone = phoneNumber!.replace(/\D/g, '');
    formattedIdentifier = cleanPhone.startsWith('254') ? cleanPhone : cleanPhone.replace(/^0/, '254');
    institution = 'SAFAKEPC'; // M-PESA provider ID
  }
}
```

### 1.3 Add Till Number Validation Utility

**File: `lib/utils/tillValidator.ts`** (NEW FILE)

```typescript
/**
 * Validates M-Pesa till numbers
 * Till numbers are typically 5-7 digits
 */
export function validateTillNumber(tillNumber: string): boolean {
  // Remove any non-digits
  const cleanTill = tillNumber.replace(/\D/g, '');
  
  // Check if it's 5-7 digits
  if (cleanTill.length < 5 || cleanTill.length > 7) {
    return false;
  }
  
  // Check if all digits
  return /^\d+$/.test(cleanTill);
}

/**
 * Formats till number for PayCrest API
 */
export function formatTillNumber(tillNumber: string): string {
  return tillNumber.replace(/\D/g, '');
}

/**
 * Detects if input is phone number or till number
 */
export function detectPaymentType(input: string): 'phone' | 'till' | 'unknown' {
  const cleanInput = input.replace(/\D/g, '');
  
  // Phone numbers are typically 9-12 digits (including country code)
  if (cleanInput.length >= 9 && (cleanInput.startsWith('254') || cleanInput.startsWith('0'))) {
    return 'phone';
  }
  
  // Till numbers are typically 5-7 digits
  if (cleanInput.length >= 5 && cleanInput.length <= 7) {
    return 'till';
  }
  
  return 'unknown';
}
```

### 1.4 Update Payment Form UI

**File: `app/components/PaymentMethodSelector.tsx`** (NEW FILE)

```typescript
"use client";

import { useState } from 'react';
import { validateTillNumber, detectPaymentType } from '@/lib/utils/tillValidator';

interface PaymentMethodSelectorProps {
  currency: 'KES' | 'NGN';
  onPaymentMethodChange: (method: { type: 'phone' | 'till'; value: string }) => void;
  className?: string;
}

export function PaymentMethodSelector({ 
  currency, 
  onPaymentMethodChange, 
  className = '' 
}: PaymentMethodSelectorProps) {
  const [paymentInput, setPaymentInput] = useState('');
  const [detectedType, setDetectedType] = useState<'phone' | 'till' | 'unknown'>('unknown');

  const handleInputChange = (value: string) => {
    setPaymentInput(value);
    const type = detectPaymentType(value);
    setDetectedType(type);
    
    if (type !== 'unknown') {
      onPaymentMethodChange({ type, value });
    }
  };

  if (currency !== 'KES') {
    return null; // Only show for KES payments
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Phone Number or Till Number
        </label>
        <input
          type="text"
          value={paymentInput}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Enter phone number (254...) or till number (12345)"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        {/* Payment type indicator */}
        {detectedType !== 'unknown' && (
          <div className="mt-2 flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${detectedType === 'phone' ? 'bg-green-400' : 'bg-blue-400'}`}></div>
            <span className="text-xs text-gray-400">
              Detected: {detectedType === 'phone' ? 'M-Pesa Phone Number' : 'M-Pesa Till Number'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 2: QR Code Generation

### 2.1 Install QR Code Library

```bash
npm install qrcode @types/qrcode
```

### 2.2 Create QR Code Utility

**File: `lib/utils/qrGenerator.ts`** (NEW FILE)

```typescript
import QRCode from 'qrcode';

interface MPesaQRData {
  type: 'buygoods' | 'paybill' | 'sendmoney';
  businessNumber: string; // Till number or paybill number
  amount?: string;
  accountReference?: string;
  businessName?: string;
}

/**
 * Generates M-Pesa QR code data string
 * Based on M-Pesa QR code format specifications
 */
export function generateMPesaQRString(data: MPesaQRData): string {
  const { type, businessNumber, amount, accountReference, businessName } = data;
  
  let qrString = '';
  
  switch (type) {
    case 'buygoods':
      // Format: BG:businessNumber:amount:businessName
      qrString = `BG:${businessNumber}`;
      if (amount) qrString += `:${amount}`;
      if (businessName) qrString += `:${businessName}`;
      break;
      
    case 'paybill':
      // Format: PB:businessNumber:accountReference:amount:businessName
      qrString = `PB:${businessNumber}`;
      if (accountReference) qrString += `:${accountReference}`;
      if (amount) qrString += `:${amount}`;
      if (businessName) qrString += `:${businessName}`;
      break;
      
    case 'sendmoney':
      // Format: SM:phoneNumber:amount:businessName
      qrString = `SM:${businessNumber}`;
      if (amount) qrString += `:${amount}`;
      if (businessName) qrString += `:${businessName}`;
      break;
  }
  
  return qrString;
}

/**
 * Generates QR code image as base64 data URL
 */
export async function generateQRCodeImage(
  data: MPesaQRData,
  options?: {
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }
): Promise<string> {
  const qrString = generateMPesaQRString(data);
  
  const qrOptions = {
    width: options?.width || 256,
    margin: options?.margin || 2,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#FFFFFF'
    }
  };
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrString, qrOptions);
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generates QR code for PayCrest order
 */
export async function generatePaymentQRCode(orderData: {
  phoneNumber?: string;
  tillNumber?: string;
  amount: string;
  accountName: string;
  currency: string;
}): Promise<string | null> {
  const { phoneNumber, tillNumber, amount, accountName, currency } = orderData;
  
  if (currency !== 'KES') {
    return null; // Only generate QR codes for KES payments
  }
  
  let qrData: MPesaQRData;
  
  if (tillNumber) {
    qrData = {
      type: 'buygoods',
      businessNumber: tillNumber,
      amount: amount,
      businessName: accountName
    };
  } else if (phoneNumber) {
    qrData = {
      type: 'sendmoney',
      businessNumber: phoneNumber,
      amount: amount,
      businessName: accountName
    };
  } else {
    return null;
  }
  
  return await generateQRCodeImage(qrData);
}
```

### 2.3 Create QR Code Display Component

**File: `app/components/PaymentQRCode.tsx`** (NEW FILE)

```typescript
"use client";

import { useState, useEffect } from 'react';
import { generatePaymentQRCode } from '@/lib/utils/qrGenerator';

interface PaymentQRCodeProps {
  phoneNumber?: string;
  tillNumber?: string;
  amount: string;
  accountName: string;
  currency: string;
  className?: string;
}

export function PaymentQRCode({
  phoneNumber,
  tillNumber,
  amount,
  accountName,
  currency,
  className = ''
}: PaymentQRCodeProps) {
  const [qrCodeImage, setQRCodeImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateQR = async () => {
      if (currency !== 'KES' || (!phoneNumber && !tillNumber)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const qrCode = await generatePaymentQRCode({
          phoneNumber,
          tillNumber,
          amount,
          accountName,
          currency
        });
        
        setQRCodeImage(qrCode);
      } catch (err) {
        console.error('Error generating QR code:', err);
        setError('Failed to generate QR code');
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, [phoneNumber, tillNumber, amount, accountName, currency]);

  if (currency !== 'KES') {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-blue-400 mx-auto"></div>
        <p className="text-gray-400 text-sm mt-2">Generating QR code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center ${className}`}>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!qrCodeImage) {
    return null;
  }

  return (
    <div className={`text-center space-y-4 ${className}`}>
      <div className="bg-white p-4 rounded-lg inline-block">
        <img 
          src={qrCodeImage} 
          alt="M-Pesa Payment QR Code" 
          className="w-48 h-48 mx-auto"
        />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-white font-semibold">Scan to Pay with M-Pesa</h3>
        <p className="text-gray-300 text-sm">
          Open M-Pesa app → Scan QR → Confirm payment
        </p>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="text-xs text-blue-300 space-y-1">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>KES {amount}</span>
            </div>
            <div className="flex justify-between">
              <span>To:</span>
              <span>{tillNumber ? `Till ${tillNumber}` : phoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Recipient:</span>
              <span>{accountName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2.4 Add QR Code API Endpoint

**File: `app/api/qr/generate/route.ts`** (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generatePaymentQRCode } from '@/lib/utils/qrGenerator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, tillNumber, amount, accountName, currency } = body;

    // Validate required fields
    if (!amount || !accountName || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, accountName, currency' },
        { status: 400 }
      );
    }

    if (currency === 'KES' && !phoneNumber && !tillNumber) {
      return NextResponse.json(
        { error: 'Phone number or till number is required for KES QR codes' },
        { status: 400 }
      );
    }

    const qrCodeImage = await generatePaymentQRCode({
      phoneNumber,
      tillNumber,
      amount,
      accountName,
      currency
    });

    if (!qrCodeImage) {
      return NextResponse.json(
        { error: 'Unable to generate QR code for this payment method' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      qrCode: qrCodeImage,
      paymentDetails: {
        phoneNumber,
        tillNumber,
        amount,
        accountName,
        currency
      }
    });

  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
```

---

## Integration with Existing Components

### 3.1 Update SimpleUSDCPayment Component

**File: `app/components/SimpleUSDCPayment.tsx`**

Add QR code display to the existing payment flow:

```typescript
// Add import
import { PaymentQRCode } from './PaymentQRCode';

// Add to the component JSX, in the "Ready to Pay" section:
{status === 'ready-to-pay' && paycrestOrder && (
  <div className="space-y-4">
    {/* Existing payment UI */}
    
    {/* NEW: Add QR code section */}
    <div className="border-t border-gray-600 pt-4">
      <PaymentQRCode
        phoneNumber={phoneNumber}
        tillNumber={tillNumber} // Add this prop
        amount={localAmount?.toString() || amount}
        accountName={accountName}
        currency={currency}
        className="mt-4"
      />
      
      <div className="text-center mt-4">
        <p className="text-gray-400 text-sm">
          Alternative: Scan QR code with M-Pesa app for direct payment
        </p>
      </div>
    </div>
    
    {/* Continue with existing Transaction component */}
  </div>
)}
```

### 3.2 Update Main Payment Flow

**File: `app/page.tsx` or main payment component**

Integrate the payment method selector:

```typescript
// Add imports
import { PaymentMethodSelector } from '@/app/components/PaymentMethodSelector';

// Add state for payment method
const [paymentMethod, setPaymentMethod] = useState<{
  type: 'phone' | 'till';
  value: string;
} | null>(null);

// Update form JSX
<PaymentMethodSelector
  currency={currency}
  onPaymentMethodChange={setPaymentMethod}
  className="mb-4"
/>

// Pass to payment component
<SimpleUSDCPayment
  amount={amount}
  phoneNumber={paymentMethod?.type === 'phone' ? paymentMethod.value : undefined}
  tillNumber={paymentMethod?.type === 'till' ? paymentMethod.value : undefined}
  accountName={accountName}
  currency={currency}
  returnAddress={address}
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

---

## Testing Guide

### Test Till Numbers
Use these test till numbers for development:
- `12345` - Standard test till
- `67890` - Alternative test till

### Test QR Code Generation

```bash
# Test QR generation API
curl -X POST http://localhost:3000/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{
    "tillNumber": "12345",
    "amount": "100",
    "accountName": "Test Merchant",
    "currency": "KES"
  }'
```

### Verify M-Pesa QR Format
Generated QR codes should contain strings like:
- `BG:12345:100:Test Merchant` (for till numbers)
- `SM:254712345678:100:Test User` (for phone numbers)

---

## Database Updates (Optional)

If you want to track QR code usage, add to your existing database schema:

```sql
-- Add to existing orders table
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(10) CHECK (payment_method IN ('phone', 'till'));
ALTER TABLE orders ADD COLUMN qr_code_generated BOOLEAN DEFAULT FALSE;

-- Add QR analytics table
CREATE TABLE qr_analytics (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    qr_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_method VARCHAR(10),
    destination_number VARCHAR(20),
    amount_local DECIMAL(15,2)
);
```

---

## Deployment Checklist

### Environment Variables
No new environment variables needed - uses existing PayCrest configuration.

### Dependencies
```bash
npm install qrcode @types/qrcode
```

### File Structure
```
├── app/
│   ├── api/
│   │   └── qr/
│   │       └── generate/
│   │           └── route.ts (NEW)
│   └── components/
│       ├── PaymentMethodSelector.tsx (NEW)
│       ├── PaymentQRCode.tsx (NEW)
│       └── SimpleUSDCPayment.tsx (UPDATED)
├── lib/
│   └── utils/
│       ├── qrGenerator.ts (NEW)
│       └── tillValidator.ts (NEW)
└── QR_TILL_IMPLEMENTATION_GUIDE.md (THIS FILE)
```

### Rollout Strategy
1. **Phase 1**: Deploy till number support first
2. **Test**: Verify till payments work with existing PayCrest flow
3. **Phase 2**: Add QR code generation
4. **Test**: Verify QR codes generate correctly and scan properly
5. **Launch**: Enable features for users

---

## Troubleshooting

### Common Issues

**QR Code Not Generating**
- Check if `qrcode` library is installed
- Verify payment method detection logic
- Check browser console for errors

**Till Numbers Not Working**
- Verify PayCrest API accepts till numbers
- Check institution code mapping
- Test with known working till numbers

**Invalid QR Format**
- Ensure QR string follows M-Pesa format
- Test QR codes with actual M-Pesa app
- Verify data encoding

### Debug Mode
Enable detailed logging by adding to your environment:
```
NODE_ENV=development
```

---

## Future Enhancements

### Short Term (1-2 weeks)
- [ ] QR code sharing via WhatsApp/social media
- [ ] Save frequently used till numbers
- [ ] QR code expiration handling

### Medium Term (1-2 months)
- [ ] Bulk QR code generation for merchants
- [ ] QR code analytics dashboard
- [ ] Integration with other payment providers

### Long Term (3+ months)
- [ ] Smart contract integration for automated QR generation
- [ ] Multi-currency QR support
- [ ] Advanced QR customization options

This implementation maintains compatibility with your existing PayCrest integration while adding powerful QR code and till number capabilities that will significantly improve the user experience for Kenyan creators and businesses.