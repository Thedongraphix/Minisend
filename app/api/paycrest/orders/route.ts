import { NextRequest, NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';
import { createKshMobileMoneyRecipient, createNgnBankRecipient, PaycrestOrderRequest } from '@/lib/paycrest';
import { generateRef } from '@/lib/utils/generateRef';
import { validateAndDetectKenyanNumber } from '@/lib/utils/phoneCarrier';
import { OrderService } from '@/lib/supabase/orders';
import { UserService } from '@/lib/supabase/users';
import { AnalyticsService } from '@/lib/supabase/analytics';

// Force dynamic rendering and Node.js runtime  
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      amount, 
      phoneNumber, 
      accountName, 
      rate,
      returnAddress,
      currency = 'KES',
      // provider = 'MPESA' // Removed - now auto-detected
    } = body;

    // Validate required fields (rate is optional - will be fetched dynamically)
    if (!amount || !phoneNumber || !accountName || !returnAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, phoneNumber, accountName, returnAddress' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Validate phone number and detect carrier
    let formattedPhone: string;
    let detectedProvider: 'MPESA' | 'AIRTEL' = 'MPESA';
    let carrierInfo: {
      carrier: string;
      displayName: string;
    } | null = null;
    
    if (currency === 'KES') {
      // Use enhanced Kenyan number validation with carrier detection
      const validation = validateAndDetectKenyanNumber(phoneNumber);
      
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error || 'Invalid Kenyan phone number format' },
          { status: 400 }
        );
      }
      
      formattedPhone = validation.formattedNumber;
      detectedProvider = validation.paycrestProvider;
      carrierInfo = {
        carrier: validation.carrier,
        displayName: validation.displayName || 'Mobile Money'
      };
      
      console.log(`Kenyan number analysis:`, {
        input: phoneNumber,
        formatted: formattedPhone,
        carrier: validation.carrier,
        provider: detectedProvider,
        displayName: validation.displayName
      });
    } else {
      // Nigeria phone number validation (unchanged)
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (!cleanPhone.match(/^(234|0)[789]\d{8}$/)) {
        return NextResponse.json(
          { error: 'Invalid Nigerian phone number format' },
          { status: 400 }
        );
      }
      formattedPhone = cleanPhone.startsWith('234') 
        ? cleanPhone 
        : cleanPhone.replace(/^0/, '234');
    }

    // Get dynamic exchange rate if not provided
    let finalRate = rate;
    if (!finalRate) {
      try {
        console.log(`Fetching dynamic rate for ${amount} USDC to ${currency}`);
        const paycrestService = await getPaycrestService();
        const dynamicRate = await paycrestService.getRates('USDC', amount.toString(), currency, 'base');
        finalRate = parseFloat(dynamicRate);
        console.log(`Dynamic rate fetched: ${finalRate}`);
      } catch (error) {
        console.error('Failed to fetch dynamic rate:', error);
        // Use fallback rates
        finalRate = currency === 'KES' ? 150.5 : 1650.0;
        console.log(`Using fallback rate: ${finalRate}`);
      }
    } else {
      finalRate = parseFloat(rate);
      console.log(`Using provided rate: ${finalRate}`);
    }

    // Create PayCrest recipient with detected provider
    const recipient = currency === 'KES' 
      ? createKshMobileMoneyRecipient(
          formattedPhone,
          accountName,
          detectedProvider // Use detected provider instead of user input
        )
      : createNgnBankRecipient(
          formattedPhone,
          accountName
        );

    // Generate unique reference
    const reference = generateRef();

    // Create order request with settlement acceleration
    const orderRequest: PaycrestOrderRequest = {
      amount: amount.toString(),
      token: 'USDC',
      network: 'base',
      rate: finalRate.toString(),
      recipient,
      reference,
      returnAddress,
      // Add settlement acceleration parameters
      priority: 'high', // Request high priority processing
      settlementSpeed: 'express', // Request express settlement
      webhookUrl: `${process.env.NEXT_PUBLIC_URL}/api/paycrest/webhook`,
    };

    // Get PayCrest service and create order
    const paycrestService = await getPaycrestService();
    const order = await paycrestService.createOrderWithRetry(orderRequest);

    // Create or get user
    let user;
    try {
      user = await UserService.upsertUser({
        wallet_address: returnAddress
      });
    } catch (userError) {
      console.error('Failed to create/update user:', userError);
      // Continue without user link
      user = null;
    }

    // Store order in database
    try {
      await OrderService.createOrder({
        paycrest_order_id: order.id,
        paycrest_reference: order.reference,
        user_id: user?.id,
        wallet_address: returnAddress,
        amount: parseFloat(amount),
        token: 'USDC',
        network: 'base',
        currency,
        exchange_rate: finalRate,
        local_amount: parseFloat(amount) * finalRate,
        sender_fee: parseFloat(order.senderFee || '0'),
        transaction_fee: parseFloat(order.transactionFee || '0'),
        total_amount: parseFloat(order.amount || amount),
        recipient_name: accountName,
        recipient_phone: formattedPhone,
        recipient_institution: detectedProvider,
        recipient_currency: currency,
        receive_address: order.receiveAddress,
        valid_until: order.validUntil,
        status: order.status || 'payment_order.pending',
        metadata: {
          carrier_info: carrierInfo,
          original_phone_input: phoneNumber,
          api_version: 'v1'
        }
      });

      // Track analytics
      await AnalyticsService.trackOrderCreated(
        returnAddress,
        order.id,
        parseFloat(amount),
        currency,
        formattedPhone
      );

      // Log carrier detection
      if (currency === 'KES' && carrierInfo) {
        await AnalyticsService.logCarrierDetection({
          phone_number: formattedPhone,
          detected_carrier: carrierInfo.carrier,
          paycrest_provider: detectedProvider,
          order_id: order.id
        });
      }
    } catch (dbError) {
      console.error('Database operations failed:', dbError);
      // Continue - don't fail the API call if DB fails
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        receiveAddress: order.receiveAddress,
        validUntil: order.validUntil,
        amount: order.amount || "0", // The PayCrest order amount for transaction calculation
        senderFee: order.senderFee || "0",
        transactionFee: order.transactionFee || "0",
        totalAmount: order.amount || "0", // Keep for backward compatibility
        totalAmountWithFees: (
          parseFloat(order.amount || "0") + 
          parseFloat(order.senderFee || "0") + 
          parseFloat(order.transactionFee || "0")
        ).toString(), // This is what user actually sends
        status: order.status || "payment_order.pending",
        reference: order.reference,
        recipient: {
          phoneNumber: formattedPhone,
          accountName: accountName,
          provider: detectedProvider,
          carrierInfo: carrierInfo, // Include carrier detection info
        }
      }
    });

  } catch (error) {
    console.error('PayCrest order creation error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create PayCrest order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const paycrestService = await getPaycrestService();
    const order = await paycrestService.getOrderStatus(orderId);

    // Update order status in database if changed
    try {
      const dbOrder = await OrderService.getOrderByPaycrestId(orderId);
      if (dbOrder && dbOrder.status !== order.status) {
        await OrderService.updateOrderStatus(orderId, order.status);
      }
    } catch (dbError) {
      console.error('Failed to update order status in database:', dbError);
      // Continue - don't fail the API call
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        amount: order.amount,
        token: order.token,
        network: order.network,
        recipient: order.recipient,
        reference: order.reference,
        receiveAddress: order.receiveAddress,
        validUntil: order.validUntil,
        senderFee: order.senderFee,
        transactionFee: order.transactionFee,
      }
    });

  } catch (error) {
    console.error('PayCrest order status error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get order status' },
      { status: 500 }
    );
  }
}