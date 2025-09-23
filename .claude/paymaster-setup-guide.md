# Minisend Paymaster Setup Guide

## Overview
This guide will help you configure the Coinbase Developer Platform (CDP) Paymaster to enable gasless USDC transactions for Minisend users.

## Prerequisites
- ✅ CDP Account: You have access to portal.cdp.coinbase.com
- ✅ Base Mainnet Setup: Operating on Base mainnet
- ✅ Paymaster RPC URL: `https://api.developer.coinbase.com/rpc/v1/base/Txp2FJyUa9zCucjPFPqWHc0oeHmStFuo`

## Step 1: Access CDP Paymaster Dashboard

1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Select your project (Minisend)
3. Navigate to **Paymaster** from the left sidebar
4. Click on the **Configuration** tab

## Step 2: Enable Paymaster

1. Ensure **Base Mainnet** is selected (not Base Sepolia)
2. Toggle the paymaster to **ENABLED**
3. Verify your RPC URL matches: `https://api.developer.coinbase.com/rpc/v1/base/Txp2FJyUa9zCucjPFPqWHc0oeHmStFuo`

## Step 3: Allowlist USDC Contract

**Critical:** You must allowlist the USDC contract for sponsorship to work.

1. Click **Add** to add an allowlisted contract
2. Enter the following details:

   **Contract Address:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

   **Contract Name:** `USDC on Base`

   **Functions to Allowlist:**
   - `transfer(address,uint256)`
   - `approve(address,uint256)` *(optional, for future features)*

3. Click **Save** to confirm

## Step 4: Configure Spending Limits

### Per User Limits
Set reasonable limits for individual users:

- **Dollar Amount Limit:** `$5.00` per user per month
- **Max UserOperations:** `50` per user per month
- **Reset Cycle:** Monthly

### Global Limits
Set overall sponsorship budget:

- **Global Dollar Limit:** `$500.00` per month
- **Global UserOperations:** `2000` per month

## Step 5: Advanced Configuration (Optional)

### Contract Method Restrictions
For enhanced security, restrict to specific methods:
- ✅ `transfer(address,uint256)` - Required for USDC transfers
- ❌ Other methods - Block unnecessary functions

### Gas Price Limits
Set maximum gas price for sponsorship:
- **Max Gas Price:** `0.01 gwei` (Base network is very cheap)

## Step 6: Testing Configuration

Once configured, test with small amounts:

1. **Test Transaction:** Send $1 USDC through Minisend
2. **Verify Sponsorship:** Check that no gas fees are charged to user
3. **Monitor Dashboard:** Confirm transaction appears in CDP analytics

## Troubleshooting

### Common Issues:

1. **"Request denied" errors:**
   - Check contract is properly allowlisted
   - Verify function signatures match exactly
   - Ensure limits haven't been exceeded

2. **Transactions not sponsored:**
   - Confirm paymaster is enabled
   - Check RPC URL is correct
   - Verify Base Mainnet is selected (not testnet)

3. **Limit exceeded errors:**
   - Increase per-user or global limits
   - Reset cycles if needed
   - Monitor usage in dashboard

### Error Messages:

- `"rejected due to maximum per address transaction count reached"` = User limit exceeded
- `"rejected due to max global usd Spend Permission reached"` = Global limit exceeded
- `"function not allowlisted"` = Contract/function not properly configured

## Production Recommendations

### Security Best Practices:
1. **Principle of Least Privilege:** Only allowlist necessary contracts/functions
2. **Regular Monitoring:** Check spending patterns weekly
3. **Limit Management:** Start conservative and increase as needed
4. **Access Control:** Limit CDP dashboard access to authorized team members

### Cost Management:
1. **Start Small:** Begin with $100/month global limit
2. **Monitor Usage:** Track cost per user and adjust
3. **Seasonal Adjustments:** Increase limits during high-usage periods
4. **Alert Setup:** Configure spending alerts at 75% of limits

### Performance Optimization:
1. **Contract Efficiency:** Ensure USDC transfers are gas-optimized
2. **Batch Operations:** Consider batching multiple transfers when possible
3. **Network Monitoring:** Monitor Base network congestion

## Success Metrics

Track these KPIs to measure paymaster effectiveness:

- **User Conversion:** % of users completing transactions without gas friction
- **Cost Per Transaction:** Average sponsorship cost per USDC transfer
- **Error Rate:** % of failed sponsorship attempts
- **User Satisfaction:** Feedback on gasless experience

## Next Steps

After setup:
1. ✅ Test with small amounts ($1-5)
2. ✅ Monitor for 24 hours to ensure stability
3. ✅ Gradually increase limits based on usage
4. ✅ Set up alerting for limit thresholds
5. ✅ Document any custom configurations for team

## Support Resources

- **CDP Documentation:** [Paymaster Guide](https://docs.cdp.coinbase.com/paymasters)
- **Base Discord:** [#developers channel](https://discord.gg/buildonbase)
- **OnchainKit Docs:** [Transaction Components](https://onchainkit.xyz/transaction)

---

**⚠️ Important:** Test thoroughly on small amounts before enabling for all users. Paymaster configurations can take 5-10 minutes to propagate.