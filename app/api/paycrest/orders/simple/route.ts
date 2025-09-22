import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase/config';
import { detectKenyanCarrier } from '@/lib/utils/phoneCarrier';
import { formatTillNumber, formatPhoneNumber } from '@/lib/utils/tillValidator';
import { validateWalletForOrder } from '@/lib/blockchain/balanceValidation';
import { estimatePaycrestFees } from '@/lib/utils/feeEstimation';

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
      tillNumber, // Add till number support
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
    if (currency === 'KES' && !phoneNumber && !tillNumber) {
      return NextResponse.json(
        { error: 'Phone number or till number is required for KES transactions' },
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
    let paymentType: 'phone' | 'till' | 'bank' = 'phone';

    if (currency === 'KES') {
      if (tillNumber) {
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
        console.log('📱 Using phone number for transaction');
      } else {
        throw new Error('Either phone number or till number is required for KES');
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
        memo: `Payment from Minisend to ${accountName}`, // Consistent memo format across all payment types
        metadata: {}, // Required empty object
        currency,
      },
      reference: `minisend_${Date.now()}`,
      returnAddress,
    };
    
    console.log('📦 PayCrest order payload:', JSON.stringify(orderData, null, 2));

    // 💰 Validate wallet has sufficient balance BEFORE creating PayCrest order
    // Use conservative fee estimate based on typical PayCrest fee structure
    const feeEstimate = estimatePaycrestFees(amountNum);

    try {
      const balanceValidation = await validateWalletForOrder(returnAddress, feeEstimate.totalAmountWithFees);

      if (!balanceValidation.isValid) {
        return NextResponse.json(
          {
            error: 'Insufficient funds',
            details: `Need $${feeEstimate.totalAmountWithFees.toFixed(2)} USDC total (including fees)`,
            balanceInfo: {
              currentBalance: balanceValidation.balanceCheck.balanceInUSDC,
              requiredAmount: feeEstimate.totalAmountWithFees,
              baseAmount: amountNum,
              estimatedFees: feeEstimate.totalEstimatedFees,
              insufficientBy: balanceValidation.balanceCheck.insufficientBy
            }
          },
          { status: 400 }
        );
      }
    } catch {
      // Continue with order creation - the balance validation has fail-open behavior
    }

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

    // 🔒 Final balance validation with actual fees from PayCrest
    try {
      const senderFee = parseFloat(order.data.senderFee || '0');
      const transactionFee = parseFloat(order.data.transactionFee || '0');
      const totalAmountRequired = amountNum + senderFee + transactionFee;

      const finalValidation = await validateWalletForOrder(returnAddress, totalAmountRequired);

      if (!finalValidation.isValid) {
        return NextResponse.json(
          {
            error: 'Insufficient funds',
            details: `Need $${totalAmountRequired.toFixed(2)} USDC total (including fees)`,
            balanceInfo: {
              currentBalance: finalValidation.balanceCheck.balanceInUSDC,
              requiredAmount: totalAmountRequired,
              baseAmount: amountNum,
              fees: senderFee + transactionFee,
              insufficientBy: finalValidation.balanceCheck.insufficientBy
            }
          },
          { status: 400 }
        );
      }
    } catch {
      // Continue with order creation - the balance validation has fail-open behavior
    }

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
        console.log('👤 Creating new user')
        user = await DatabaseService.createUser(returnAddress, formattedIdentifier)
        console.log('✅ User created:', user.id)
      } else {
        console.log('👤 Found existing user:', user.id)
      }
      
      // Create order record from Paycrest response
      await DatabaseService.createOrderFromPaycrest(order, {
        amount: amountNum.toString(),
        phoneNumber: currency === 'KES' && paymentType === 'phone' ? formattedIdentifier : '', // Phone number for KES phone payments only
        accountNumber: currency === 'NGN' ? formattedIdentifier : '', // Account number for NGN only
        tillNumber: currency === 'KES' && paymentType === 'till' ? formattedIdentifier : '', // Till number for KES till payments
        paybillNumber: '', // Paybill no longer supported
        paybillAccount: '', // Paybill no longer supported
        accountName,
        currency,
        returnAddress,
        rate: exchangeRate,
        provider: currency === 'KES' 
          ? (paymentType === 'till' ? 'MPESA_TILL' : (detectedCarrier === 'SAFARICOM' ? 'MPESA' : 'AIRTEL'))
          : 'BANK_TRANSFER',
        localAmount: localAmount.toString(),
        institutionCode: institutionCode
      })

      console.log('📊 Order saved to database successfully')

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