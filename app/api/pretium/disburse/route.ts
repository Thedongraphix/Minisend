import { NextRequest, NextResponse } from 'next/server';
import { pretiumClient } from '@/lib/pretium/client';
import { PRETIUM_CONFIG } from '@/lib/pretium/config';
import { DatabaseService } from '@/lib/supabase/config';
import { formatPhoneNumber, formatTillNumber } from '@/lib/utils/tillValidator';
import type { PretiumDisburseRequest, PretiumPaymentType } from '@/lib/pretium/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      amount,
      phoneNumber,
      tillNumber,
      paybillNumber,
      paybillAccount,
      accountName,
      transactionHash,
      returnAddress,
      fid,
    } = body;

    // Validate required fields
    if (!amount || !accountName || !transactionHash || !returnAddress) {
      return NextResponse.json(
        {
          error: 'Missing required fields: amount, accountName, transactionHash, returnAddress',
        },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number' },
        { status: 400 }
      );
    }

    // Determine payment type and format shortcode
    let paymentType: PretiumPaymentType;
    let shortcode: string;
    let accountNumber: string | undefined;

    if (tillNumber) {
      paymentType = 'BUY_GOODS';
      shortcode = formatTillNumber(tillNumber);
    } else if (paybillNumber && paybillAccount) {
      paymentType = 'PAYBILL';
      shortcode = paybillNumber;
      accountNumber = paybillAccount;
    } else if (phoneNumber) {
      paymentType = 'MOBILE';
      shortcode = formatPhoneNumber(phoneNumber);
    } else {
      return NextResponse.json(
        {
          error: 'Must provide either phoneNumber, tillNumber, or paybillNumber with paybillAccount',
        },
        { status: 400 }
      );
    }

    // Get exchange rate
    const rateResponse = await pretiumClient.getExchangeRate('KES');
    if (rateResponse.code !== 200) {
      return NextResponse.json(
        { error: 'Failed to fetch exchange rate' },
        { status: 500 }
      );
    }

    // Use buying_rate for offramp (we're buying KES from Pretium)
    const exchangeRate = rateResponse.data.buying_rate;

    // Calculate what recipient wants to receive in KES
    // Use Math.round instead of Math.floor to avoid recipient receiving less than quoted
    const recipientAmount = Math.round(amountNum * exchangeRate);

    // Calculate 1% platform fee on the recipient amount
    // According to Pretium docs: if user wants to RECEIVE KES 1,000 with 1% fee
    // We send: amount=1010 (total), fee=10
    // Pretium sends KES 1,000 to recipient and credits KES 10 to our fiat wallet
    const feeAmount = Math.ceil(recipientAmount * PRETIUM_CONFIG.FEE_PERCENTAGE);

    // Total amount to send to Pretium (recipient amount + fee)
    const totalLocalAmount = recipientAmount + feeAmount;

    // Prepare Pretium disbursement request
    const disburseRequest: PretiumDisburseRequest = {
      type: paymentType,
      shortcode,
      account_number: accountNumber,
      amount: totalLocalAmount.toString(), // Total amount (recipient + fee)
      fee: feeAmount.toString(), // Platform fee (credited to our fiat wallet)
      mobile_network: PRETIUM_CONFIG.MOBILE_NETWORK,
      chain: PRETIUM_CONFIG.CHAIN,
      transaction_hash: transactionHash,
      callback_url: PRETIUM_CONFIG.WEBHOOK_URL,
    };

    // Initiate disbursement with Pretium
    let disburseResponse;
    try {
      disburseResponse = await pretiumClient.disburse(disburseRequest);
    } catch (error) {
      const pretiumError = error as { message?: string; data?: unknown; code?: number };
      console.error('Pretium disburse error:', error);
      return NextResponse.json(
        {
          error: pretiumError.message || 'Failed to initiate disbursement with Pretium',
          details: pretiumError.data || {},
          request: disburseRequest,
        },
        { status: pretiumError.code || 500 }
      );
    }

    if (disburseResponse.code !== 200) {
      console.error('Pretium disburse failed:', disburseResponse);
      return NextResponse.json(
        {
          error: disburseResponse.message,
          details: disburseResponse.data,
        },
        { status: disburseResponse.code }
      );
    }

    const { transaction_code, status, message } = disburseResponse.data;

    // Store order in database
    try {
      // Ensure user exists
      let user = await DatabaseService.getUserByWallet(returnAddress);
      if (!user) {
        user = await DatabaseService.createUser(
          returnAddress,
          paymentType === 'MOBILE' ? shortcode : ''
        );
      }

      // Create order record for Pretium transaction
      await DatabaseService.createPretiumOrder({
        transactionCode: transaction_code,
        userId: user.id,
        walletAddress: returnAddress,
        amountInUsdc: amountNum,
        amountInLocal: totalLocalAmount, // Total including fee
        currency: 'KES',
        phoneNumber: paymentType === 'MOBILE' ? shortcode : '',
        tillNumber: paymentType === 'BUY_GOODS' ? shortcode : '',
        paybillNumber: paymentType === 'PAYBILL' ? shortcode : '',
        paybillAccount: accountNumber || '',
        accountName,
        rate: exchangeRate,
        transactionHash,
        status: status.toLowerCase(),
        pretiumStatus: status,
        fee: feeAmount,
        fid,
      });

      // Log analytics event
      await DatabaseService.logAnalyticsEvent('pretium_disburse_initiated', returnAddress, {
        transaction_code,
        amount_usdc: amountNum,
        amount_kes: totalLocalAmount,
        recipient_amount: recipientAmount,
        fee_amount: feeAmount,
        payment_type: paymentType,
      });
    } catch {
      // Don't fail the request if database operations fail
    }

    return NextResponse.json({
      success: true,
      transactionCode: transaction_code,
      status,
      message,
      totalAmount: totalLocalAmount,
      recipientAmount,
      feeAmount,
      exchangeRate,
      settlementAddress: PRETIUM_CONFIG.SETTLEMENT_ADDRESS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to initiate disbursement',
      },
      { status: 500 }
    );
  }
}
