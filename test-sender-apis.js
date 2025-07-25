#!/usr/bin/env node

/**
 * PayCrest Sender API Test Script
 * Focused on testing sender endpoints for USDC offramp to KES/NGN
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://minisend.xyz';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function makeRequest(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  logInfo(`Testing ${method} ${endpoint}`);
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      logSuccess(`${method} ${endpoint} - Status: ${response.status}`);
      console.log('✅ Response:', JSON.stringify(data, null, 2));
      return { success: true, data, status: response.status };
    } else {
      logError(`${method} ${endpoint} - Status: ${response.status}`);
      console.log('❌ Error Response:', JSON.stringify(data, null, 2));
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    logError(`${method} ${endpoint} - Network Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testKenyaOfframp() {
  log('\n🇰🇪 Testing Kenya Offramp (USDC → KES via M-Pesa)', 'cyan');
  
  const orderData = {
    amount: 1,
    phoneNumber: '+254712345678', // Safaricom number
    accountName: 'John Doe Test',
    rate: 150.5,
    returnAddress: '0x1234567890123456789012345678901234567890',
    currency: 'KES'
  };
  
  logInfo('Creating KES M-Pesa order...');
  const result = await makeRequest('/api/paycrest/orders', 'POST', orderData);
  
  if (result.success && result.data.order) {
    const orderId = result.data.order.id;
    logSuccess(`✅ Kenya order created successfully!`);
    logInfo(`Order ID: ${orderId}`);
    logInfo(`Receive Address: ${result.data.order.receiveAddress}`);
    logInfo(`Valid Until: ${result.data.order.validUntil}`);
    logInfo(`Total Amount: ${result.data.order.totalAmountWithFees} USDC`);
    logInfo(`Recipient: ${result.data.order.recipient.phoneNumber} (${result.data.order.recipient.provider})`);
    
    // Test order status retrieval
    logInfo('\\nTesting order status retrieval...');
    await makeRequest(`/api/paycrest/orders?orderId=${orderId}`);
    
    return orderId;
  } else {
    logError('Failed to create Kenya order');
    return null;
  }
}

async function testNigeriaOfframp() {
  log('\n🇳🇬 Testing Nigeria Offramp (USDC → NGN via Bank)', 'cyan');
  
  const orderData = {
    amount: 1,
    phoneNumber: '+2348012345678', // Nigerian number (placeholder for account)
    accountName: 'Jane Doe Test',
    rate: 1650.0,
    returnAddress: '0x1234567890123456789012345678901234567890',
    currency: 'NGN'
  };
  
  logInfo('Creating NGN bank order...');
  const result = await makeRequest('/api/paycrest/orders', 'POST', orderData);
  
  if (result.success && result.data.order) {
    const orderId = result.data.order.id;
    logSuccess(`✅ Nigeria order created successfully!`);
    logInfo(`Order ID: ${orderId}`);
    logInfo(`Receive Address: ${result.data.order.receiveAddress}`);
    logInfo(`Valid Until: ${result.data.order.validUntil}`);
    logInfo(`Total Amount: ${result.data.order.totalAmountWithFees} USDC`);
    logInfo(`Recipient: ${result.data.order.recipient.phoneNumber}`);
    
    return orderId;
  } else {
    logError('Failed to create Nigeria order');
    return null;
  }
}

async function testSenderStats() {
  log('\n📊 Testing Sender Stats', 'cyan');
  
  await makeRequest('/api/paycrest/sender/stats');
}

async function testRatesQuote() {
  log('\n💱 Testing Rate Quotes', 'cyan');
  
  // These might be integrated into the main order endpoint
  logInfo('Rate quotes are typically included in order creation responses');
}

async function main() {
  log('🚀 PayCrest Sender API Test Suite', 'cyan');
  log('==================================', 'cyan');
  log('Testing USDC offramp to KES (M-Pesa) and NGN (Bank)', 'yellow');
  
  try {
    // Test Kenya offramp
    const kenyaOrderId = await testKenyaOfframp();
    
    // Test Nigeria offramp  
    const nigeriaOrderId = await testNigeriaOfframp();
    
    // Test sender stats
    await testSenderStats();
    
    // Test rates
    await testRatesQuote();
    
    log('\n📋 Test Summary', 'cyan');
    log('===============', 'cyan');
    
    if (kenyaOrderId) {
      logSuccess(`Kenya order created: ${kenyaOrderId}`);
    } else {
      logError('Kenya order creation failed');
    }
    
    if (nigeriaOrderId) {
      logSuccess(`Nigeria order created: ${nigeriaOrderId}`);
    } else {
      logError('Nigeria order creation failed');
    }
    
    log('\n💡 Next Steps:', 'yellow');
    log('1. Send USDC to the receive addresses provided');
    log('2. Monitor order status via the GET endpoint');
    log('3. Check your PayCrest dashboard for order updates');
    log('4. Recipients should receive funds in M-Pesa/Bank once USDC is sent');
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the test suite
if (require.main === module) {
  main().catch(error => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}