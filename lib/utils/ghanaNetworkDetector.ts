// Ghana Mobile Network Operator (MNO) detection
// Based on official number ranges from National Communications Authority (NCA) of Ghana

export type GhanaNetwork = 'MTN' | 'VODAFONE' | 'AIRTELTIGO' | 'GLO' | 'UNKNOWN';

/**
 * Detects Ghana mobile network based on phone number prefixes
 * @param phoneNumber - Phone number in format 233XXXXXXXXX or 0XXXXXXXXX
 * @returns Network name
 */
export function detectGhanaNetwork(phoneNumber: string): GhanaNetwork {
  // Clean the phone number - remove all non-digits
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  // Convert to 233 format for consistent checking
  let number233: string;
  if (cleanNumber.startsWith('233')) {
    number233 = cleanNumber;
  } else if (cleanNumber.startsWith('0')) {
    number233 = '233' + cleanNumber.slice(1);
  } else if (cleanNumber.length === 9) {
    number233 = '233' + cleanNumber;
  } else {
    return 'UNKNOWN';
  }

  // Extract the 3-digit prefix after country code (233)
  const threeDigitPrefix = number233.slice(3, 6);

  // MTN prefixes (Mobile Money supported)
  const mtnPrefixes = [
    '024', '054', '055', '059'
  ];

  // Vodafone/Telecel prefixes (Vodafone Cash)
  const vodafonePrefixes = [
    '020', '050'
  ];

  // AirtelTigo prefixes (AirtelTigo Money)
  const airteltigoPrefixes = [
    '027', '026', '057', '056'
  ];

  // Glo prefixes (limited mobile money)
  const gloPrefixes = [
    '023'
  ];

  // Check against known prefixes
  if (mtnPrefixes.includes(threeDigitPrefix)) {
    return 'MTN';
  }

  if (vodafonePrefixes.includes(threeDigitPrefix)) {
    return 'VODAFONE';
  }

  if (airteltigoPrefixes.includes(threeDigitPrefix)) {
    return 'AIRTELTIGO';
  }

  if (gloPrefixes.includes(threeDigitPrefix)) {
    return 'GLO';
  }

  // Default to MTN for unknown prefixes (most popular)
  // This helps ensure transactions don't fail due to new number ranges
  console.warn(`Unknown Ghana prefix: ${threeDigitPrefix}, defaulting to MTN`);
  return 'MTN';
}

/**
 * Maps detected network to Pretium/provider format
 * @param network - Detected network
 * @returns Pretium-compatible network string
 */
export function mapNetworkToPretiumProvider(network: GhanaNetwork): string {
  switch (network) {
    case 'MTN':
      return 'MTN';
    case 'VODAFONE':
      return 'Vodafone';
    case 'AIRTELTIGO':
      return 'AirtelTigo';
    case 'GLO':
      return 'Glo';
    case 'UNKNOWN':
    default:
      // Default to MTN (most popular in Ghana)
      return 'MTN';
  }
}

/**
 * Gets user-friendly network name for display
 * @param network - Detected network
 * @returns Display name
 */
export function getGhanaNetworkDisplayName(network: GhanaNetwork): string {
  switch (network) {
    case 'MTN':
      return 'MTN Mobile Money';
    case 'VODAFONE':
      return 'Vodafone Cash';
    case 'AIRTELTIGO':
      return 'AirtelTigo Money';
    case 'GLO':
      return 'Glo Mobile Money';
    case 'UNKNOWN':
    default:
      return 'Mobile Money';
  }
}

/**
 * Validates and detects network for Ghana phone numbers
 * @param phoneNumber - Input phone number
 * @returns Validation and network info
 */
export function validateAndDetectGhanaNumber(phoneNumber: string) {
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  // Validate format: 233XXXXXXXXX, 0XXXXXXXXX, or XXXXXXXXX
  const isValid =
    (cleanNumber.startsWith('233') && cleanNumber.length === 12) ||
    (cleanNumber.startsWith('0') && cleanNumber.length === 10) ||
    (cleanNumber.length === 9);

  if (!isValid) {
    return {
      isValid: false,
      error: 'Invalid Ghana phone number format',
      network: 'UNKNOWN' as GhanaNetwork,
      formattedNumber: '',
      pretiumProvider: 'MTN'
    };
  }

  // Format to 233 format
  let formattedNumber: string;
  if (cleanNumber.startsWith('233')) {
    formattedNumber = cleanNumber;
  } else if (cleanNumber.startsWith('0')) {
    formattedNumber = '233' + cleanNumber.slice(1);
  } else {
    formattedNumber = '233' + cleanNumber;
  }

  // Detect network
  const network = detectGhanaNetwork(formattedNumber);
  const pretiumProvider = mapNetworkToPretiumProvider(network);

  return {
    isValid: true,
    error: null,
    network,
    formattedNumber,
    pretiumProvider,
    displayName: getGhanaNetworkDisplayName(network)
  };
}

/**
 * Checks if a network supports mobile money transactions
 * @param network - Network to check
 * @returns True if mobile money is supported
 */
export function supportsGhanaMobileMoney(network: GhanaNetwork): boolean {
  // All major networks in Ghana support mobile money
  return network !== 'UNKNOWN';
}

/**
 * Gets mobile money service name for network
 * @param network - Network name
 * @returns Service name
 */
export function getGhanaMobileMoneyService(network: GhanaNetwork): string {
  switch (network) {
    case 'MTN':
      return 'MTN MoMo';
    case 'VODAFONE':
      return 'Vodafone Cash';
    case 'AIRTELTIGO':
      return 'AirtelTigo Money';
    case 'GLO':
      return 'Glo Mobile Money';
    default:
      return 'Mobile Money';
  }
}
