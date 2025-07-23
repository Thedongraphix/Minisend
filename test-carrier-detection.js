// Quick test for carrier detection
const { validateAndDetectKenyanNumber } = require('./lib/utils/phoneCarrier.ts');

// Test cases with known Safaricom vs Airtel numbers
const testNumbers = [
  '0722123456', // Safaricom
  '0700123456', // Safaricom  
  '0732123456', // Airtel
  '0750123456', // Airtel
  '254722123456', // Safaricom international format
  '254732123456', // Airtel international format
];

console.log('Testing Kenyan carrier detection:');
console.log('='.repeat(50));

testNumbers.forEach(number => {
  const result = validateAndDetectKenyanNumber(number);
  console.log(`Input: ${number}`);
  console.log(`  Valid: ${result.isValid}`);
  if (result.isValid) {
    console.log(`  Carrier: ${result.carrier}`);
    console.log(`  Display: ${result.displayName}`);
    console.log(`  Provider: ${result.paycrestProvider}`);
    console.log(`  Formatted: ${result.formattedNumber}`);
  } else {
    console.log(`  Error: ${result.error}`);
  }
  console.log('');
});