import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';
import { detectKenyanCarrier } from '@/lib/utils/phoneCarrier';
import { formatTillNumber, formatPhoneNumber } from '@/lib/utils/tillValidator';

const PAYCREST_API_URL = process.env.PAYCREST_BASE_URL || 'https://api.paycrest.io/v1';
const PAYCREST_API_KEY = process.env.PAYCREST_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Validate API key first
    if (!PAYCREST_API_KEY) {
      console.error('❌ PAYCREST_API_KEY not configured');
      return NextResponse.json(
        { error: 'PayCrest API key not configured' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    console.log('📝 Order creation request body:', body);
    
    const { 
      amount, 
      phoneNumber, 
      tillNumber, // NEW: Add till number support
      paybillNumber, // NEW: Add paybill number support
      paybillAccount, // NEW: Add paybill account number support
      accountNumber,
      bankCode,
      accountName, 
      currency,
      returnAddress,
      rate // Accept rate from client if provided
    } = body;

    // Validate required fields
    if (!amount || !accountName || !currency || !returnAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, accountName, currency, returnAddress' },
        { status: 400 }
      );
    }

    // Currency-specific validation
    if (currency === 'KES' && !phoneNumber && !tillNumber && !paybillNumber) {
      return NextResponse.json(
        { error: 'Phone number, till number, or paybill number is required for KES transactions' },
        { status: 400 }
      );
    }

    // Paybill specific validation
    if (paybillNumber && !paybillAccount) {
      return NextResponse.json(
        { error: 'Paybill account number is required when using paybill number' },
        { status: 400 }
      );
    }

    if (currency === 'NGN' && (!accountNumber || !bankCode)) {
      return NextResponse.json(
        { error: 'Account number and bank code are required for NGN transactions' },
        { status: 400 }
      );
    }
    
    // Validate amount is positive number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number' },
        { status: 400 }
      );
    }

    // Get rate - use provided rate or fetch from PayCrest
    let exchangeRate: number;
    
    if (rate && !isNaN(parseFloat(rate))) {
      exchangeRate = parseFloat(rate);
      console.log('💹 Using provided rate:', exchangeRate);
    } else {
      console.log('📊 Fetching rate from PayCrest:', `${PAYCREST_API_URL}/rates/USDC/${amountNum}/${currency}`);
      
      const rateResponse = await fetch(`${PAYCREST_API_URL}/rates/USDC/${amountNum}/${currency}`, {
        headers: {
          'API-Key': PAYCREST_API_KEY!,
        },
      });

      if (!rateResponse.ok) {
        const errorText = await rateResponse.text();
        console.error('Rate fetch failed:', rateResponse.status, errorText);
        throw new Error(`Failed to fetch rate: ${rateResponse.status} ${errorText}`);
      }

      const rateData = await rateResponse.json();
      console.log('💹 Rate data received:', rateData);
      
      // Handle different response formats
      if (rateData.status === 'success' && rateData.data) {
        exchangeRate = parseFloat(rateData.data);
      } else if (typeof rateData === 'number') {
        exchangeRate = rateData;
      } else {
        console.error('Invalid rate data format:', rateData);
        throw new Error('Invalid rate data format from PayCrest API');
      }
    }
    
    if (isNaN(exchangeRate) || exchangeRate <= 0) {
      throw new Error(`Invalid rate value: ${exchangeRate}`);
    }
    
    console.log('✅ Rate confirmed:', exchangeRate);

    // Format identifier and set institution based on currency
    let formattedIdentifier: string;
    let institution: string;
    let paymentType: 'phone' | 'till' | 'paybill' | 'bank' = 'phone';

    if (currency === 'KES') {
      if (paybillNumber && paybillAccount) {
        // Paybill number formatting - use paybill number as identifier and account in memo
        formattedIdentifier = formatTillNumber(paybillNumber); // Same formatting as till
        institution = 'SAFAKEPC'; // Using M-Pesa institution for paybill numbers (same network)
        paymentType = 'paybill';
        console.log('🏛️ Using paybill number:', { paybillNumber, paybillAccount, formattedIdentifier, institution });
      } else if (tillNumber) {
        // Till number formatting
        formattedIdentifier = formatTillNumber(tillNumber);
        institution = 'SAFAKEPC'; // Using M-Pesa institution for till numbers (same network)
        paymentType = 'till';
        console.log('🏪 Using till number:', { tillNumber, formattedIdentifier, institution });
      } else if (phoneNumber) {
        // Phone number formatting  
        formattedIdentifier = formatPhoneNumber(phoneNumber);
        institution = 'SAFAKEPC'; // M-PESA provider ID from PayCrest API
        paymentType = 'phone';
        console.log('📱 Using phone number:', { phoneNumber, formattedIdentifier, institution });
      } else {
        throw new Error('Either phone number, till number, or paybill number is required for KES');
      }
    } else if (currency === 'NGN') {
      // Nigeria account number - use as provided
      formattedIdentifier = accountNumber!;
      institution = bankCode!; // Use the bank code provided by user
      paymentType = 'bank';
    } else {
      throw new Error('Unsupported currency');
    }

    // Create PayCrest order payload according to API docs
    const orderData = {
      amount: amountNum, // Should be number, not string
      token: 'USDC',
      rate: exchangeRate, // Should be number, not string
      network: 'base',
      recipient: {
        institution,
        accountIdentifier: formattedIdentifier,
        accountName,
        memo: paymentType === 'paybill' 
          ? `Payment from Minisend to ${accountName} - Account: ${paybillAccount}` 
          : `Payment from Minisend to ${accountName}`, // Include account number for paybills
        metadata: {}, // Required empty object
        currency,
      },
      reference: `minisend_${Date.now()}`,
      returnAddress,
    };
    
    console.log('📦 PayCrest order payload:', JSON.stringify(orderData, null, 2));

    console.log('🚀 Creating PayCrest order at:', `${PAYCREST_API_URL}/sender/orders`);
    
    const orderResponse = await fetch(`${PAYCREST_API_URL}/sender/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': PAYCREST_API_KEY!,
      },
      body: JSON.stringify(orderData),
    });

    console.log('📡 PayCrest order response status:', orderResponse.status);
    console.log('📡 PayCrest order response headers:', Object.fromEntries(orderResponse.headers.entries()));
    
    if (!orderResponse.ok) {
      let errorData;
      try {
        errorData = await orderResponse.json();
        console.error('PayCrest order error (JSON):', JSON.stringify(errorData, null, 2));
      } catch {
        const errorText = await orderResponse.text();
        console.error('PayCrest order error (text):', errorText);
        throw new Error(`PayCrest API error ${orderResponse.status}: ${errorText}`);
      }
      
      throw new Error(`Failed to create PayCrest order: ${errorData.message || JSON.stringify(errorData)}`);
    }

    const order = await orderResponse.json();
    console.log('✅ PayCrest order created:', order);

    // 🗄️ Store order in database
    try {
      // Detect carrier for Kenya numbers
      let detectedCarrier = 'UNKNOWN'
      const institutionCode = institution
      
      if (currency === 'KES') {
        detectedCarrier = detectKenyanCarrier(formattedIdentifier)
        // Log carrier detection
        await DatabaseService.logCarrierDetection(
          formattedIdentifier, 
          detectedCarrier, 
          institutionCode, 
          'MPESA',
          0.95,
          'prefix_detection'
        )
      }

      // Calculate correct local amount
      const localAmount = amountNum * exchangeRate
      
      // Ensure user exists in database
      let user = await DatabaseService.getUserByWallet(returnAddress)
      if (!user) {
        console.log('👤 Creating new user for wallet:', returnAddress)
        user = await DatabaseService.createUser(returnAddress, formattedIdentifier)
        console.log('✅ User created:', user.id)
      } else {
        console.log('👤 Found existing user:', user.id)
      }
      
      // Create order record from Paycrest response
      const dbOrder = await DatabaseService.createOrderFromPaycrest(order, {
        amount: amountNum.toString(),
        phoneNumber: currency === 'KES' && paymentType === 'phone' ? formattedIdentifier : '', // Phone number for KES phone payments only
        accountNumber: currency === 'NGN' ? formattedIdentifier : '', // Account number for NGN only
        tillNumber: currency === 'KES' && paymentType === 'till' ? formattedIdentifier : '', // Till number for KES till payments
        paybillNumber: currency === 'KES' && paymentType === 'paybill' ? formattedIdentifier : '', // Paybill number for KES paybill payments
        paybillAccount: currency === 'KES' && paymentType === 'paybill' ? paybillAccount : '', // Paybill account for KES paybill payments
        accountName,
        currency,
        returnAddress,
        rate: exchangeRate,
        provider: currency === 'KES' 
          ? (paymentType === 'paybill' ? 'MPESA_PAYBILL' : paymentType === 'till' ? 'MPESA_TILL' : (detectedCarrier === 'SAFARICOM' ? 'MPESA' : 'AIRTEL'))
          : 'BANK_TRANSFER',
        localAmount: localAmount.toString(),
        institutionCode: institutionCode
      })

      console.log('📊 Order saved to database:', dbOrder.id)

      // Log analytics event
      await DatabaseService.logAnalyticsEvent(
        'order_created',
        returnAddress,
        {
          paycrest_order_id: order.data.id,
          amount_usdc: amountNum,
          amount_local: localAmount,
          currency,
          carrier: detectedCarrier,
          institution: institutionCode
        }
      )

    } catch (dbError) {
      console.error('❌ Database error (continuing with API response):', dbError)
      // Don't fail the API call if database fails
    }

    // Return response with corrected account name (PayCrest returns "OK" instead of actual name)
    return NextResponse.json({
      success: true,
      order: {
        ...order.data,
        // Override PayCrest's "OK" response with the actual user-provided account name
        recipient: {
          ...order.data.recipient,
          accountName: accountName // Use original account name from request
        }
      },
    });

  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    );
  }
}