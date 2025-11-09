# Saved Recipients Feature - Security Documentation

## Overview
The saved recipients feature allows users to quickly access frequently used payment destinations. This document outlines the security measures implemented.

## Security Measures

### 1. Client-Side Only Storage
- **Implementation**: All data stored in browser's localStorage
- **Rationale**: Data stays on user's device, never transmitted to our servers
- **Limitation**: Data not synced across devices (privacy feature)

### 2. Data Sanitization
- **XSS Prevention**: All string inputs sanitized before storage
  - Removes HTML/script characters: `<>\"'`
  - Truncates to max 200 characters
  - Applied to: accountName, bankName
- **Location**: `lib/recipient-storage.ts:sanitizeString()`

### 3. Input Validation
- **Phone Numbers (KES)**:
  - Regex: `/^\+?[1-9]\d{8,14}$/`
  - Validates international format
  - Prevents invalid data storage

- **Account Numbers (NGN)**:
  - Regex: `/^\d{10,18}$/`
  - Numeric only, 10-18 digits
  - Standard Nigerian account format

- **Bank Code**: Required for NGN transactions

### 4. Data Obfuscation
- **Method**: Base64 encoding with URI encoding
- **Purpose**: Prevents casual inspection of localStorage
- **Note**: This is NOT encryption, just obfuscation
- **Implementation**:
  - `obfuscate()`: btoa(encodeURIComponent(data))
  - `deobfuscate()`: decodeURIComponent(atob(data))

### 5. Display Sanitization
- **Component**: `SavedRecipients.tsx`
- **Method**: `sanitizeDisplay()`
- **Double Protection**: React's default escaping + manual sanitization

### 6. Data Minimization
- **Max Recipients**: Limited to 8
- **No Sensitive Data Stored**:
  - ❌ Transaction IDs
  - ❌ Balances
  - ❌ Wallet private keys
  - ❌ Payment amounts
  - ✅ Only recipient info (name, phone/account, bank)

### 7. Automatic Cleanup
- **FIFO**: Oldest recipients removed when limit exceeded
- **User Control**: Delete button for manual removal
- **No Server Sync**: No accidental cloud backup

## Data Structure

```typescript
interface SavedRecipient {
  id: string;              // Generated UUID
  type: 'KES' | 'NGN';    // Currency type
  phoneNumber?: string;    // M-Pesa number (KES only)
  accountNumber?: string;  // Bank account (NGN only)
  accountName: string;     // Recipient name (sanitized)
  bankCode?: string;       // Bank identifier (NGN only)
  bankName?: string;       // Bank display name (sanitized)
  lastUsed: string;        // ISO timestamp
  useCount: number;        // Frequency counter
}
```

## Privacy Considerations

### What Users Should Know
1. **Local Storage**: Data only on your device
2. **Browser Clearing**: Data lost if browser cache cleared
3. **No Sync**: Not available on other devices
4. **No Backup**: No recovery if data lost

### What We Don't Store
- Transaction history
- Payment amounts
- Wallet addresses
- Private keys
- Session tokens
- API credentials

## Attack Surface Analysis

### Potential Risks
1. **XSS via LocalStorage Manipulation**
   - **Mitigation**: Input sanitization + React escaping
   - **Impact**: Low (would only affect attacker's own browser)

2. **Data Tampering**
   - **Mitigation**: Validation on retrieval
   - **Impact**: Low (only affects user's own data)

3. **Information Disclosure**
   - **Mitigation**: Obfuscation + no sensitive data
   - **Impact**: Low (recipient info only, no financials)

### Non-Risks
- **Server-side attacks**: No server storage
- **Database injection**: No database involvement
- **API exploitation**: Feature is client-only
- **Cross-user access**: LocalStorage is domain + browser specific

## Compliance Notes

### GDPR Considerations
- **Right to be forgotten**: User can delete recipients
- **Data portability**: Data is in browser only
- **Purpose limitation**: Only for UX improvement
- **Data minimization**: Only essential recipient info

### PCI-DSS
- **Not Applicable**: No card data stored
- **No Payment Info**: Account numbers for receipt, not processing

## Future Enhancements

### If Server-Side Storage Needed
1. Encrypt with user-specific key
2. Store in secure database with encryption at rest
3. Implement proper access controls
4. Add audit logging
5. Enable cross-device sync

### Additional Security
1. Add CSP headers
2. Implement SRI for scripts
3. Regular security audits
4. Penetration testing

## Testing Checklist

- [ ] XSS attempts in account names
- [ ] Invalid phone number formats
- [ ] Invalid account number formats
- [ ] LocalStorage tampering
- [ ] Max recipients limit enforcement
- [ ] Delete functionality
- [ ] Data persistence across sessions
- [ ] Data clearing on logout (if implemented)

## Responsible Disclosure

If you find a security issue, please report to: security@minisend.app
