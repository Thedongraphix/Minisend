# Database Integration Issues Found

## 🚨 Issues in Production

### 1. **Institution Code Not Saved** 
- **Problem**: `institution_code` field is `null` in database
- **Expected**: Should be `SAFAKEPC` (from API code) or `M-PESA` (from Paycrest response)
- **Fix**: Map `recipient.institution` correctly in `createOrderFromPaycrest`

### 2. **Incorrect Local Amount**
- **Problem**: Storing USDC amount instead of KES amount  
- **Example**: 5 USDC → 5 KES (should be 5 × 128.07 = 640.35 KES)
- **Fix**: Calculate `amount_in_local = amount_in_usdc × rate`

### 3. **Missing Rate Persistence**
- **Problem**: Rate is calculated but not always properly stored
- **Fix**: Ensure rate from `/rates` endpoint is used consistently

## 🔧 Production Code Fixes Needed

### Fix 1: Update Order Creation Logic
```typescript
// In app/api/paycrest/orders/simple/route.ts
const dbOrder = await DatabaseService.createOrderFromPaycrest(order, {
  amount: amountNum.toString(),
  phoneNumber: formattedPhone,
  accountName,
  currency,
  returnAddress,
  rate: exchangeRate,
  provider: detectedCarrier === 'SAFARICOM' ? 'MPESA' : 'AIRTEL',
  // ADD: Calculate correct local amount
  localAmount: (amountNum * exchangeRate).toString()
})
```

### Fix 2: Update DatabaseService.createOrderFromPaycrest
```typescript
// In lib/supabase/config.ts - createOrderFromPaycrest method
const orderData = {
  // ... existing fields ...
  amount_in_local: parseFloat(requestData.localAmount || (parseFloat(requestData.amount) * parseFloat(String(requestData.rate || 0)))),
  institution_code: order.recipient?.institution || (requestData.currency === 'KES' ? 'SAFAKEPC' : 'GTBINGLA'),
  // ... rest of fields ...
}
```

### Fix 3: Map Institution Correctly
```typescript
// Map Paycrest institution names to codes
const institutionMapping = {
  'M-PESA': 'SAFAKEPC',
  'GTB': 'GTBINGLA',
  'Guaranty Trust Bank': 'GTBINGLA'
}
```

## 🧪 Test Results Summary

### ✅ Working:
- Database connection and health ✓
- Order creation API endpoint ✓  
- Status checking API endpoint ✓
- Database record creation ✓
- Status updates ✓
- EAT timezone ✓

### ❌ Issues:
- Institution code not mapped correctly
- Local amount calculation incorrect  
- Rate persistence inconsistent

## 📊 Current Database State

```
Recent Orders:
1. 39c5012e-55c0-42a8-9439-c9aabcb8fcce - $5 USDC → 5 KES (❌ should be 640.35 KES)
2. af95c7dc-a4b2-48de-ba86-417117941e37 - $20 USDC → 20 KES (❌ should be 2,561.8 KES)  
3. test_1754475646618 - $10 USDC → 1300 KES (✅ correct from simulation)
```

## 🚀 Next Steps

1. **Deploy the fixes** to production
2. **Test with a new order** to verify fixes work
3. **Update existing records** if needed (optional)
4. **Monitor** future orders for correct data recording

The database integration is fundamentally working - we just need to fix the data mapping logic.