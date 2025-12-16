import { NextRequest, NextResponse } from 'next/server';
import { pretiumClient } from '@/lib/pretium/client';
import { PRETIUM_CONFIG, isCurrencySupported } from '@/lib/pretium/config';
import { DatabaseService } from '@/lib/supabase/config';
import { formatPhoneNumber, formatTillNumber } from '@/lib/utils/tillValidator';
import { formatGhanaPhoneNumber } from '@/lib/utils/ghanaValidator';
import { detectKenyanCarrier } from '@/lib/utils/phoneCarrier';
import { detectGhanaNetwork } from '@/lib/utils/ghanaNetworkDetector';
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
      currency = 'KES', // Default to KES for backwards compatibility
      accountNumber: ngnAccountNumber, // For NGN bank transfers
      bankCode, // For NGN bank transfers
    } = body;

    // Validate currency is supported
    if (!isCurrencySupported(currency)) {
      return NextResponse.json(
        { error: `Currency ${currency} is not supported. Supported currencies: KES, GHS, NGN` },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!amount || !accountName || !transactionHash || !returnAddress) {
      return NextResponse.json(
        {
          error: 'Missing required fields: amount, accountName, transactionHash, returnAddress',
        },
        { status: 400 }
      );
    }

    // Validate and normalize amount to 2 decimal places to avoid rate mismatch
    // This ensures consistency between what user sees and what Pretium calculates
    const amountNum = Math.round(parseFloat(amount) * 100) / 100;
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
    let mobileNetwork: string;
    let bankName: string | undefined;

    // Handle NGN bank transfers first
    if (currency === 'NGN') {
      if (!ngnAccountNumber || !bankCode) {
        return NextResponse.json(
          { error: 'NGN requires both account number and bank code' },
          { status: 400 }
        );
      }

      paymentType = 'MOBILE'; // Pretium uses MOBILE type for bank transfers
      shortcode = ngnAccountNumber.replace(/\D/g, ''); // Clean account number
      accountNumber = shortcode; // For NGN, account_number field is used
      mobileNetwork = bankCode; // Bank code is used as mobile_network for NGN
      bankName = bankCode; // Store for logging

      // Validate account number format
      if (shortcode.length < 10 || shortcode.length > 11) {
        return NextResponse.json(
          { error: 'Invalid NGN account number (must be 10-11 digits)' },
          { status: 400 }
        );
      }
    } else if (tillNumber) {
      // Till numbers only supported for KES
      if (currency !== 'KES') {
        return NextResponse.json(
          { error: 'Till numbers are only supported for KES' },
          { status: 400 }
        );
      }
      paymentType = 'BUY_GOODS';
      shortcode = formatTillNumber(tillNumber);
      mobileNetwork = 'Safaricom';
    } else if (paybillNumber && paybillAccount) {
      // Paybill only supported for KES
      if (currency !== 'KES') {
        return NextResponse.json(
          { error: 'Paybill numbers are only supported for KES' },
          { status: 400 }
        );
      }
      paymentType = 'PAYBILL';
      shortcode = paybillNumber;
      accountNumber = paybillAccount;
      mobileNetwork = 'Safaricom';
    } else if (phoneNumber) {
      paymentType = 'MOBILE';

      if (currency === 'KES') {
        shortcode = formatPhoneNumber(phoneNumber);
        const carrier = detectKenyanCarrier(shortcode);
        mobileNetwork = carrier === 'SAFARICOM' ? 'Safaricom' : carrier === 'AIRTEL' ? 'Airtel' : 'Safaricom';
      } else if (currency === 'GHS') {
        shortcode = formatGhanaPhoneNumber(phoneNumber);
        const network = detectGhanaNetwork(shortcode);
        mobileNetwork = network === 'MTN' ? 'MTN' : network === 'VODAFONE' ? 'Vodafone' : network === 'AIRTELTIGO' ? 'AirtelTigo' : 'MTN';
      } else if (currency === 'NGN') {
        return NextResponse.json(
          { error: 'NGN requires bank account details, not phone number' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'Unsupported currency' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: 'Must provide either phoneNumber, tillNumber, paybillNumber with paybillAccount, or accountNumber with bankCode',
        },
        { status: 400 }
      );
    }

    // Get exchange rate for the specified currency
    const rateResponse = await pretiumClient.getExchangeRate(currency);
    if (rateResponse.code !== 200) {
      return NextResponse.json(
        { error: 'Failed to fetch exchange rate' },
        { status: 500 }
      );
    }

    // Use buying_rate for offramp (we're buying local currency from Pretium)
    const exchangeRate = rateResponse.data.buying_rate;

    // Calculate total local currency amount from the USDC user is sending
    // The USDC amount already includes everything (recipient amount + fee)
    const totalLocalFromUSdc = Math.round(amountNum * exchangeRate);

    // According to Pretium docs: if user sends equivalent of 1,010 local currency
    // We should send: { amount: 1010, fee: 10 }
    // Pretium will send 1,000 to recipient and credit 10 to our fiat wallet
    // So we need to calculate backwards: if total is 1010, recipient gets 1000, fee is 10
    // Formula: recipient = total / 1.01, fee = total - recipient
    const recipientAmount = Math.floor(totalLocalFromUSdc / 1.01);
    const feeAmount = totalLocalFromUSdc - recipientAmount;

    // Prepare Pretium disbursement request
    const disburseRequest: PretiumDisburseRequest = {
      type: paymentType,
      shortcode,
      account_number: accountNumber,
      amount: totalLocalFromUSdc.toString(), // Total local currency from USDC (includes recipient + fee)
      fee: feeAmount.toString(), // Platform fee (credited to our fiat wallet)
      mobile_network: mobileNetwork,
      chain: PRETIUM_CONFIG.CHAIN,
      transaction_hash: transactionHash,
      callback_url: PRETIUM_CONFIG.WEBHOOK_URL,
      ...(currency === 'NGN' && bankCode ? { bank_code: bankCode } : {}), // Add bank_code for NGN
    };

    // Initiate disbursement with Pretium
    let disburseResponse;
    try {
      disburseResponse = await pretiumClient.disburse(disburseRequest, currency);
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

      // Create order record in the new pretium_orders table
      console.log('[Disburse] Creating order in pretium_orders table:', {
        transaction_code,
        wallet: returnAddress,
        amount: amountNum
      });

      try {
        const createdOrder = await DatabaseService.createPretiumOrder({
          transactionCode: transaction_code,
          userId: user.id,
          walletAddress: returnAddress,
          amountInUsdc: amountNum,
          amountInLocal: recipientAmount,
          currency: 'KES',
          phoneNumber: paymentType === 'MOBILE' ? shortcode : undefined,
          tillNumber: paymentType === 'BUY_GOODS' ? shortcode : undefined,
          paybillNumber: paymentType === 'PAYBILL' ? shortcode : undefined,
          paybillAccount: accountNumber,
          accountName: accountName,
          rate: exchangeRate,
          transactionHash: transactionHash,
          status: 'pending',
          pretiumStatus: status,
          fee: feeAmount,
          fid,
          settlementAddress: PRETIUM_CONFIG.SETTLEMENT_ADDRESS,
          callbackUrl: PRETIUM_CONFIG.WEBHOOK_URL,
          rawDisburseRequest: JSON.parse(JSON.stringify(disburseRequest)) as Record<string, unknown>,
          rawDisburseResponse: JSON.parse(JSON.stringify(disburseResponse.data)) as Record<string, unknown>,
        });

        console.log('[Disburse] Order created successfully:', {
          order_id: createdOrder.id,
          transaction_code: createdOrder.transaction_code
        });
      } catch (dbError) {
        console.error('[Disburse] FAILED to create order in pretium_orders:', {
          transaction_code,
          error: dbError,
          errorMessage: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
        throw dbError;
      }

      // Log analytics event
      await DatabaseService.logAnalyticsEvent('pretium_disburse_initiated', returnAddress, {
        transaction_code,
        amount_usdc: amountNum,
        amount_local_total: totalLocalFromUSdc,
        recipient_amount: recipientAmount,
        fee_amount: feeAmount,
        payment_type: paymentType,
      });
    } catch (dbError) {
      console.error('Failed to save order to database:', {
        transaction_code,
        error: dbError instanceof Error ? dbError.message : dbError,
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
    }

    return NextResponse.json({
      success: true,
      transactionCode: transaction_code,
      status,
      message,
      totalAmount: totalLocalFromUSdc,
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
