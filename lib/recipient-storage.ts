/**
 * Recipient Storage Utility
 * Manages frequently used recipient information with intelligent deduplication
 *
 * SECURITY NOTES:
 * - All data is stored locally in browser (user's device only)
 * - Data is sanitized before storage to prevent XSS
 * - Only last 4 digits of phone/account shown in some contexts
 * - No sensitive financial data (balances, transaction IDs) stored
 */

export interface SavedRecipient {
  id: string;
  type: 'KES' | 'NGN' | 'GHS' | 'UGX';
  phoneNumber?: string;
  accountNumber?: string;
  accountName: string;
  bankCode?: string;
  bankName?: string;
  lastUsed: string;
  useCount: number;
}

const STORAGE_KEY = 'minisend_recipients';
const MAX_RECIPIENTS = 8;

/**
 * Simple obfuscation for localStorage data
 * Note: This is NOT encryption, just obfuscation to prevent casual inspection
 * Real sensitive data should be on server-side only
 */
function obfuscate(data: string): string {
  return btoa(encodeURIComponent(data));
}

function deobfuscate(data: string): string {
  try {
    return decodeURIComponent(atob(data));
  } catch {
    return '';
  }
}

/**
 * Sanitize string input to prevent XSS
 */
function sanitizeString(input: string): string {
  return input
    .replace(/[<>\"']/g, '') // Remove potential HTML/script characters
    .trim()
    .substring(0, 200); // Limit length
}

/**
 * Validate phone number format (basic validation)
 */
function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{8,14}$/.test(phone);
}

/**
 * Validate account number format (basic validation)
 */
function isValidAccountNumber(account: string): boolean {
  return /^\d{10,18}$/.test(account);
}

/**
 * Get all saved recipients sorted by frequency and recency
 */
export function getSavedRecipients(): SavedRecipient[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    // Deobfuscate the stored data
    const deobfuscatedData = deobfuscate(stored);
    if (!deobfuscatedData) return [];

    const recipients: SavedRecipient[] = JSON.parse(deobfuscatedData);

    // Validate the structure to prevent tampering
    if (!Array.isArray(recipients)) return [];

    // Sort by use count (descending) and last used (most recent first)
    return recipients.sort((a, b) => {
      if (b.useCount !== a.useCount) {
        return b.useCount - a.useCount;
      }
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });
  } catch {
    return [];
  }
}

/**
 * Get recipients filtered by currency type
 */
export function getRecipientsByCurrency(currency: 'KES' | 'NGN' | 'GHS' | 'UGX'): SavedRecipient[] {
  return getSavedRecipients().filter(r => r.type === currency);
}

/**
 * Save or update a recipient with validation and sanitization
 */
export function saveRecipient(recipient: Omit<SavedRecipient, 'id' | 'lastUsed' | 'useCount'>): void {
  if (typeof window === 'undefined') return;

  try {
    // Validate and sanitize inputs
    const sanitizedAccountName = sanitizeString(recipient.accountName);
    if (!sanitizedAccountName) return; // Don't save if name is empty after sanitization

    // Validate phone number for KES, GHS, and UGX
    if (recipient.type === 'KES' || recipient.type === 'GHS' || recipient.type === 'UGX') {
      if (!recipient.phoneNumber || !isValidPhone(recipient.phoneNumber)) {
        return; // Invalid phone number
      }
    }

    // Validate account number for NGN
    if (recipient.type === 'NGN') {
      if (!recipient.accountNumber || !isValidAccountNumber(recipient.accountNumber)) {
        return; // Invalid account number
      }
      if (!recipient.bankCode) {
        return; // Bank code required for NGN
      }
    }

    const recipients = getSavedRecipients();

    // Find existing recipient based on unique identifiers
    const existingIndex = recipients.findIndex(r => {
      if (recipient.type === 'KES' || recipient.type === 'GHS' || recipient.type === 'UGX') {
        return r.phoneNumber === recipient.phoneNumber;
      } else {
        return r.accountNumber === recipient.accountNumber && r.bankCode === recipient.bankCode;
      }
    });

    if (existingIndex >= 0) {
      // Update existing recipient
      recipients[existingIndex] = {
        ...recipients[existingIndex],
        accountName: sanitizedAccountName,
        bankName: recipient.bankName ? sanitizeString(recipient.bankName) : undefined,
        lastUsed: new Date().toISOString(),
        useCount: recipients[existingIndex].useCount + 1,
      };
    } else {
      // Add new recipient with sanitized data
      const newRecipient: SavedRecipient = {
        id: generateId(),
        type: recipient.type,
        phoneNumber: recipient.phoneNumber,
        accountNumber: recipient.accountNumber,
        accountName: sanitizedAccountName,
        bankCode: recipient.bankCode,
        bankName: recipient.bankName ? sanitizeString(recipient.bankName) : undefined,
        lastUsed: new Date().toISOString(),
        useCount: 1,
      };

      recipients.unshift(newRecipient);

      // Keep only MAX_RECIPIENTS
      if (recipients.length > MAX_RECIPIENTS) {
        recipients.splice(MAX_RECIPIENTS);
      }
    }

    // Obfuscate before storing
    const obfuscatedData = obfuscate(JSON.stringify(recipients));
    localStorage.setItem(STORAGE_KEY, obfuscatedData);
  } catch {
    // Silent fail - non-critical feature
  }
}

/**
 * Delete a saved recipient
 */
export function deleteRecipient(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const recipients = getSavedRecipients();
    const filtered = recipients.filter(r => r.id !== id);

    // Obfuscate before storing
    const obfuscatedData = obfuscate(JSON.stringify(filtered));
    localStorage.setItem(STORAGE_KEY, obfuscatedData);
  } catch {
    // Silent fail
  }
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
