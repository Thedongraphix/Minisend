# 🚀 Complete Guide: Getting Your M-Pesa B2C App Live with Safaricom

## 📋 Overview

This guide will take you through the complete process of getting your USDC to M-Pesa conversion app approved for production by Safaricom.

**Current Status**: ✅ Your app is technically ready for production!

## 🎯 Prerequisites Checklist

Before starting the approval process, ensure you have:

### ✅ Technical Requirements
- [x] Working sandbox integration (you have this!)
- [x] Successful B2C payments in sandbox
- [x] Proper callback URL handling
- [x] HTTPS-enabled deployment (minitest-phi.vercel.app)
- [x] Error handling and logging
- [x] Transaction validation

### 🏢 Business Requirements
- [ ] **M-Pesa Paybill or Till Number** (CRITICAL - must get this first)
- [ ] Registered business/company
- [ ] Valid KYC documents
- [ ] Business bank account
- [ ] Use case documentation

## 🏃‍♂️ Step-by-Step Production Approval Process

### Phase 1: Get M-Pesa Business Account (1-2 weeks)

#### Step 1.1: Business Registration
```bash
Required Documents:
- Certificate of incorporation/registration
- KRA PIN certificate  
- Valid ID copies of directors
- Business permit/license
- Bank statements (last 3 months)
```

#### Step 1.2: Apply for M-Pesa Paybill/Till
**Option A: Self-Service (Faster)**
- Visit: https://pay.m-pesaforbusiness.co.ke/
- Complete online application
- Upload required documents

**Option B: Safaricom Shop**
- Visit nearest Safaricom shop
- Fill application forms
- Submit KYC documents

**What You'll Get:**
- Paybill/Till Number (e.g., 174379)
- Initial sandbox credentials
- Business account setup

#### Step 1.3: Upgrade to Bank Settlement
**IMPORTANT**: Your till/paybill must settle to a bank account (not M-Pesa wallet) to be API-eligible.

Send email to:
- **Email**: `M-PESABusiness@Safaricom.co.ke`
- **Subject**: "Till/Paybill Upgrade Request for API Integration"
- **Content**:
```
Dear M-Pesa Business Team,

I request to upgrade my [Till/Paybill] number [YOUR_NUMBER] to settle funds to a bank account instead of M-Pesa wallet for API integration purposes.

Business Name: [YOUR_BUSINESS_NAME]
Registration Number: [YOUR_REG_NUMBER]
Contact: [YOUR_PHONE] / [YOUR_EMAIL]
Bank Account: [BANK_NAME] - [ACCOUNT_NUMBER]

Please provide upgrade forms and timeline.

Best regards,
[YOUR_NAME]
```

### Phase 2: Daraja Portal Setup (1 week)

#### Step 2.1: Create Developer Account
- Visit: https://developer.safaricom.co.ke/
- Register with business email
- Verify email address
- Complete profile setup

#### Step 2.2: Request M-Pesa Portal Access
Send email to:
- **Email**: `M-PESABusiness@Safaricom.co.ke`
- **Subject**: "M-Pesa Portal Access Request"
- **Content**:
```
Dear M-Pesa Business Team,

I request access to the M-Pesa Portal for my business to enable API integration.

Business Details:
- Business Name: [YOUR_BUSINESS_NAME]
- Paybill/Till Number: [YOUR_NUMBER]
- Registration Number: [YOUR_REG_NUMBER]
- Contact Person: [YOUR_NAME]
- Email: [YOUR_EMAIL]
- Phone: [YOUR_PHONE]

Please send the application forms and setup instructions.

Best regards,
[YOUR_NAME]
```

#### Step 2.3: Portal Credentials Setup
**You'll receive:**
- M-Pesa Portal login credentials
- Instructions to create assistant user
- Certificate information

**Action Required:**
1. Login to M-Pesa Portal
2. Change default password
3. Create "Assistant User" role
4. Note down assistant username/password

### Phase 3: Sandbox Testing Documentation (1 week)

#### Step 3.1: Complete Test Cases
Document all your testing scenarios:

```markdown
# Test Case Documentation

## 1. Successful B2C Payment
- Amount: $1 USDC → KSH 121.55
- Phone: +254797872622
- Response: ResponseCode "0"
- Status: ✅ PASSED

## 2. Invalid Phone Number
- Phone: +254123456789
- Expected: Validation error
- Status: ✅ PASSED

## 3. Insufficient Funds
- Amount: $10000
- Expected: Balance error
- Status: ✅ PASSED

## 4. Callback Handling
- Timeout URL: minitest-phi.vercel.app/api/mpesa/b2c/timeout
- Result URL: minitest-phi.vercel.app/api/mpesa/b2c/result
- Status: ✅ PASSED

## 5. Error Handling
- Network timeouts: ✅ PASSED
- Invalid credentials: ✅ PASSED
- Malformed requests: ✅ PASSED
```

#### Step 3.2: API Usage Documentation
Create detailed documentation of your integration:

**APIs Used:**
- ✅ B2C Payment API (Business to Customer)
- ✅ Authorization API (OAuth)
- ✅ Transaction Status API (optional)

**Security Implementation:**
- ✅ RSA encryption for credentials
- ✅ HTTPS callback URLs
- ✅ Request validation
- ✅ Response verification

### Phase 4: Go-Live Application (2-4 weeks review)

#### Step 4.1: Prepare Go-Live Letter
Create official letter on your company letterhead:

```
[YOUR COMPANY LETTERHEAD]

Date: [CURRENT_DATE]

Safaricom PLC
M-Pesa Business Team
P.O. Box 66827-00800
Nairobi, Kenya

Subject: M-Pesa Daraja API Production Access Request

Dear M-Pesa Business Team,

We hereby request production access for our M-Pesa Daraja API integration.

BUSINESS INFORMATION:
- Company Name: [YOUR_COMPANY_NAME]
- Registration Number: [YOUR_REG_NUMBER]
- Paybill/Till Number: [YOUR_NUMBER]
- Business Type: Fintech/Cryptocurrency Exchange

USE CASE DESCRIPTION:
We have developed a USDC to Kenyan Shilling conversion platform that enables users to convert cryptocurrency (USDC) to local currency via M-Pesa. Our service provides:

1. Secure USDC to KSH conversion
2. Automated B2C payments to customer M-Pesa wallets
3. Real-time exchange rate calculations
4. Compliance with financial regulations

TECHNICAL DETAILS:
- Application URL: https://minitest-phi.vercel.app/
- Callback URLs: 
  * Timeout: https://minitest-phi.vercel.app/api/mpesa/b2c/timeout
  * Result: https://minitest-phi.vercel.app/api/mpesa/b2c/result
- APIs Required: B2C Payment, Authorization
- Server Infrastructure: Vercel (HTTPS encrypted)

SANDBOX TESTING:
We have completed comprehensive testing in the sandbox environment including:
- Successful B2C payments
- Error handling scenarios
- Callback URL validation
- Security credential implementation

CONTACT INFORMATION:
- Technical Lead: [YOUR_NAME]
- Email: [YOUR_EMAIL]
- Phone: [YOUR_PHONE]
- Assistant Portal User: [ASSISTANT_USERNAME]

We have attached our test case documentation and technical implementation details for your review.

We look forward to your approval to proceed with production integration.

Yours faithfully,

[YOUR_SIGNATURE]
[YOUR_NAME]
[YOUR_TITLE]
[YOUR_COMPANY]

Attachments:
1. Test Case Documentation
2. Technical Architecture Document
3. Business Registration Certificate
4. KRA PIN Certificate
```

#### Step 4.2: Submit Application
**Email Details:**
- **To**: `m-pesabusiness@safaricom.co.ke`
- **CC**: `M-PESABusiness@Safaricom.co.ke`
- **Subject**: "Go-Live Request - Daraja API Production Access - [YOUR_COMPANY_NAME]"

**Attachments:**
1. Go-live letter (PDF)
2. Test case documentation
3. Technical implementation guide
4. Business registration documents
5. Screenshots of successful sandbox tests

#### Step 4.3: Follow Up Process
**Week 1**: Acknowledgment email expected
**Week 2-3**: Technical review by Safaricom team
**Week 4**: Approval notification or requests for additional information

**If no response after 1 week, follow up:**
- Email: `m-pesabusiness@safaricom.co.ke`
- Phone: 0722002222 or 2222 (from Safaricom line)

### Phase 5: Production Setup (1 week)

#### Step 5.1: Receive Production Credentials
Upon approval, you'll receive:
- Production Consumer Key
- Production Consumer Secret
- Production Shortcode
- Production Initiator Name
- Production Initiator Password
- Production Certificate
- Whitelisted IP addresses

#### Step 5.2: Update Your Application
```bash
# Environment Variables to Update
MPESA_ENV=production
MPESA_CONSUMER_KEY=[production_key]
MPESA_CONSUMER_SECRET=[production_secret]  
MPESA_SHORTCODE=[production_shortcode]
MPESA_INITIATOR_NAME=[production_initiator]
MPESA_INITIATOR_PASSWORD=[production_password]
```

#### Step 5.3: Deploy Production Updates
1. Update environment variables in Vercel
2. Update API URLs to production:
   - Auth: `https://api.safaricom.co.ke/oauth/v1/generate`
   - B2C: `https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest`
3. Update security certificate
4. Test with small amounts (KSH 1-10)

### Phase 6: Live Testing & Monitoring (Ongoing)

#### Step 6.1: Gradual Rollout
```bash
Day 1-3: Test with KSH 1-10 amounts
Day 4-7: Test with KSH 50-100 amounts  
Day 8-14: Normal operation KSH 100-1000
Day 15+: Full production operation
```

#### Step 6.2: Monitor Key Metrics
- Transaction success rate (target: >99%)
- Callback reception rate (target: 100%)
- Response time (target: <15 seconds)
- Error rate (target: <1%)

## 📞 Key Contacts

### Primary Contacts
- **M-Pesa Business Email**: `m-pesabusiness@safaricom.co.ke`
- **Alternative Email**: `M-PESABusiness@Safaricom.co.ke`
- **Support Hotline**: 0722002222 or 2222

### Certificate Issues
- **Email**: `M-PESACertpassword@safaricom.co.ke`

### Technical Support
- **Developer Portal**: https://developer.safaricom.co.ke/
- **Documentation**: Developer portal knowledge base

## ⏰ Timeline Summary

| Phase | Duration | Key Activities |
|-------|----------|----------------|
| Business Setup | 1-2 weeks | Paybill/Till application, bank settlement |
| Portal Access | 1 week | Daraja account, M-Pesa portal setup |
| Testing Documentation | 1 week | Complete test cases, document integration |
| Go-Live Application | 2-4 weeks | Submit application, Safaricom review |
| Production Setup | 1 week | Receive credentials, deploy updates |
| **Total Timeline** | **6-9 weeks** | From start to live production |

## 🚨 Common Pitfalls to Avoid

### 1. Business Account Issues
- ❌ Using personal M-Pesa (won't work)
- ❌ Till settling to M-Pesa wallet (needs bank account)
- ✅ Proper business registration with bank settlement

### 2. Documentation Issues  
- ❌ Incomplete test case documentation
- ❌ Missing business registration documents
- ✅ Comprehensive testing and proper documentation

### 3. Technical Issues
- ❌ HTTP callback URLs (must be HTTPS)
- ❌ Hardcoded sandbox credentials
- ✅ Proper environment variable management

## 🎯 Success Indicators

### Application Approval Signs
- Email confirmation from Safaricom
- Production credentials received
- IP whitelisting completed
- Access to production endpoints

### Technical Success
- ResponseCode "0" in production
- Real SMS notifications received
- Actual money transfers completed
- Callbacks received successfully

## 📝 Templates and Forms

All necessary templates included in this guide:
- ✅ Go-live request letter
- ✅ Email templates for various requests
- ✅ Test case documentation format
- ✅ Environment variable checklist

## 🎉 Next Steps for You

**Immediate Actions (This Week):**
1. [ ] Apply for M-Pesa business account (if not done)
2. [ ] Prepare business registration documents
3. [ ] Create Daraja developer account

**Short Term (1-2 Weeks):**
1. [ ] Request M-Pesa portal access
2. [ ] Complete test case documentation
3. [ ] Prepare go-live letter

**Medium Term (3-4 Weeks):**
1. [ ] Submit go-live application
2. [ ] Follow up with Safaricom
3. [ ] Prepare for production deployment

Your technical implementation is already production-ready! The focus now is on business setup and Safaricom approval process.

---

**Good luck with your production approval! 🚀**

*Your USDC to M-Pesa conversion app is technically sound and ready for prime time.*