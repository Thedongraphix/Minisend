// Kenyan Mobile Network Operator (MNO) detection
// Based on official number ranges from Communications Authority of Kenya

export type KenyanCarrier = 'SAFARICOM' | 'AIRTEL' | 'TELKOM' | 'EQUITEL' | 'UNKNOWN';

/**
 * Detects Kenyan mobile carrier based on phone number prefixes
 * @param phoneNumber - Phone number in format 254XXXXXXXXX or 07XXXXXXXX
 * @returns Carrier name
 */
export function detectKenyanCarrier(phoneNumber: string): KenyanCarrier {
  // Clean the phone number - remove all non-digits
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Convert to 254 format for consistent checking
  let number254: string;
  if (cleanNumber.startsWith('254')) {
    number254 = cleanNumber;
  } else if (cleanNumber.startsWith('0')) {
    number254 = '254' + cleanNumber.slice(1);
  } else if (cleanNumber.length === 9) {
    number254 = '254' + cleanNumber;
  } else {
    return 'UNKNOWN';
  }

  // Extract the 3-digit prefix after country code
  const threeDigitPrefix = number254.slice(3, 6);

  // Safaricom prefixes (M-Pesa)
  const safaricomPrefixes = [
    '700', '701', '702', '703', '704', '705', '706', '707', '708', '709',
    '710', '711', '712', '713', '714', '715', '716', '717', '718', '719',
    '720', '721', '722', '723', '724', '725', '726', '727', '728', '729',
    '740', '741', '742', '743', '744', '745', '746', '747', '748', '749',
    '110', '111', '112', '113', '114', '115', '116', '117', '118', '119'
  ];

  // Airtel prefixes
  const airtelPrefixes = [
    '730', '731', '732', '733', '734', '735', '736', '737', '738', '739',
    '750', '751', '752', '753', '754', '755', '756', '757', '758', '759',
    '100', '101', '102', '103', '104', '105', '106', '107', '108', '109'
  ];

  // Telkom prefixes
  const telkomPrefixes = [
    '770', '771', '772', '773', '774', '775', '776', '777', '778', '779'
  ];

  // Equitel prefixes
  const equitelPrefixes = [
    '763', '764', '765'
  ];

  // Check against known prefixes
  if (safaricomPrefixes.includes(threeDigitPrefix)) {
    return 'SAFARICOM';
  }
  
  if (airtelPrefixes.includes(threeDigitPrefix)) {
    return 'AIRTEL';
  }
  
  if (telkomPrefixes.includes(threeDigitPrefix)) {
    return 'TELKOM';
  }
  
  if (equitelPrefixes.includes(threeDigitPrefix)) {
    return 'EQUITEL';
  }

  // Default to SAFARICOM for unknown prefixes (most common)
  // This helps ensure transactions don't fail due to new number ranges
  console.warn(`Unknown Kenyan prefix: ${threeDigitPrefix}, defaulting to SAFARICOM`);
  return 'SAFARICOM';
}

/**
 * Maps detected carrier to PayCrest provider format
 * @param carrier - Detected carrier
 * @returns PayCrest-compatible provider string
 */
export function mapCarrierToPaycrestProvider(carrier: KenyanCarrier): 'MPESA' | 'AIRTEL' {
  switch (carrier) {
    case 'SAFARICOM':
      return 'MPESA';
    case 'AIRTEL':
      return 'AIRTEL';
    case 'TELKOM':
    case 'EQUITEL':
    case 'UNKNOWN':
    default:
      // Default to MPESA for carriers not directly supported
      return 'MPESA';
  }
}

/**
 * Gets user-friendly carrier name for display
 * @param carrier - Detected carrier
 * @returns Display name
 */
export function getCarrierDisplayName(carrier: KenyanCarrier): string {
  switch (carrier) {
    case 'SAFARICOM':
      return 'Safaricom M-Pesa';
    case 'AIRTEL':
      return 'Airtel Money';
    case 'TELKOM':
      return 'Telkom T-Kash';
    case 'EQUITEL':
      return 'Equitel EazzyPay';
    case 'UNKNOWN':
    default:
      return 'Mobile Money';
  }
}

/**
 * Validates and detects carrier for Kenyan phone numbers
 * @param phoneNumber - Input phone number
 * @returns Validation and carrier info
 */
export function validateAndDetectKenyanNumber(phoneNumber: string) {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Validate format
  if (!cleanNumber.match(/^(254|0)(7|1)\d{8}$/)) {
    return {
      isValid: false,
      error: 'Invalid Kenyan phone number format',
      carrier: 'UNKNOWN' as KenyanCarrier,
      formattedNumber: '',
      paycrestProvider: 'MPESA' as const
    };
  }

  // Format to 254 format
  const formattedNumber = cleanNumber.startsWith('254') 
    ? cleanNumber 
    : cleanNumber.replace(/^0/, '254');

  // Detect carrier
  const carrier = detectKenyanCarrier(formattedNumber);
  const paycrestProvider = mapCarrierToPaycrestProvider(carrier);

  return {
    isValid: true,
    error: null,
    carrier,
    formattedNumber,
    paycrestProvider,
    displayName: getCarrierDisplayName(carrier)
  };
}