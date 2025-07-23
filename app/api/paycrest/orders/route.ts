import { NextRequest, NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';
import { createKshMobileMoneyRecipient, createNgnBankRecipient, PaycrestOrderRequest } from '@/lib/paycrest';
import { generateRef } from '@/lib/utils/generateRef';

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
      provider = 'MPESA' 
    } = body;

    // Validate required fields
    if (!amount || !phoneNumber || !accountName || !rate || !returnAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, phoneNumber, accountName, rate, returnAddress' },
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

    // Validate phone number based on currency
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    let formattedPhone: string;
    
    if (currency === 'KES') {
      // Kenya phone number validation
      if (!cleanPhone.match(/^(254|0)(7|1)\d{8}$/)) {
        return NextResponse.json(
          { error: 'Invalid Kenyan phone number format' },
          { status: 400 }
        );
      }
      // Format phone number for PayCrest (ensure it starts with 254)
      formattedPhone = cleanPhone.startsWith('254') 
        ? cleanPhone 
        : cleanPhone.replace(/^0/, '254');
    } else {
      // Nigeria phone number validation
      if (!cleanPhone.match(/^(234|0)[789]\d{8}$/)) {
        return NextResponse.json(
          { error: 'Invalid Nigerian phone number format' },
          { status: 400 }
        );
      }
      // Format phone number for PayCrest (ensure it starts with 234)
      formattedPhone = cleanPhone.startsWith('234') 
        ? cleanPhone 
        : cleanPhone.replace(/^0/, '234');
    }

    // Create PayCrest recipient based on currency
    const recipient = currency === 'KES' 
      ? createKshMobileMoneyRecipient(
          formattedPhone,
          accountName,
          provider as 'MPESA' | 'AIRTEL'
        )
      : createNgnBankRecipient(
          formattedPhone,
          accountName
        );

    // Generate unique reference
    const reference = generateRef();

    // Create order request
    const orderRequest: PaycrestOrderRequest = {
      amount: amount.toString(),
      token: 'USDC',
      network: 'base',
      rate: rate.toString(),
      recipient,
      reference,
      returnAddress,
    };

    // Get PayCrest service and create order
    const paycrestService = await getPaycrestService();
    const order = await paycrestService.createOrderWithRetry(orderRequest);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        receiveAddress: order.receiveAddress,
        validUntil: order.validUntil,
        senderFee: order.senderFee || "0",
        transactionFee: order.transactionFee || "0",
        totalAmount: (
          parseFloat(order.amount || "0") + 
          parseFloat(order.senderFee || "0") + 
          parseFloat(order.transactionFee || "0")
        ).toString(),
        status: order.status || "pending",
        reference: order.reference,
        recipient: {
          phoneNumber: formattedPhone,
          accountName: accountName,
          provider: provider,
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