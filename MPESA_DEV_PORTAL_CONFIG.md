# M-Pesa Dev Portal Configuration for minitest-phi.vercel.app

## 🚀 URL Configuration Summary

Your deployed app URL: **https://minitest-phi.vercel.app/**

## 📝 Daraja Portal Configuration

### 1. Login to Daraja Portal
- Go to https://developer.safaricom.co.ke/
- Login with your credentials

### 2. Configure Callback URLs

#### For B2C Payments (Business to Customer):
- **QueueTimeOutURL**: `https://minitest-phi.vercel.app/api/mpesa/b2c/timeout`
- **ResultURL**: `https://minitest-phi.vercel.app/api/mpesa/b2c/result`

#### For STK Push (if using C2B later):
- **CallbackURL**: `https://minitest-phi.vercel.app/api/mpesa/callback`

### 3. Environment Variables to Set

Add these to your Vercel deployment:

```bash
# M-Pesa Configuration
MPESA_CALLBACK_URL=https://minitest-phi.vercel.app/api/mpesa
MPESA_CONSUMER_KEY=your_consumer_key_from_daraja
MPESA_CONSUMER_SECRET=your_consumer_secret_from_daraja
MPESA_SHORTCODE=your_shortcode
MPESA_INITIATOR_NAME=your_initiator_name
MPESA_INITIATOR_PASSWORD=your_initiator_password

# App Configuration
NEXT_PUBLIC_URL=https://minitest-phi.vercel.app
```

## 🔧 Daraja Portal Steps

### Step 1: Create App (if not done)
1. Click "Create App"
2. Select "Business to Customer (B2C)"
3. Fill in app details:
   - **App Name**: `minitest-usdc-offramp`
   - **Description**: `USDC to KSH conversion via M-Pesa`

### Step 2: Configure URLs
1. Go to your app dashboard
2. Navigate to "APIs" section
3. Click on "B2C API"
4. Update the following:

```
QueueTimeOutURL: https://minitest-phi.vercel.app/api/mpesa/b2c/timeout
ResultURL: https://minitest-phi.vercel.app/api/mpesa/b2c/result
```

### Step 3: Test Credentials
For sandbox testing, use these URLs:
- **Base URL**: `https://sandbox.safaricom.co.ke`
- **Auth URL**: `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
- **B2C URL**: `https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest`

For production:
- **Base URL**: `https://api.safaricom.co.ke`
- **Auth URL**: `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
- **B2C URL**: `https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest`

## 📱 Testing Your Configuration

### 1. Test Callback Endpoints

Test if your endpoints are accessible:

```bash
# Test timeout endpoint
curl https://minitest-phi.vercel.app/api/mpesa/b2c/timeout

# Test result endpoint  
curl https://minitest-phi.vercel.app/api/mpesa/b2c/result
```

Both should return:
```json
{
  "success": true,
  "message": "M-Pesa B2C [Timeout/Result] callback endpoint is active"
}
```

### 2. Test B2C Payment

Use your app to send a test B2C payment. Check:
1. ✅ API response is successful (ResponseCode: "0")
2. ✅ Callback URLs receive data
3. ✅ Transaction is logged properly

### 3. Monitor Logs

Check Vercel logs for:
- ✅ Successful B2C requests
- ✅ Callback data reception
- ❌ Any authentication errors

## 🔒 Security Notes

### 1. Certificate Management
- Download the correct certificate from Daraja portal
- Update `lib/mpesa/security.ts` with production certificate
- Test RSA encryption before going live

### 2. Environment Security
- Never commit credentials to git
- Use Vercel environment variables
- Rotate credentials regularly

### 3. Callback Security
- Validate callback source IP (optional)
- Log all callback data for audit
- Handle callback timeouts gracefully

## 🎯 Production Checklist

Before going live:

- [ ] Production credentials obtained from Safaricom
- [ ] Callback URLs configured in Daraja portal
- [ ] Environment variables set in Vercel
- [ ] Certificate updated for production
- [ ] Business account funded
- [ ] Test transactions completed successfully
- [ ] Error handling tested
- [ ] Monitoring and logging in place

## 🆘 Troubleshooting

### Common Issues:

1. **"Invalid QueueTimeOutURL"**
   - ✅ Fixed! URLs now use your deployed domain
   - Verify URLs in Daraja portal match exactly

2. **"Invalid Security Credential"**
   - Check certificate in `lib/mpesa/security.ts`
   - Ensure using correct environment (sandbox/production)

3. **Authentication Failures**
   - Verify consumer key/secret
   - Check if credentials are for correct environment

4. **Callback Not Received**
   - Test endpoint accessibility
   - Check Vercel function logs
   - Verify URL format in Daraja portal

## 📞 Support

If you encounter issues:
- **Safaricom Support**: [email protected]
- **Daraja Developer Support**: https://developer.safaricom.co.ke/support
- **Reference**: Your app uses B2C API for USDC to KSH conversion

## ✅ Status

- [x] Callback URLs updated with your domain
- [x] Fallback URLs configured
- [x] Code ready for production
- [ ] Daraja portal configuration (your action)
- [ ] Environment variables setup (your action)
- [ ] Production testing (after Safaricom approval)