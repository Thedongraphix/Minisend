import { NextRequest, NextResponse } from 'next/server';
import { formatPhoneNumber, formatTillNumber } from '@/lib/utils/tillValidator';
import { formatGhanaPhoneNumber } from '@/lib/utils/ghanaValidator';
import { detectKenyanCarrier } from '@/lib/utils/phoneCarrier';
import { detectGhanaNetwork } from '@/lib/utils/ghanaNetworkDetector';
import { PRETIUM_CONFIG, getPretiumHeaders, isCurrencySupported } from '@/lib/pretium/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, tillNumber, paybillNumber, type, currency = 'KES' } = body;

    // Validate currency is supported
    if (!isCurrencySupported(currency)) {
      return NextResponse.json(
        { error: `Currency ${currency} is not supported. Supported currencies: KES, GHS, NGN` },
        { status: 400 }
      );
    }

    // Validate based on payment type
    if (type === 'MOBILE' && !phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required for mobile payments' },
        { status: 400 }
      );
    }

    if (type === 'BUY_GOODS' && !tillNumber) {
      return NextResponse.json(
        { error: 'Till number is required for buy goods payments' },
        { status: 400 }
      );
    }

    if (type === 'PAYBILL' && !paybillNumber) {
      return NextResponse.json(
        { error: 'Paybill number is required for paybill payments' },
        { status: 400 }
      );
    }

    let formattedNumber: string;
    let shortcode: string;

    // Format the number based on type and currency
    let mobileNetwork: string;

    try {
      if (type === 'MOBILE') {
        if (currency === 'KES') {
          formattedNumber = formatPhoneNumber(phoneNumber);

          // Validate it's a Kenyan number (starts with 254)
          if (!formattedNumber.startsWith('254')) {
            return NextResponse.json(
              { error: 'Invalid Kenyan phone number' },
              { status: 400 }
            );
          }

          // Validate length (254 + 9 digits = 12 total)
          if (formattedNumber.length !== 12) {
            return NextResponse.json(
              { error: 'Phone number must be 9 digits after country code' },
              { status: 400 }
            );
          }

          // Detect carrier for KES
          const carrier = detectKenyanCarrier(formattedNumber);
          mobileNetwork = carrier === 'SAFARICOM' ? 'Safaricom' : carrier === 'AIRTEL' ? 'Airtel' : 'Safaricom';

          // Convert to shortcode format (0XXXXXXXXX)
          shortcode = '0' + formattedNumber.substring(3);
        } else if (currency === 'GHS') {
          formattedNumber = formatGhanaPhoneNumber(phoneNumber);

          // Validate it's a Ghanaian number (starts with 233)
          if (!formattedNumber.startsWith('233')) {
            return NextResponse.json(
              { error: 'Invalid Ghanaian phone number' },
              { status: 400 }
            );
          }

          // Validate length (233 + 9 digits = 12 total)
          if (formattedNumber.length !== 12) {
            return NextResponse.json(
              { error: 'Phone number must be 9 digits after country code' },
              { status: 400 }
            );
          }

          // Detect network for GHS
          const network = detectGhanaNetwork(formattedNumber);
          mobileNetwork = network === 'MTN' ? 'MTN' : network === 'VODAFONE' ? 'Vodafone' : network === 'AIRTELTIGO' ? 'AirtelTigo' : 'MTN';

          // Convert to shortcode format (0XXXXXXXXX)
          shortcode = '0' + formattedNumber.substring(3);
        } else {
          return NextResponse.json(
            { error: 'Unsupported currency for phone verification' },
            { status: 400 }
          );
        }
      } else if (type === 'BUY_GOODS') {
        // BUY_GOODS (till numbers) only supported for KES
        if (currency !== 'KES') {
          return NextResponse.json(
            { error: 'Till numbers are only supported for KES' },
            { status: 400 }
          );
        }

        formattedNumber = formatTillNumber(tillNumber);

        // Validate till number format (typically 5-7 digits)
        if (!/^\d{5,7}$/.test(formattedNumber)) {
          return NextResponse.json(
            { error: 'Till number must be 5-7 digits' },
            { status: 400 }
          );
        }

        mobileNetwork = 'Safaricom';
        shortcode = formattedNumber;
      } else if (type === 'PAYBILL') {
        // PAYBILL only supported for KES
        if (currency !== 'KES') {
          return NextResponse.json(
            { error: 'Paybill numbers are only supported for KES' },
            { status: 400 }
          );
        }

        formattedNumber = formatTillNumber(paybillNumber);

        // Validate paybill number format (typically 5-7 digits)
        if (!/^\d{5,7}$/.test(formattedNumber)) {
          return NextResponse.json(
            { error: 'Paybill number must be 5-7 digits' },
            { status: 400 }
          );
        }

        mobileNetwork = 'Safaricom';
        shortcode = formattedNumber;
      } else {
        return NextResponse.json(
          { error: 'Invalid payment type. Must be MOBILE, BUY_GOODS, or PAYBILL' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Invalid number format',
          isValid: false
        },
        { status: 400 }
      );
    }

    // Call Pretium validation API
    try {
      const validationPayload = {
        type: type,
        shortcode: shortcode,
        mobile_network: mobileNetwork
      };

      const validationResponse = await fetch(
        `${PRETIUM_CONFIG.BASE_URL}/v1/validation/${currency}`,
        {
          method: 'POST',
          headers: getPretiumHeaders(),
          body: JSON.stringify(validationPayload),
        }
      );

      if (!validationResponse.ok) {
        // If validation API fails, return basic validation success
        // This is because the docs mention reliability varies
        return NextResponse.json({
          success: true,
          isValid: true,
          formattedNumber,
          message: 'Phone number format validated',
          accountName: null, // Let user enter manually
          verified: false
        });
      }

      const validationData = await validationResponse.json();

      // Check if we got account name from Pretium
      if (validationData.code === 200 && validationData.data) {
        const publicName = validationData.data.public_name || validationData.data.name;

        // If we got a valid public name from Pretium
        if (publicName && publicName.trim() && validationData.data.status !== 'FAILED') {
          return NextResponse.json({
            success: true,
            isValid: true,
            formattedNumber,
            message: 'Account verified successfully',
            accountName: publicName.trim(),
            verified: true
          });
        }
      }

      // Fallback if Pretium doesn't return a valid name
      // This is expected as docs mention reliability varies
      return NextResponse.json({
        success: true,
        isValid: true,
        formattedNumber,
        message: 'Phone number validated',
        accountName: null, // Let user enter manually
        verified: false
      });
    } catch {
      // If Pretium API call fails, return basic validation
      return NextResponse.json({
        success: true,
        isValid: true,
        formattedNumber,
        message: 'Phone number format validated',
        accountName: null, // Let user enter manually
        verified: false
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify number' },
      { status: 500 }
    );
  }
}
