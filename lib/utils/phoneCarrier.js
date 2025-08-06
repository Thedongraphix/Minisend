// Kenyan Mobile Network Operator (MNO) detection - JavaScript version
// Based on official number ranges from Communications Authority of Kenya

/**
 * Detects Kenyan mobile carrier based on phone number prefixes
 * @param {string} phoneNumber - Phone number in format 254XXXXXXXXX or 07XXXXXXXX
 * @returns {string} Carrier name
 */
function detectKenyanCarrier(phoneNumber) {
  // Clean the phone number - remove all non-digits
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Convert to 254 format for consistent checking
  let number254;
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
  console.warn(`Unknown Kenyan prefix: ${threeDigitPrefix}, defaulting to SAFARICOM`);
  return 'SAFARICOM';
}

module.exports = {
  detectKenyanCarrier
}