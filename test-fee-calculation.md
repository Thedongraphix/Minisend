# Fee Calculation Test Cases

## Test Case 1: Small Amount (KES 1,000)

**User Input:**
- Wants recipient to receive: 1000 KES
- Exchange rate: 150 KES/USDC
- Fee: 1% = 10 KES

**Calculation:**
- Total needed: 1000 + 10 = 1010 KES
- USDC to send: 1010 / 150 = 6.73 USDC
- User sends: **6.73 USDC**

**Backend Processing:**
- totalKESFromUSdc = 6.73 * 150 = 1009.5 → rounds to **1010 KES**
- recipientAmount = floor(1010 / 1.01) = floor(1000) = **1000 KES**
- feeAmount = 1010 - 1000 = **10 KES**
- Send to Pretium: `{ amount: "1010", fee: "10" }`

**Result:**
- Recipient receives: **1000 KES** ✅
- Platform fee: **10 KES** ✅

---

## Test Case 2: Larger Amount (KES 10,000)

**User Input:**
- Wants recipient to receive: 10000 KES
- Exchange rate: 150 KES/USDC
- Fee: 1% = 100 KES

**Calculation:**
- Total needed: 10000 + 100 = 10100 KES
- USDC to send: 10100 / 150 = 67.33 USDC
- User sends: **67.33 USDC**

**Backend Processing:**
- totalKESFromUSdc = 67.33 * 150 = 10099.5 → rounds to **10100 KES**
- recipientAmount = floor(10100 / 1.01) = floor(10000) = **10000 KES**
- feeAmount = 10100 - 10000 = **100 KES**
- Send to Pretium: `{ amount: "10100", fee: "100" }`

**Result:**
- Recipient receives: **10000 KES** ✅
- Platform fee: **100 KES** ✅

---

## Test Case 3: Edge Case (KES 1,515)

**User Input:**
- Wants recipient to receive: 1500 KES
- Exchange rate: 150.5 KES/USDC
- Fee: 1% = 15 KES

**Calculation:**
- Total needed: 1500 + 15 = 1515 KES
- USDC to send: 1515 / 150.5 = 10.07 USDC
- User sends: **10.07 USDC** (rounded to 2 decimals)

**Backend Processing:**
- totalKESFromUSdc = 10.07 * 150.5 = 1515.535 → rounds to **1516 KES**
- recipientAmount = floor(1516 / 1.01) = floor(1500.99) = **1500 KES**
- feeAmount = 1516 - 1500 = **16 KES**
- Send to Pretium: `{ amount: "1516", fee: "16" }`

**Result:**
- Recipient receives: **1500 KES** ✅
- Platform fee: **16 KES** (slightly more due to rounding) ✅

---

## Key Formula

```javascript
// User's USDC amount already includes everything
totalKESFromUSdc = Math.round(usdcAmount * exchangeRate)

// Calculate what recipient actually gets (excluding fee)
recipientAmount = Math.floor(totalKESFromUSdc / 1.01)

// Fee is the difference
feeAmount = totalKESFromUSdc - recipientAmount

// Send to Pretium
{
  amount: totalKESFromUSdc,  // Total to process
  fee: feeAmount             // Platform fee
}
```

## Why This Works

Per Pretium docs:
> If user wants to offramp KES 1,000 with 1% fee, deduct equivalent of KES 1,010 from wallet and send `{ amount: 1010, fee: 10 }`

Our implementation:
1. User enters USDC amount in UI (already calculated with fee included)
2. We convert that USDC to total KES
3. We calculate recipient amount by dividing by 1.01
4. Fee is the remainder
5. Pretium processes the total and splits it correctly
