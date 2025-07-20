// Test script to verify B2C implementation
// Run with: node scripts/test-b2c.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testB2CImplementation() {
  console.log('🧪 Testing M-Pesa B2C Implementation...\n');

  const testCases = [
    {
      name: 'Valid B2C Request',
      payload: {
        walletAddress: '0x1234567890123456789012345678901234567890',
        usdcAmount: 10,
        phoneNumber: '+254797872622',
        chainId: 84532
      },
      expectSuccess: true
    },
    {
      name: 'Invalid Phone Number',
      payload: {
        walletAddress: '0x1234567890123456789012345678901234567890', 
        usdcAmount: 10,
        phoneNumber: '+1234567890', // Invalid Kenyan number
        chainId: 84532
      },
      expectSuccess: false
    },
    {
      name: 'Amount Too Small',
      payload: {
        walletAddress: '0x1234567890123456789012345678901234567890',
        usdcAmount: 0.5, // Below minimum
        phoneNumber: '+254797872622',
        chainId: 84532
      },
      expectSuccess: false
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('━'.repeat(50));
    
    try {
      const response = await fetch('http://localhost:3001/api/offramp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.payload)
      });

      const data = await response.json();
      
      console.log(`Status: ${response.status}`);
      console.log(`Success: ${data.success}`);
      
      if (testCase.expectSuccess) {
        if (data.success) {
          console.log('✅ Expected success - PASSED');
          console.log(`Message: ${data.message || 'No message'}`);
          console.log(`Reference: ${data.mpesaReference || 'No reference'}`);
        } else {
          console.log('❌ Expected success but got failure - FAILED');
          console.log(`Error: ${data.error}`);
        }
      } else {
        if (!data.success) {
          console.log('✅ Expected failure - PASSED');
          console.log(`Error: ${data.error}`);
        } else {
          console.log('❌ Expected failure but got success - FAILED');
        }
      }
      
    } catch (error) {
      console.log('❌ Network/Server Error:');
      console.log(error.message);
    }
  }

  console.log('\n🎯 Test Summary:');
  console.log('━'.repeat(50));
  console.log('If tests pass, your B2C implementation is working correctly!');
  console.log('Sandbox limitation: No real SMS/money transfer');
  console.log('For real transactions: Switch to production credentials');
  console.log('\n📖 See MPESA_B2C_SETUP_GUIDE.md for next steps');
}

// Run tests
testB2CImplementation().catch(console.error);