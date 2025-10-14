# Paymaster Testing Guide

## Overview
This guide walks through CDP Paymaster gasless transactions for Minisend.

## ⚠️ CRITICAL: Smart Wallet Requirement

**Paymaster ONLY works with Smart Wallets (ERC-4337), NOT regular EOA wallets!**

**Compatible Wallets** (Gasless ✅):
- ✅ **Coinbase Smart Wallet** (Recommended - built into Coinbase Wallet)
- ✅ Other ERC-4337 compliant Smart Wallets

**Incompatible Wallets** (Will show gas fees ❌):
- ❌ **MetaMask** (EOA wallet - gas fees will appear)
- ❌ Rainbow Wallet, Trust Wallet, or any standard EOA wallet
- ❌ These wallets WILL show gas fees - this is expected and cannot be avoided

**Why?** Only Smart Wallets support ERC-4337 account abstraction, which enables paymaster sponsorship.

## Configuration Completed

### 1. Environment Variables Added
Added to `.env`:
```bash
NEXT_PUBLIC_PAYMASTER_RPC_URL=https://api.developer.coinbase.com/rpc/v1/base/Txp2FJyUa9zCucjPFPqWHc0oeHmStFuo
NEXT_PUBLIC_PAYMASTER_ENABLED=true
NEXT_PUBLIC_PAYMASTER_NETWORK=mainnet
```

### 2. CDP Dashboard Configuration Required
Verify these settings at https://portal.cdp.coinbase.com/products/bundler-and-paymaster:

- **Network**: Base Mainnet selected
- **Paymaster**: Enabled (toggle ON)
- **Allowlisted Contract**:
  - Address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
  - Function: `transfer(address,uint256)`
- **Per User Limits**: Set according to your budget (e.g., $5 per user per month)
- **Global Limit**: Set according to your budget (e.g., $500 total per month)

## Testing in Production

### How It Works in Minisend

The paymaster is now integrated into the main Minisend transaction flow via `TransactionHandler.tsx` with `isSponsored={true}`.

**For Smart Wallet users** (Coinbase Smart Wallet):
- Complete normal USDC → KES/NGN flow
- NO gas fees shown in wallet approval
- Seamless, gasless experience

**For EOA wallet users** (MetaMask, etc.):
- Complete normal USDC → KES/NGN flow
- Gas fees (~$0.015) WILL appear - this is expected
- Paymaster cannot sponsor EOA transactions

### Testing Steps

#### Prerequisites
- **Coinbase Smart Wallet** with USDC on Base mainnet (for gasless testing)
- OR MetaMask with USDC + ETH (will show gas fees)

#### Step-by-Step Testing
1. **Connect Smart Wallet**
   - Use Coinbase Wallet (not MetaMask) for gasless experience
   - Select your wallet provider
   - Approve the connection

2. **Complete Off-Ramp Transaction**
   - Go to Minisend main page
   - Enter KES or NGN details (phone number or bank account)
   - Enter USDC amount
   - Click to initiate payment

3. **Approve Transaction**
   - **With Coinbase Smart Wallet**: NO gas fee shown ✅
   - **With MetaMask**: Gas fee (~$0.015) will appear ❌
   - Approve the transaction

4. **Verify Success**
   - Transaction completes successfully
   - Off-ramp processes normally
   - Recipient receives KES/NGN

5. **Check CDP Dashboard**
   - Go to https://portal.cdp.coinbase.com/products/bundler-and-paymaster
   - Navigate to "Analytics" or "Usage" tab
   - **For Smart Wallet transactions**, you should see:
     - Total sponsored amount (in USD)
     - Number of user operations
     - Per-user spending breakdown
     - Transaction history
   - **For EOA/MetaMask transactions**: No metrics (user paid gas)

## Expected Results

### Successful Test
- ✅ Transaction completes without wallet charging gas fees
- ✅ Transaction appears on BaseScan
- ✅ CDP Dashboard shows the sponsored transaction
- ✅ Logs show successful paymaster sponsorship

### Common Issues

#### Issue: "Request denied - rejected due to maximum per address transaction count reached"
**Solution**: Increase per-user limits in CDP Dashboard Configuration

#### Issue: "Request denied - rejected due to max global usd Spend Permission reached"
**Solution**: Increase global spending limit in CDP Dashboard Configuration

#### Issue: Wallet still charges gas fees
**Possible causes**:
- Paymaster not properly configured in CDP Dashboard
- Contract not allowlisted
- Function not allowlisted
- Spending limits reached
- Wrong RPC URL in environment variables

#### Issue: Transaction fails immediately
**Check**:
- Wallet has sufficient USDC balance
- Recipient address is valid
- CDP Dashboard paymaster is enabled
- Environment variables are loaded (restart dev server)

## Integration into Minisend

Once testing is successful, we need to:

1. **Update TransactionHandler Component**
   - Add `isSponsored={true}` prop to `<Transaction>` component
   - File: `app/components/TransactionHandler.tsx`

2. **Update PaymentProcessor Component**
   - Ensure it passes through the sponsored flag
   - File: `app/components/PaymentProcessor.tsx`

3. **Test Production Flow**
   - Test complete off-ramp flow (USDC → KES/NGN)
   - Verify users aren't charged gas fees
   - Monitor CDP Dashboard for sponsorship metrics

## Monitoring & Analytics

### What to Track in CDP Dashboard
- **Daily Spend**: Monitor how much gas you're sponsoring per day
- **User Operations**: Track number of transactions sponsored
- **Cost per Transaction**: Average gas cost per user operation
- **Top Users**: Identify users consuming most sponsored gas
- **Failed Operations**: Monitor and investigate failed sponsorships

### Setting Appropriate Limits
Based on Minisend usage patterns:
- Average Base transaction fee: ~$0.015 (0.0015 cents)
- Expected daily transactions: [estimate based on your metrics]
- Recommended per-user limit: $1-5 per month
- Recommended global limit: Start with $100-500 per month

## Troubleshooting Commands

### Check Environment Variables
```bash
# Verify paymaster variables are set
echo "RPC URL: ${NEXT_PUBLIC_PAYMASTER_RPC_URL:+SET}"
echo "Enabled: ${NEXT_PUBLIC_PAYMASTER_ENABLED:-NOT_SET}"
echo "Network: ${NEXT_PUBLIC_PAYMASTER_NETWORK:-NOT_SET}"
```

### Restart Dev Server
```bash
# Stop current server
# Start fresh to load new env variables
npm run dev
```

### Check Paymaster Config at Runtime
Open browser console on test page and run:
```javascript
// Check if paymaster is configured
console.log('Paymaster RPC:', process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL);
console.log('Paymaster Enabled:', process.env.NEXT_PUBLIC_PAYMASTER_ENABLED);
```

## Next Steps After Successful Testing

1. ✅ Test page working with gasless transactions
2. ⏳ Update TransactionHandler to use `isSponsored={true}`
3. ⏳ Test complete Minisend payment flow
4. ⏳ Monitor CDP Dashboard metrics
5. ⏳ Adjust spending limits based on actual usage
6. ⏳ Deploy to production with paymaster enabled

## References
- CDP Paymaster Dashboard: https://portal.cdp.coinbase.com/products/bundler-and-paymaster
- OnchainKit Transaction Docs: https://onchainkit.xyz/transaction/transaction
- Base Network: https://base.org
- BaseScan: https://basescan.org
