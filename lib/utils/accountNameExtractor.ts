/**
 * Utility functions to extract real account names from PayCrest memo fields
 * 
 * PayCrest API returns "OK" instead of actual account names, but preserves
 * the real account names in memo fields with the pattern:
 * "Payment from Minisend to [ACCOUNT_NAME]" or "Payment from Minisend to [ACCOUNT_NAME] - Account: [PAYBILL_ACCOUNT]"
 */

export function extractAccountNameFromMemo(memo: string): string | null {
  if (!memo || typeof memo !== 'string') {
    return null;
  }

  // Pattern 1: "Payment from Minisend to [ACCOUNT_NAME] - Account: [PAYBILL_ACCOUNT]"
  const paybillPattern = /Payment from Minisend to (.+?) - Account:/;
  const paybillMatch = memo.match(paybillPattern);
  if (paybillMatch && paybillMatch[1]) {
    return paybillMatch[1].trim();
  }

  // Pattern 2: "Payment from Minisend to [ACCOUNT_NAME]"
  const standardPattern = /Payment from Minisend to (.+?)$/;
  const standardMatch = memo.match(standardPattern);
  if (standardMatch && standardMatch[1]) {
    return standardMatch[1].trim();
  }

  return null;
}

// Type definitions for PayCrest order objects
interface PaycrestRecipient {
  accountName: string;
  memo?: string;
  institution?: string;
  accountIdentifier?: string;
  currency?: string;
  providerId?: string;
  metadata?: unknown;
  nonce?: string;
}

interface PaycrestOrder {
  id: string;
  status: string;
  recipient?: PaycrestRecipient;
  [key: string]: unknown;
}

/**
 * Fix PayCrest order object by replacing "OK" account names with extracted names from memo
 */
export function fixPaycrestAccountName(order: PaycrestOrder): PaycrestOrder {
  if (!order || !order.recipient) {
    return order;
  }

  const { recipient } = order;
  
  // Only fix if account name is "OK" and we have a memo to extract from
  if (recipient.accountName === 'OK' && recipient.memo) {
    const extractedName = extractAccountNameFromMemo(recipient.memo);
    if (extractedName) {
      return {
        ...order,
        recipient: {
          ...recipient,
          accountName: extractedName
        }
      };
    }
  }

  return order;
}

/**
 * Fix an array of PayCrest orders
 */
export function fixPaycrestOrdersAccountNames(orders: PaycrestOrder[]): PaycrestOrder[] {
  if (!Array.isArray(orders)) {
    return orders;
  }

  return orders.map(fixPaycrestAccountName);
}