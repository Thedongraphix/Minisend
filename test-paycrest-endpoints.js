#!/usr/bin/env node

/**
 * PayCrest API Endpoints Test Script
 * Tests all implemented PayCrest API endpoints with proper error handling
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_WALLET = '0x1234567890123456789012345678901234567890';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper functions
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

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
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
  
  logInfo(`Making ${method} request to: ${endpoint}`);
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      logSuccess(`${method} ${endpoint} - Status: ${response.status}`);
      console.log('Response:', JSON.stringify(data, null, 2));
      return { success: true, data, status: response.status };
    } else {
      logError(`${method} ${endpoint} - Status: ${response.status}`);
      console.log('Error Response:', JSON.stringify(data, null, 2));
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    logError(`${method} ${endpoint} - Network Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testSenderEndpoints() {
  log('\n🔸 Testing Sender Endpoints', 'cyan');
  
  // Test create order
  const orderData = {
    amount: 1,
    phoneNumber: '+254712345678',
    accountName: 'Test User',
    rate: 150.5,
    returnAddress: TEST_WALLET,
    currency: 'KES'
  };
  
  const createOrderResult = await makeRequest('/api/paycrest/orders', 'POST', orderData);
  let orderId = null;
  
  if (createOrderResult.success && createOrderResult.data.order) {
    orderId = createOrderResult.data.order.id;
    logSuccess(`Order created with ID: ${orderId}`);
  }
  
  // Test get order status
  if (orderId) {
    await makeRequest(`/api/paycrest/orders?orderId=${orderId}`);
  }
  
  // Test sender stats
  await makeRequest('/api/paycrest/sender/stats');
  
  return { orderId };
}

async function testProviderEndpoints() {
  log('\n🔸 Testing Provider Endpoints', 'cyan');
  
  // Test provider orders
  await makeRequest('/api/paycrest/provider/orders');
  
  // Test provider rates
  await makeRequest('/api/paycrest/provider/rates/USDC/KES');
  await makeRequest('/api/paycrest/provider/rates/USDC/NGN');
  
  // Test provider stats
  await makeRequest('/api/paycrest/provider/stats');
  
  // Test provider node info
  await makeRequest('/api/paycrest/provider/node-info');
}

async function testGeneralEndpoints() {
  log('\n🔸 Testing General Endpoints', 'cyan');
  
  // Test currencies
  await makeRequest('/api/paycrest/general/currencies');
  
  // Test institutions for different currencies
  await makeRequest('/api/paycrest/general/institutions/KES');
  await makeRequest('/api/paycrest/general/institutions/NGN');
  
  // Test tokens
  await makeRequest('/api/paycrest/general/tokens');
  
  // Test aggregator public key
  await makeRequest('/api/paycrest/general/pubkey');
  
  // Test account verification
  const verificationData = {
    institution: 'SAFARICOM',
    accountIdentifier: '254712345678',
    accountName: 'Test User',
    currency: 'KES'
  };
  await makeRequest('/api/paycrest/general/verify-account', 'POST', verificationData);
}

async function testRatesEndpoint() {
  log('\n🔸 Testing Rates Endpoint', 'cyan');
  
  // Test existing rates endpoint (if available)
  // This might be integrated into the orders endpoint or available separately
  logInfo('Rates are typically tested via the order creation process');
}

async function testWebhookEndpoint() {
  log('\n🔸 Testing Webhook Endpoint', 'cyan');
  
  // Test webhook endpoint with sample data
  const webhookData = {
    event: 'order.validated',
    orderId: 'test-order-id',
    status: 'payment_order.validated',
    timestamp: new Date().toISOString(),
    data: {
      id: 'test-order-id',
      status: 'payment_order.validated',
      amount: '1.0',
      token: 'USDC',
      network: 'base'
    }
  };
  
  logWarning('Webhook testing requires proper signature - this will likely fail without proper PayCrest signature');
  await makeRequest('/api/paycrest/webhook', 'POST', webhookData);
}

async function runHealthCheck() {
  log('\n🔸 Running Basic Health Check', 'cyan');
  
  // Check if server is running
  try {
    const response = await fetch(`${BASE_URL}/api/paycrest/general/currencies`);
    if (response.ok) {
      logSuccess('Server is running and responding');
    } else {
      logError('Server is running but returned error status');
    }
  } catch (error) {
    logError(`Server appears to be down: ${error.message}`);
    logError('Make sure your Next.js server is running with: npm run dev');
    process.exit(1);
  }
}

async function main() {
  log('🚀 PayCrest API Endpoints Test Suite', 'magenta');
  log('=====================================', 'magenta');
  
  // Environment check
  if (!process.env.PAYCREST_API_KEY) {
    logWarning('PAYCREST_API_KEY not found in environment variables');
    logWarning('Some tests may fail without proper API key configuration');
  }
  
  await runHealthCheck();
  
  try {
    // Test all endpoint categories
    const { orderId } = await testSenderEndpoints();
    await testProviderEndpoints();
    await testGeneralEndpoints();
    await testRatesEndpoint();
    await testWebhookEndpoint();
    
    log('\n📊 Test Summary', 'magenta');
    log('==============', 'magenta');
    logInfo('All endpoint tests completed');
    logInfo('Check the output above for specific results');
    
    if (orderId) {
      logInfo(`Test order created: ${orderId}`);
      logInfo('You can monitor this order in your PayCrest dashboard');
    }
    
    log('\n💡 Next Steps:', 'yellow');
    log('1. Check your PayCrest dashboard for any test orders created');
    log('2. Monitor webhook calls if you have webhook URL configured');
    log('3. Test with real small amounts (as low as $0.50) for full integration');
    
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

module.exports = {
  makeRequest,
  testSenderEndpoints,
  testProviderEndpoints,
  testGeneralEndpoints,
  testWebhookEndpoint
};