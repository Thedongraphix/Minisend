// Uganda Mobile Network Operator (MNO) detection
// Based on official number ranges from Uganda Communications Commission (UCC)

export type UgandaNetwork = 'MTN' | 'AIRTEL' | 'UNKNOWN';

/**
 * Detects Uganda mobile network based on phone number prefixes
 * @param phoneNumber - Phone number in format 256XXXXXXXXX or 0XXXXXXXXX
 * @returns Network name
 */
export function detectUgandaNetwork(phoneNumber: string): UgandaNetwork {
  // Clean the phone number - remove all non-digits
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  // Convert to 256 format for consistent checking
  let number256: string;
  if (cleanNumber.startsWith('256')) {
    number256 = cleanNumber;
  } else if (cleanNumber.startsWith('0')) {
    number256 = '256' + cleanNumber.slice(1);
  } else if (cleanNumber.length === 9) {
    number256 = '256' + cleanNumber;
  } else {
    return 'UNKNOWN';
  }

  // Extract the 3-digit prefix after country code (256)
  const threeDigitPrefix = number256.slice(3, 6);

  // MTN Uganda prefixes (Mobile Money supported)
  const mtnPrefixes = [
    '077', '078', '076', '039'
  ];

  // Airtel Uganda prefixes (Airtel Money)
  const airtelPrefixes = [
    '070', '075', '074'
  ];

  // Check against known prefixes
  if (mtnPrefixes.includes(threeDigitPrefix)) {
    return 'MTN';
  }

  if (airtelPrefixes.includes(threeDigitPrefix)) {
    return 'AIRTEL';
  }

  // Default to MTN for unknown prefixes (most popular in Uganda)
  // This helps ensure transactions don't fail due to new number ranges
  return 'MTN';
}

/**
 * Maps detected network to Pretium/provider format
 * @param network - Detected network
 * @returns Pretium-compatible network string
 */
export function mapNetworkToPretiumProvider(network: UgandaNetwork): string {
  switch (network) {
    case 'MTN':
      return 'MTN';
    case 'AIRTEL':
      return 'Airtel';
    case 'UNKNOWN':
    default:
      // Default to MTN (most popular in Uganda)
      return 'MTN';
  }
}

/**
 * Gets user-friendly network name for display
 * @param network - Detected network
 * @returns Display name
 */
export function getUgandaNetworkDisplayName(network: UgandaNetwork): string {
  switch (network) {
    case 'MTN':
      return 'MTN Mobile Money';
    case 'AIRTEL':
      return 'Airtel Money';
    case 'UNKNOWN':
    default:
      return 'Mobile Money';
  }
}

/**
 * Validates and detects network for Uganda phone numbers
 * @param phoneNumber - Input phone number
 * @returns Validation and network info
 */
export function validateAndDetectUgandaNumber(phoneNumber: string) {
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  // Validate format: 256XXXXXXXXX, 0XXXXXXXXX, or XXXXXXXXX
  const isValid =
    (cleanNumber.startsWith('256') && cleanNumber.length === 12) ||
    (cleanNumber.startsWith('0') && cleanNumber.length === 10) ||
    (cleanNumber.length === 9);

  if (!isValid) {
    return {
      isValid: false,
      error: 'Invalid Uganda phone number format',
      network: 'UNKNOWN' as UgandaNetwork,
      formattedNumber: '',
      pretiumProvider: 'MTN'
    };
  }

  // Format to 256 format
  let formattedNumber: string;
  if (cleanNumber.startsWith('256')) {
    formattedNumber = cleanNumber;
  } else if (cleanNumber.startsWith('0')) {
    formattedNumber = '256' + cleanNumber.slice(1);
  } else {
    formattedNumber = '256' + cleanNumber;
  }

  // Detect network
  const network = detectUgandaNetwork(formattedNumber);
  const pretiumProvider = mapNetworkToPretiumProvider(network);

  return {
    isValid: true,
    error: null,
    network,
    formattedNumber,
    pretiumProvider,
    displayName: getUgandaNetworkDisplayName(network)
  };
}

/**
 * Checks if a network supports mobile money transactions
 * @param network - Network to check
 * @returns True if mobile money is supported
 */
export function supportsUgandaMobileMoney(network: UgandaNetwork): boolean {
  // Both major networks in Uganda support mobile money
  return network !== 'UNKNOWN';
}

/**
 * Gets mobile money service name for network
 * @param network - Network name
 * @returns Service name
 */
export function getUgandaMobileMoneyService(network: UgandaNetwork): string {
  switch (network) {
    case 'MTN':
      return 'MTN MoMo';
    case 'AIRTEL':
      return 'Airtel Money';
    default:
      return 'Mobile Money';
  }
}
