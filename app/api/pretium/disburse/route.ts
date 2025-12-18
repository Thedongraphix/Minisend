import { NextRequest, NextResponse } from 'next/server';
import { pretiumClient } from '@/lib/pretium/client';
import { PRETIUM_CONFIG, isCurrencySupported } from '@/lib/pretium/config';
import { DatabaseService } from '@/lib/supabase/config';
import { formatPhoneNumber, formatTillNumber } from '@/lib/utils/tillValidator';
import { formatGhanaPhoneNumber } from '@/lib/utils/ghanaValidator';
import { detectKenyanCarrier } from '@/lib/utils/phoneCarrier';
import { detectGhanaNetwork } from '@/lib/utils/ghanaNetworkDetector';
import type { PretiumDisburseRequest, PretiumPaymentType } from '@/lib/pretium/types';

/**
 * Pretium Disburse Endpoint - Rebuilt from scratch following official docs
 *
 * Flow:
 * 1. Validate input and calculate amounts
 * 2. Call Pretium API /v1/pay/{currency}
 * 3. IMMEDIATELY save transaction_code to database (critical!)
 * 4. Return success to frontend
 * 5. Webhook will update status when complete
 *
 * Reference: docs/offramp.md, docs/fee.md, docs/webhooks.md
 */
export async function POST(request: NextRequest) {
  const requestId = `disburse_${Date.now()}`; // Unique ID for tracking this request

  try {
    console.log('='.repeat(80));
    console.log(`[${requestId}] DISBURSEMENT REQUEST INITIATED`);
    console.log('='.repeat(80));

    const body = await request.json();
    console.log(`[${requestId}] Request body:`, JSON.stringify(body, null, 2));

    // ========================================================================
    // STEP 1: VALIDATE INPUT & EXTRACT PARAMETERS
    // ========================================================================

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
      currency = 'KES',
      // NGN-specific fields
      accountNumber: ngnAccountNumber,
      bankCode,
      bankName,
    } = body;

    // Validate currency
    if (!isCurrencySupported(currency)) {
      console.error(`[${requestId}] Unsupported currency: ${currency}`);
      return NextResponse.json(
        { error: `Currency ${currency} not supported. Supported: KES, GHS, NGN` },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!amount || !accountName || !transactionHash || !returnAddress) {
      console.error(`[${requestId}] Missing required fields`);
      return NextResponse.json(
        { error: 'Missing required: amount, accountName, transactionHash, returnAddress' },
        { status: 400 }
      );
    }

    // Normalize amount to 2 decimal places
    const amountNum = Math.round(parseFloat(amount) * 100) / 100;
    if (isNaN(amountNum) || amountNum <= 0) {
      console.error(`[${requestId}] Invalid amount: ${amount}`);
      return NextResponse.json(
        { error: 'Invalid amount: must be positive number' },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Validated input:`, {
      currency,
      amount: amountNum,
      wallet: returnAddress,
      txHash: transactionHash
    });

    // ========================================================================
    // STEP 2: DETERMINE PAYMENT TYPE & FORMAT RECIPIENT DETAILS
    // ========================================================================

    let paymentType: PretiumPaymentType;
    let shortcode: string | undefined;
    let accountNumber: string | undefined;
    let mobileNetwork: string | undefined;

    if (currency === 'NGN') {
      // NGN Bank Transfers
      if (!ngnAccountNumber || !bankCode || !bankName) {
        console.error(`[${requestId}] NGN missing bank details`);
        return NextResponse.json(
          { error: 'NGN requires: accountNumber, bankCode, bankName' },
          { status: 400 }
        );
      }

      paymentType = 'BANK_TRANSFER';
      const cleanedAccountNumber = ngnAccountNumber.replace(/\D/g, ''); // Clean to digits only
      accountNumber = cleanedAccountNumber;

      // Validate account number format
      if (cleanedAccountNumber.length < 10 || cleanedAccountNumber.length > 11) {
        console.error(`[${requestId}] Invalid NGN account number length: ${cleanedAccountNumber.length}`);
        return NextResponse.json(
          { error: 'Invalid NGN account number (must be 10-11 digits)' },
          { status: 400 }
        );
      }

      console.log(`[${requestId}] NGN Bank Transfer:`, {
        accountNumber,
        bankCode,
        bankName
      });

    } else if (tillNumber && currency === 'KES') {
      // KES Till/Buy Goods
      paymentType = 'BUY_GOODS';
      shortcode = formatTillNumber(tillNumber);
      mobileNetwork = 'Safaricom';
      console.log(`[${requestId}] KES Buy Goods: ${shortcode}`);

    } else if (paybillNumber && paybillAccount && currency === 'KES') {
      // KES Paybill
      paymentType = 'PAYBILL';
      shortcode = paybillNumber;
      accountNumber = paybillAccount;
      mobileNetwork = 'Safaricom';
      console.log(`[${requestId}] KES Paybill: ${shortcode}/${accountNumber}`);

    } else if (phoneNumber) {
      // Mobile Money
      paymentType = 'MOBILE';

      if (currency === 'KES') {
        shortcode = formatPhoneNumber(phoneNumber);
        const carrier = detectKenyanCarrier(shortcode);
        mobileNetwork = carrier === 'SAFARICOM' ? 'Safaricom' : carrier === 'AIRTEL' ? 'Airtel' : 'Safaricom';
      } else if (currency === 'GHS') {
        shortcode = formatGhanaPhoneNumber(phoneNumber);
        const network = detectGhanaNetwork(shortcode);
        mobileNetwork = network === 'MTN' ? 'MTN' : network === 'VODAFONE' ? 'Vodafone' : network === 'AIRTELTIGO' ? 'AirtelTigo' : 'MTN';
      } else {
        console.error(`[${requestId}] Phone number not supported for ${currency}`);
        return NextResponse.json(
          { error: `${currency} does not support phone number payments` },
          { status: 400 }
        );
      }

      console.log(`[${requestId}] ${currency} Mobile: ${shortcode} (${mobileNetwork})`);

    } else {
      console.error(`[${requestId}] No valid payment method provided`);
      return NextResponse.json(
        { error: 'Must provide: phoneNumber, tillNumber, paybillNumber+account, or accountNumber+bankCode' },
        { status: 400 }
      );
    }

    // ========================================================================
    // STEP 3: GET EXCHANGE RATE
    // ========================================================================

    console.log(`[${requestId}] Fetching ${currency} exchange rate...`);
    const rateResponse = await pretiumClient.getExchangeRate(currency);

    if (rateResponse.code !== 200) {
      console.error(`[${requestId}] Failed to fetch exchange rate:`, rateResponse);
      return NextResponse.json(
        { error: 'Failed to fetch exchange rate' },
        { status: 500 }
      );
    }

    const exchangeRate = rateResponse.data.buying_rate;
    console.log(`[${requestId}] Exchange rate: 1 USDC = ${exchangeRate} ${currency}`);

    // ========================================================================
    // STEP 4: CALCULATE AMOUNTS PER PRETIUM DOCS
    // Per docs/fee.md:
    // - User wants to receive 1000 KES with 1% fee (10 KES)
    // - Deduct 1010 KES equivalent from wallet
    // - Send: { amount: 1010, fee: 10 }
    // - Pretium sends 1000 to recipient, credits 10 to our fiat wallet
    // ========================================================================

    const totalLocalFromUSdc = Math.round(amountNum * exchangeRate);
    const recipientAmount = Math.floor(totalLocalFromUSdc / 1.01);
    const feeAmount = totalLocalFromUSdc - recipientAmount;

    console.log(`[${requestId}] Amount calculation:`, {
      usdc: amountNum,
      rate: exchangeRate,
      total_local: totalLocalFromUSdc,
      recipient_gets: recipientAmount,
      platform_fee: feeAmount,
      fee_percentage: ((feeAmount / totalLocalFromUSdc) * 100).toFixed(2) + '%'
    });

    // ========================================================================
    // STEP 5: BUILD PRETIUM API REQUEST PER OFFICIAL DOCS
    // Reference: docs/offramp.md
    // ========================================================================

    let disburseRequest: PretiumDisburseRequest;

    if (currency === 'NGN' && paymentType === 'BANK_TRANSFER') {
      // NGN Bank Transfer - TESTING WITHOUT FEE FIRST
      // If Pretium docs don't show account_name for NGN, maybe we shouldn't send it?
      disburseRequest = {
        type: paymentType,
        account_name: accountName, // Keeping this as it's standard
        amount: recipientAmount.toString(), // Send only recipient amount (no fee for now)
        // fee: feeAmount.toString(), // OMITTED - testing if this causes issues
        chain: PRETIUM_CONFIG.CHAIN,
        transaction_hash: transactionHash,
        callback_url: PRETIUM_CONFIG.WEBHOOK_URL,
        account_number: accountNumber!,
        bank_code: bankCode!,
        bank_name: bankName!,
      };

      console.log(`[${requestId}] NGN Request (fee omitted):`, JSON.stringify(disburseRequest, null, 2));

    } else {
      // KES/GHS Mobile Money - Follow docs exactly
      disburseRequest = {
        type: paymentType,
        account_name: accountName,
        amount: totalLocalFromUSdc.toString(), // Total including fee
        fee: feeAmount.toString(), // Fee to be credited to our wallet
        chain: PRETIUM_CONFIG.CHAIN,
        transaction_hash: transactionHash,
        callback_url: PRETIUM_CONFIG.WEBHOOK_URL,
        shortcode: shortcode!,
        mobile_network: mobileNetwork!,
        ...(accountNumber && { account_number: accountNumber }), // For PAYBILL
      };

      console.log(`[${requestId}] ${currency} Request (with fee):`, JSON.stringify(disburseRequest, null, 2));
    }

    // ========================================================================
    // STEP 6: CALL PRETIUM API
    // ========================================================================

    console.log(`[${requestId}] Calling Pretium API: POST /v1/pay/${currency}`);
    let pretiumResponse;

    try {
      pretiumResponse = await pretiumClient.disburse(disburseRequest, currency);
      console.log(`[${requestId}] Pretium API success:`, JSON.stringify(pretiumResponse, null, 2));
    } catch (error) {
      console.error('='.repeat(80));
      console.error(`[${requestId}] PRETIUM API ERROR`);
      console.error('='.repeat(80));
      console.error(`[${requestId}] Error:`, error);
      console.error(`[${requestId}] Request that failed:`, JSON.stringify(disburseRequest, null, 2));
      console.error('='.repeat(80));

      const pretiumError = error as { message?: string; data?: unknown; code?: number };
      return NextResponse.json(
        {
          error: pretiumError.message || 'Pretium API error',
          details: pretiumError.data || {},
          requestId
        },
        { status: pretiumError.code || 500 }
      );
    }

    // Validate response code
    if (pretiumResponse.code !== 200) {
      console.error('='.repeat(80));
      console.error(`[${requestId}] PRETIUM RETURNED NON-200 CODE`);
      console.error('='.repeat(80));
      console.error(`[${requestId}] Response:`, JSON.stringify(pretiumResponse, null, 2));
      console.error('='.repeat(80));

      return NextResponse.json(
        {
          error: pretiumResponse.message || 'Pretium request failed',
          details: pretiumResponse.data,
          requestId
        },
        { status: pretiumResponse.code }
      );
    }

    const { transaction_code, status, message } = pretiumResponse.data;

    if (!transaction_code) {
      console.error(`[${requestId}] CRITICAL: No transaction_code in response!`);
      return NextResponse.json(
        { error: 'No transaction code received from Pretium', requestId },
        { status: 500 }
      );
    }

    console.log('='.repeat(80));
    console.log(`[${requestId}] PRETIUM SUCCESS - Transaction Code: ${transaction_code}`);
    console.log('='.repeat(80));

    // ========================================================================
    // STEP 7: SAVE TO DATABASE IMMEDIATELY
    // THIS IS CRITICAL - Must happen before returning to frontend!
    // ========================================================================

    console.log(`[${requestId}] Saving to database...`);

    try {
      // Ensure user exists
      let user = await DatabaseService.getUserByWallet(returnAddress);
      if (!user) {
        console.log(`[${requestId}] Creating new user for wallet: ${returnAddress}`);
        user = await DatabaseService.createUser(
          returnAddress,
          paymentType === 'MOBILE' ? shortcode : ''
        );
        console.log(`[${requestId}] User created: ${user.id}`);
      } else {
        console.log(`[${requestId}] Existing user found: ${user.id}`);
      }

      // Create order record
      console.log(`[${requestId}] Creating Pretium order record...`);
      const createdOrder = await DatabaseService.createPretiumOrder({
        transactionCode: transaction_code,
        userId: user.id,
        walletAddress: returnAddress,
        amountInUsdc: amountNum,
        amountInLocal: recipientAmount,
        currency: currency as 'KES' | 'GHS' | 'NGN',
        phoneNumber: paymentType === 'MOBILE' ? shortcode : undefined,
        tillNumber: paymentType === 'BUY_GOODS' ? shortcode : undefined,
        paybillNumber: paymentType === 'PAYBILL' ? shortcode : undefined,
        paybillAccount: paymentType === 'PAYBILL' ? accountNumber : undefined,
        accountNumber: paymentType === 'BANK_TRANSFER' ? accountNumber : undefined,
        bankCode: currency === 'NGN' ? bankCode : undefined,
        bankName: currency === 'NGN' ? bankName : undefined,
        accountName: accountName,
        rate: exchangeRate,
        transactionHash: transactionHash,
        status: 'pending',
        pretiumStatus: status,
        fee: feeAmount,
        fid,
        mobileNetwork: mobileNetwork,
        settlementAddress: PRETIUM_CONFIG.SETTLEMENT_ADDRESS,
        callbackUrl: PRETIUM_CONFIG.WEBHOOK_URL,
        rawDisburseRequest: JSON.parse(JSON.stringify(disburseRequest)) as Record<string, unknown>,
        rawDisburseResponse: JSON.parse(JSON.stringify(pretiumResponse.data)) as Record<string, unknown>,
      });

      console.log('='.repeat(80));
      console.log(`[${requestId}] DATABASE SAVE SUCCESS`);
      console.log('='.repeat(80));
      console.log(`[${requestId}] Order ID: ${createdOrder.id}`);
      console.log(`[${requestId}] Transaction Code: ${createdOrder.transaction_code}`);
      console.log('='.repeat(80));

      // Log analytics event
      await DatabaseService.logAnalyticsEvent('pretium_disburse_initiated', returnAddress, {
        request_id: requestId,
        transaction_code,
        amount_usdc: amountNum,
        amount_local_total: totalLocalFromUSdc,
        recipient_amount: recipientAmount,
        fee_amount: feeAmount,
        payment_type: paymentType,
        currency,
      });

    } catch (dbError) {
      // DATABASE SAVE FAILED - THIS IS CRITICAL!
      console.error('='.repeat(80));
      console.error(`[${requestId}] CRITICAL: DATABASE SAVE FAILED`);
      console.error('='.repeat(80));
      console.error(`[${requestId}] Error:`, dbError);
      console.error(`[${requestId}] Transaction Code: ${transaction_code}`);
      console.error(`[${requestId}] Wallet: ${returnAddress}`);
      console.error(`[${requestId}] Amount: ${amountNum} USDC`);
      console.error('='.repeat(80));
      console.error(`[${requestId}] PAYMENT WILL COMPLETE BUT WON'T BE TRACKED!`);
      console.error('='.repeat(80));

      // Still return success to user since Pretium accepted the payment
      // But log this heavily so we can manually track it
      return NextResponse.json({
        success: true,
        warning: 'Payment initiated but tracking failed - contact support',
        transactionCode: transaction_code,
        status,
        message,
        requestId,
        totalAmount: totalLocalFromUSdc,
        recipientAmount,
        feeAmount,
        exchangeRate,
        settlementAddress: PRETIUM_CONFIG.SETTLEMENT_ADDRESS,
      });
    }

    // ========================================================================
    // STEP 8: RETURN SUCCESS
    // ========================================================================

    console.log(`[${requestId}] Returning success to frontend`);
    return NextResponse.json({
      success: true,
      transactionCode: transaction_code,
      status,
      message,
      requestId,
      totalAmount: totalLocalFromUSdc,
      recipientAmount,
      feeAmount,
      exchangeRate,
      settlementAddress: PRETIUM_CONFIG.SETTLEMENT_ADDRESS,
    });

  } catch (error) {
    console.error('='.repeat(80));
    console.error(`[${requestId}] UNEXPECTED ERROR`);
    console.error('='.repeat(80));
    console.error(`[${requestId}] Error:`, error);
    console.error(`[${requestId}] Stack:`, error instanceof Error ? error.stack : 'No stack');
    console.error('='.repeat(80));

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        requestId
      },
      { status: 500 }
    );
  }
}
