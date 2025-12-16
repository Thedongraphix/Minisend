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
 * Validates paybill account numbers
 * Account numbers for paybills can vary but typically 6-12 digits
 */
export function validatePaybillAccountNumber(accountNumber: string): boolean {
  const cleanAccount = accountNumber.replace(/\D/g, '');
  return cleanAccount.length >= 6 && cleanAccount.length <= 12 && /^\d+$/.test(cleanAccount);
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
 * Specifically detects and validates paybill numbers with account numbers
 */
export function detectPaybillWithAccount(paybillNumber: string, accountNumber: string): PaymentDestination {
  const cleanPaybill = paybillNumber.replace(/\D/g, '');
  const cleanAccount = accountNumber.replace(/\D/g, '');
  
  const isValidPaybill = validatePaybillNumber(cleanPaybill);
  const isValidAccount = validatePaybillAccountNumber(cleanAccount);
  
  return {
    type: 'paybill',
    value: paybillNumber.trim(),
    formatted: cleanPaybill,
    accountNumber: cleanAccount,
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
export function getPaymentInputPlaceholder(currency: 'KES' | 'NGN' | 'GHS'): string {
  if (currency === 'KES') {
    return 'Enter phone number (254...) or till number (12345)';
  }
  if (currency === 'GHS') {
    return 'Enter mobile money number (233...) or bank account';
  }
  return 'Enter bank account number';
}

/**
 * Validates if payment destination is supported for currency
 */
export function isPaymentDestinationSupported(
  destination: PaymentDestination,
  currency: 'KES' | 'NGN' | 'GHS'
): boolean {
  if (currency === 'NGN') {
    return false; // Till numbers not supported for NGN
  }

  if (currency === 'GHS') {
    return destination.type === 'phone'; // GHS supports mobile money only through this function
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
};