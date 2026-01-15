/**
 * Till Number Validation and Detection Utilities
 * 
 * M-Pesa till numbers in Kenya typically follow these patterns:
 * - 5-7 digits long
 * - All numeric
 * - No special characters
 */

export interface PaymentDestination {
  type: 'phone' | 'till' | 'paybill' | 'unknown';
  value: string;
  formatted: string;
  isValid: boolean;
  accountNumber?: string; // For paybill numbers
}

/**
 * Validates M-Pesa till numbers
 * Till numbers are typically 5-7 digits
 */
export function validateTillNumber(tillNumber: string): boolean {
  // Remove any non-digits
  const cleanTill = tillNumber.replace(/\D/g, '');
  
  // Check if it's 5-7 digits
  if (cleanTill.length < 5 || cleanTill.length > 7) {
    return false;
  }
  
  // Check if all digits
  return /^\d+$/.test(cleanTill);
}

/**
 * Validates M-Pesa paybill numbers
 * Paybill numbers are typically 5-7 digits (e.g., 40200, 400200)
 */
export function validatePaybillNumber(paybillNumber: string): boolean {
  const cleanPaybill = paybillNumber.replace(/\D/g, '');
  return cleanPaybill.length >= 5 && cleanPaybill.length <= 7 && /^\d+$/.test(cleanPaybill);
}

/**
 * Paybill numbers blocked by Pretium
 * These paybills are flagged and not supported for payments
 */
export const BLOCKED_PAYBILLS = [
  "955100", "7650880", "888880", "5212121", "888888", "79079", "260680",
  "247979", "800088", "718085", "8228252", "955700", "290290", "4087777",
  "290059", "290077", "779900", "290020", "565619", "290680", "880185",
  "212927", "999880", "290090", "940828", "7325515", "852048", "299690",
  "260077", "663661", "783227", "290011", "141114", "811822", "290028",
  "920620", "427427", "4998983", "7011780", "569699", "808087", "290063",
  "999833", "547717", "4076659", "499995", "290898", "498098", "444268",
  "562424", "4999902", "4135837", "290067", "565612", "333345", "4029669"
];

/**
 * Checks if a paybill number is blocked by Pretium
 */
export function isPaybillBlocked(paybillNumber: string): boolean {
  const cleanPaybill = paybillNumber.replace(/\D/g, '');
  return BLOCKED_PAYBILLS.includes(cleanPaybill);
}

/**
 * Validates paybill account field (can be account number OR account name)
 * Some merchants use account numbers (numeric), others use account names (alphanumeric)
 */
export function validatePaybillAccount(account: string): boolean {
  const trimmed = account.trim();
  // Must be at least 1 character and not empty
  return trimmed.length >= 1;
}

/**
 * @deprecated Use validatePaybillAccount instead - supports both numbers and names
 */
export function validatePaybillAccountNumber(accountNumber: string): boolean {
  return validatePaybillAccount(accountNumber);
}

/**
 * Validates Kenyan phone numbers
 */
export function validateKenyanPhoneNumber(phoneNumber: string): boolean {
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  // Check for valid Kenyan phone number patterns
  if (cleanPhone.startsWith('254')) {
    return cleanPhone.length === 12; // 254XXXXXXXXX
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
 * Validates Ghanaian phone numbers
 */
export function validateGhanaianPhoneNumber(phoneNumber: string): boolean {
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  // Check for valid Ghanaian phone number patterns
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
 * Format phone number for API based on country
 */
export function formatPhoneForAPI(phoneNumber: string, currency: 'KES' | 'GHS'): string {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const countryCode = currency === 'KES' ? '254' : '233';

  if (cleanPhone.startsWith(countryCode)) {
    return cleanPhone;
  }

  if (cleanPhone.startsWith('0')) {
    return countryCode + cleanPhone.substring(1);
  }

  return countryCode + cleanPhone;
}

/**
 * Formats till number for PayCrest API
 */
export function formatTillNumber(tillNumber: string): string {
  return tillNumber.replace(/\D/g, '');
}

/**
 * Formats phone number for PayCrest API
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  if (cleanPhone.startsWith('254')) {
    return cleanPhone;
  }
  
  if (cleanPhone.startsWith('0')) {
    return '254' + cleanPhone.substring(1);
  }
  
  return '254' + cleanPhone;
}

/**
 * Detects payment destination type and validates input
 * Note: Since till and paybill numbers can overlap in length, we default to till
 * Users should specify paybill explicitly with account number
 */
export function detectPaymentDestination(input: string): PaymentDestination {
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
  
  // Check for phone number patterns first (longest)
  if (cleanInput.length >= 9) {
    const isValidPhone = validateKenyanPhoneNumber(cleanInput);
    return {
      type: 'phone',
      value: trimmedInput,
      formatted: formatPhoneNumber(cleanInput),
      isValid: isValidPhone
    };
  }
  
  // Check for till/paybill number pattern (5-7 digits)
  // Default to till number since they're more common for direct payments
  if (cleanInput.length >= 5 && cleanInput.length <= 7) {
    const isValidTill = validateTillNumber(cleanInput);
    return {
      type: 'till',
      value: trimmedInput,
      formatted: cleanInput,
      isValid: isValidTill
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
 * Specifically detects and validates paybill numbers with account (number or name)
 * Account can be numeric (account number) or alphanumeric (account name)
 */
export function detectPaybillWithAccount(paybillNumber: string, account: string): PaymentDestination {
  const cleanPaybill = paybillNumber.replace(/\D/g, '');
  const trimmedAccount = account.trim();

  const isValidPaybill = validatePaybillNumber(cleanPaybill);
  const isValidAccount = validatePaybillAccount(trimmedAccount);

  return {
    type: 'paybill',
    value: paybillNumber.trim(),
    formatted: cleanPaybill,
    accountNumber: trimmedAccount,
    isValid: isValidPaybill && isValidAccount
  };
}

/**
 * Gets user-friendly description of payment destination
 */
export function getPaymentDestinationDescription(destination: PaymentDestination): string {
  switch (destination.type) {
    case 'phone':
      return 'M-Pesa Phone Number';
    case 'till':
      return 'M-Pesa Till Number';
    case 'paybill':
      return 'M-Pesa Paybill Number';
    default:
      return 'Unknown payment method';
  }
}

/**
 * Gets placeholder text for payment input
 */
export function getPaymentInputPlaceholder(currency: 'KES' | 'NGN' | 'GHS' | 'UGX'): string {
  if (currency === 'KES') {
    return 'Enter phone number (254...) or till number (12345)';
  }
  if (currency === 'GHS') {
    return 'Enter mobile money number (233...) or bank account';
  }
  if (currency === 'UGX') {
    return 'Enter mobile money number (256...)';
  }
  return 'Enter bank account number';
}

/**
 * Validates if payment destination is supported for currency
 */
export function isPaymentDestinationSupported(
  destination: PaymentDestination,
  currency: 'KES' | 'NGN' | 'GHS' | 'UGX'
): boolean {
  if (currency === 'NGN') {
    return false; // Till numbers not supported for NGN
  }

  if (currency === 'GHS' || currency === 'UGX') {
    return destination.type === 'phone'; // GHS and UGX support mobile money only
  }

  return destination.type === 'phone' || destination.type === 'till';
}

/**
 * Test till numbers for development
 */
export const TEST_TILL_NUMBERS = {
  valid: [
    '12345',   // 5 digits
    '123456',  // 6 digits  
    '1234567', // 7 digits
    '54321',   // Another valid 5-digit
    '987654'   // Another valid 6-digit
  ],
  invalid: [
    '1234',     // Too short
    '12345678', // Too long
    'abc123',   // Contains letters
    '12-345',   // Contains special chars
    ''          // Empty
  ]
};

/**
 * Test paybill numbers for development
 */
export const TEST_PAYBILL_NUMBERS = {
  valid: [
    { paybill: '40200', account: '1234567890' },    // Common M-Shwari
    { paybill: '400200', account: '987654321' },    // 6-digit paybill
    { paybill: '522522', account: '123456789012' }, // KCB paybill
    { paybill: '967600', account: '555666777' }     // Equity paybill
  ],
  invalid: [
    { paybill: '123', account: '1234567890' },      // Paybill too short
    { paybill: '40200', account: '12345' },         // Account too short
    { paybill: '12345678', account: '1234567890' }, // Paybill too long
    { paybill: 'ABC40200', account: '1234567890' }  // Non-numeric paybill
  ]
};

/**
 * Test phone numbers for development
 */
export const TEST_PHONE_NUMBERS = {
  kenya: {
    valid: [
      '+254712345678',
      '254712345678',
      '0712345678',
      '712345678'
    ],
    invalid: [
      '254712345',    // Too short
      '25471234567890', // Too long
      '712345',       // Too short
      'phone123'      // Contains letters
    ]
  },
  ghana: {
    valid: [
      '+233241234567',
      '233241234567',
      '0241234567',
      '241234567'
    ],
    invalid: [
      '233241234',    // Too short
      '23324123456789', // Too long
      '241234',       // Too short
      'phone123'      // Contains letters
    ]
  }
};