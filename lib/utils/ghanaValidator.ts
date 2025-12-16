/**
 * Ghana Payment Validation Utilities
 *
 * Ghana phone numbers follow these patterns:
 * - +233 XX XXX XXXX (with country code)
 * - 0XX XXX XXXX (local format, 10 digits)
 * - XX XXX XXXX (9 digits without leading 0)
 *
 * Bank accounts in Ghana:
 * - Typically 10-16 digits
 * - All numeric
 */

export interface GhanaPaymentDestination {
  type: 'mobile_money' | 'bank_account' | 'unknown';
  value: string;
  formatted: string;
  isValid: boolean;
  network?: 'MTN' | 'VODAFONE' | 'AIRTELTIGO' | 'GLO' | 'UNKNOWN';
}

/**
 * Validates Ghana phone numbers for mobile money
 * Supports MTN, Vodafone, AirtelTigo, and Glo formats
 */
export function validateGhanaPhoneNumber(phoneNumber: string): boolean {
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  // Check for valid Ghana phone number patterns
  if (cleanPhone.startsWith('233')) {
    return cleanPhone.length === 12; // 233XXXXXXXXX
  }

  if (cleanPhone.startsWith('0')) {
    return cleanPhone.length === 10; // 0XXXXXXXXX
  }

  if (cleanPhone.length === 9) {
    return true; // XXXXXXXXX
  }

  return false;
}

/**
 * Validates Ghana bank account numbers
 * Ghana bank accounts are typically 10-16 digits
 */
export function validateGhanaBankAccount(accountNumber: string): boolean {
  const cleanAccount = accountNumber.replace(/\D/g, '');
  return cleanAccount.length >= 10 && cleanAccount.length <= 16 && /^\d+$/.test(cleanAccount);
}

/**
 * Formats Ghana phone number for API (233XXXXXXXXX format)
 */
export function formatGhanaPhoneNumber(phoneNumber: string): string {
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  if (cleanPhone.startsWith('233')) {
    return cleanPhone;
  }

  if (cleanPhone.startsWith('0')) {
    return '233' + cleanPhone.substring(1);
  }

  return '233' + cleanPhone;
}

/**
 * Formats Ghana bank account for API (removes all non-digits)
 */
export function formatGhanaBankAccount(accountNumber: string): string {
  return accountNumber.replace(/\D/g, '');
}

/**
 * Detects payment destination type for Ghana
 */
export function detectGhanaPaymentDestination(input: string): GhanaPaymentDestination {
  if (!input || input.trim() === '') {
    return {
      type: 'unknown',
      value: input,
      formatted: input,
      isValid: false
    };
  }

  const cleanInput = input.replace(/\D/g, '');
  const trimmedInput = input.trim();

  // Check for phone number patterns (9-12 digits)
  if (cleanInput.length >= 9 && cleanInput.length <= 12) {
    const isValidPhone = validateGhanaPhoneNumber(cleanInput);

    // Only treat as phone if it matches mobile prefixes
    if (isValidPhone && isMobileMoneyPrefix(cleanInput)) {
      return {
        type: 'mobile_money',
        value: trimmedInput,
        formatted: formatGhanaPhoneNumber(cleanInput),
        isValid: isValidPhone
      };
    }
  }

  // Check for bank account pattern (10-16 digits)
  if (cleanInput.length >= 10 && cleanInput.length <= 16) {
    const isValidBank = validateGhanaBankAccount(cleanInput);
    return {
      type: 'bank_account',
      value: trimmedInput,
      formatted: formatGhanaBankAccount(cleanInput),
      isValid: isValidBank
    };
  }

  return {
    type: 'unknown',
    value: trimmedInput,
    formatted: cleanInput,
    isValid: false
  };
}

/**
 * Helper function to check if number has mobile money prefix
 */
function isMobileMoneyPrefix(cleanNumber: string): boolean {
  // Convert to 233 format
  let number233: string;
  if (cleanNumber.startsWith('233')) {
    number233 = cleanNumber;
  } else if (cleanNumber.startsWith('0')) {
    number233 = '233' + cleanNumber.slice(1);
  } else if (cleanNumber.length === 9) {
    number233 = '233' + cleanNumber;
  } else {
    return false;
  }

  const threeDigitPrefix = number233.slice(3, 6);

  const mobileMoneyPrefixes = [
    // MTN
    '024', '054', '055', '059',
    // Vodafone/Telecel
    '020', '050',
    // AirtelTigo
    '027', '026', '057', '056',
    // Glo
    '023'
  ];

  return mobileMoneyPrefixes.includes(threeDigitPrefix);
}

/**
 * Gets user-friendly description of payment destination
 */
export function getGhanaPaymentDescription(destination: GhanaPaymentDestination): string {
  switch (destination.type) {
    case 'mobile_money':
      return 'Mobile Money Number';
    case 'bank_account':
      return 'Bank Account Number';
    default:
      return 'Unknown payment method';
  }
}

/**
 * Gets placeholder text for Ghana payment input
 */
export function getGhanaPaymentPlaceholder(paymentType: 'mobile_money' | 'bank_account'): string {
  if (paymentType === 'mobile_money') {
    return 'Enter mobile money number (233...)';
  }
  return 'Enter bank account number';
}

/**
 * Test phone numbers for Ghana (development)
 */
export const TEST_GHANA_PHONE_NUMBERS = {
  valid: [
    '+233241234567',  // MTN
    '233241234567',   // MTN
    '0241234567',     // MTN local
    '241234567',      // MTN without 0
    '0501234567',     // Vodafone
    '0271234567',     // AirtelTigo
    '0541234567',     // MTN
    '0551234567',     // MTN
  ],
  invalid: [
    '233241234',      // Too short
    '23324123456789', // Too long
    '241234',         // Too short
    'phone123',       // Contains letters
    '0191234567',     // Invalid prefix
  ]
};

/**
 * Test bank accounts for Ghana (development)
 */
export const TEST_GHANA_BANK_ACCOUNTS = {
  valid: [
    '1234567890',       // 10 digits
    '12345678901234',   // 14 digits
    '1234567890123456', // 16 digits
  ],
  invalid: [
    '123456789',        // Too short (9 digits)
    '12345678901234567', // Too long (17 digits)
    'ABC1234567890',    // Contains letters
    '123-456-7890',     // Contains special chars
  ]
};

/**
 * Validates Ghana payment details based on type
 */
export function validateGhanaPaymentDetails(
  paymentType: 'mobile_money' | 'bank_account',
  value: string,
  bankCode?: string
): { isValid: boolean; error?: string } {
  if (paymentType === 'mobile_money') {
    const isValid = validateGhanaPhoneNumber(value);
    return {
      isValid,
      error: isValid ? undefined : 'Invalid Ghana mobile money number format'
    };
  }

  if (paymentType === 'bank_account') {
    if (!bankCode) {
      return {
        isValid: false,
        error: 'Bank code is required for bank transfers'
      };
    }

    const isValid = validateGhanaBankAccount(value);
    return {
      isValid,
      error: isValid ? undefined : 'Invalid Ghana bank account number (must be 10-16 digits)'
    };
  }

  return {
    isValid: false,
    error: 'Unknown payment type'
  };
}
