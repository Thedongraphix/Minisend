/**
 * Security utilities for redacting sensitive data in API responses
 * Implements OWASP recommendations for data exposure prevention
 */

// Redact phone numbers - show first 3 and last 3 digits
export function redactPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '***'
  
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned.length < 6) return '***'
  
  // +254712345678 -> +254***5678
  const prefix = cleaned.slice(0, 4)
  const suffix = cleaned.slice(-4)
  const stars = '*'.repeat(Math.max(3, cleaned.length - 8))
  
  return `${prefix}${stars}${suffix}`
}

// Redact wallet addresses - show first 6 and last 4 characters
export function redactWalletAddress(address: string): string {
  if (!address || typeof address !== 'string') return '0x***'
  
  if (address.length < 12) return '0x***'
  
  // 0x1234567890abcdef -> 0x1234...cdef
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Redact account names - show first name and first letter of last name
export function redactAccountName(name: string): string {
  if (!name || typeof name !== 'string') return '***'
  
  const parts = name.trim().split(' ')
  if (parts.length === 1) {
    // Single name - show first 2 chars
    return parts[0].length > 2 ? `${parts[0].slice(0, 2)}***` : '***'
  }
  
  // Multiple names - show first name and first letter of others
  const firstName = parts[0]
  const otherInitials = parts.slice(1).map(p => p[0] || '').join('')
  
  return `${firstName} ${otherInitials}***`
}

// Redact transaction hashes - show first 6 and last 6 characters  
export function redactTxHash(hash: string): string {
  if (!hash || typeof hash !== 'string') return '0x***'
  
  if (hash.length < 14) return '0x***'
  
  // 0x1234567890abcdef1234567890abcdef -> 0x123456...abcdef
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

// Redact memo fields - remove any potential PII
export function redactMemo(memo: string): string {
  if (!memo || typeof memo !== 'string') return '***'
  
  // Replace potential phone numbers in memo
  const phonePattern = /(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g
  let redacted = memo.replace(phonePattern, '***')
  
  // Replace potential names after "to" 
  const namePattern = /to\s+([A-Za-z\s]{2,})/gi
  redacted = redacted.replace(namePattern, 'to ***')
  
  return redacted
}

// Main redaction function for order objects
export interface RedactionOptions {
  includeWalletAddress?: boolean
  includeTxHash?: boolean  
  includeFullAccountName?: boolean
}

export function redactOrderData(order: any, options: RedactionOptions = {}): any {
  if (!order) return order
  
  const redacted = { ...order }
  
  // Redact recipient data
  if (redacted.recipient) {
    redacted.recipient = {
      ...redacted.recipient,
      accountIdentifier: redacted.recipient.accountIdentifier 
        ? redactPhoneNumber(redacted.recipient.accountIdentifier)
        : redacted.recipient.accountIdentifier,
      accountName: redacted.recipient.accountName && !options.includeFullAccountName
        ? redactAccountName(redacted.recipient.accountName)
        : redacted.recipient.accountName,
      memo: redacted.recipient.memo 
        ? redactMemo(redacted.recipient.memo)
        : redacted.recipient.memo
    }
  }
  
  // Redact wallet addresses unless explicitly included
  if (!options.includeWalletAddress) {
    if (redacted.fromAddress) redacted.fromAddress = redactWalletAddress(redacted.fromAddress)
    if (redacted.receiveAddress) redacted.receiveAddress = redactWalletAddress(redacted.receiveAddress)
    if (redacted.returnAddress) redacted.returnAddress = redactWalletAddress(redacted.returnAddress)
  }
  
  // Redact transaction hash unless explicitly included
  if (!options.includeTxHash && redacted.txHash) {
    redacted.txHash = redactTxHash(redacted.txHash)
  }
  
  return redacted
}

// Redact array of orders
export function redactOrdersArray(orders: any[], options: RedactionOptions = {}): any[] {
  if (!Array.isArray(orders)) return orders
  return orders.map(order => redactOrderData(order, options))
}

// Security headers for sensitive endpoints
export function getSecurityHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache', 
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }
}