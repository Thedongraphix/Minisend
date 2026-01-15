/**
 * Uganda Payment Validation Utilities
 *
 * Uganda phone numbers follow these patterns:
 * - +256 XX XXX XXXX (with country code)
 * - 0XX XXX XXXX (local format, 10 digits)
 * - XX XXX XXXX (9 digits without leading 0)
 *
 * Mobile Money networks in Uganda:
 * - MTN Mobile Money (most popular)
 * - Airtel Money
 */

export interface UgandaPaymentDestination {
  type: 'mobile_money' | 'unknown';
  value: string;
  formatted: string;
  isValid: boolean;
  network?: 'MTN' | 'AIRTEL' | 'UNKNOWN';
}

/**
 * Validates Uganda phone numbers for mobile money
 * Supports MTN and Airtel formats
 */
export function validateUgandaPhoneNumber(phoneNumber: string): boolean {
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  // Check for valid Uganda phone number patterns
  if (cleanPhone.startsWith('256')) {
    return cleanPhone.length === 12; // 256XXXXXXXXX
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
 * Formats Uganda phone number for API (256XXXXXXXXX format)
 */
export function formatUgandaPhoneNumber(phoneNumber: string): string {
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  if (cleanPhone.startsWith('256')) {
    return cleanPhone;
  }

  if (cleanPhone.startsWith('0')) {
    return '256' + cleanPhone.substring(1);
  }

  return '256' + cleanPhone;
}

/**
 * Detects payment destination type for Uganda
 */
export function detectUgandaPaymentDestination(input: string): UgandaPaymentDestination {
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
    const isValidPhone = validateUgandaPhoneNumber(cleanInput);

    // Only treat as phone if it matches mobile prefixes
    if (isValidPhone && isMobileMoneyPrefix(cleanInput)) {
      return {
        type: 'mobile_money',
        value: trimmedInput,
        formatted: formatUgandaPhoneNumber(cleanInput),
        isValid: isValidPhone
      };
    }
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
  // Convert to 256 format
  let number256: string;
  if (cleanNumber.startsWith('256')) {
    number256 = cleanNumber;
  } else if (cleanNumber.startsWith('0')) {
    number256 = '256' + cleanNumber.slice(1);
  } else if (cleanNumber.length === 9) {
    number256 = '256' + cleanNumber;
  } else {
    return false;
  }

  const threeDigitPrefix = number256.slice(3, 6);

  // Uganda mobile prefixes
  const mobileMoneyPrefixes = [
    // MTN Uganda
    '077', '078', '076', '039',
    // Airtel Uganda
    '070', '075', '074'
  ];

  return mobileMoneyPrefixes.includes(threeDigitPrefix);
}

/**
 * Gets user-friendly description of payment destination
 */
export function getUgandaPaymentDescription(destination: UgandaPaymentDestination): string {
  switch (destination.type) {
    case 'mobile_money':
      return 'Mobile Money Number';
    default:
      return 'Unknown payment method';
  }
}

/**
 * Gets placeholder text for Uganda payment input
 */
export function getUgandaPaymentPlaceholder(): string {
  return 'Enter mobile money number (256...)';
}

/**
 * Test phone numbers for Uganda (development)
 */
export const TEST_UGANDA_PHONE_NUMBERS = {
  valid: [
    '+256771234567',  // MTN
    '256771234567',   // MTN
    '0771234567',     // MTN local
    '771234567',      // MTN without 0
    '0701234567',     // Airtel
    '0751234567',     // Airtel
    '0781234567',     // MTN
  ],
  invalid: [
    '256771234',      // Too short
    '25677123456789', // Too long
    '771234',         // Too short
    'phone123',       // Contains letters
    '0191234567',     // Invalid prefix
  ]
};

/**
 * Validates Uganda payment details
 */
export function validateUgandaPaymentDetails(
  value: string
): { isValid: boolean; error?: string } {
  const isValid = validateUgandaPhoneNumber(value);
  return {
    isValid,
    error: isValid ? undefined : 'Invalid Uganda mobile money number format'
  };
}
