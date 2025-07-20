import { getMPesaAccessToken } from './auth';
import { generateSecurityCredential } from './security';
import { B2CPaymentRequest, B2CPaymentResponse } from './types';

export async function sendB2CPayment(request: B2CPaymentRequest): Promise<B2CPaymentResponse> {
  try {
    const accessToken = await getMPesaAccessToken();
    const securityCredential = generateSecurityCredential();
    
    // Format phone number (remove + if present, ensure starts with 254)
    const formattedPhone = request.phoneNumber.replace(/^\+/, '');
    const phone = formattedPhone.startsWith('254') ? formattedPhone : `254${formattedPhone.substring(1)}`;
    
    // Validate phone number format
    if (!/^254[17]\d{8}$/.test(phone)) {
      return {
        success: false,
        error: 'Invalid Kenyan phone number format. Use +254XXXXXXXXX'
      };
    }

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    
    // Construct callback URLs with fallback
    const baseCallbackUrl = process.env.MPESA_CALLBACK_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://minitest-phi.vercel.app/api/mpesa'
        : 'https://minitest-phi.vercel.app/api/mpesa');

    const requestBody = {
      InitiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
      SecurityCredential: securityCredential,
      CommandID: 'BusinessPayment', // Standard B2C payment
      Amount: Math.round(request.amount), // M-Pesa requires whole numbers
      PartyA: process.env.MPESA_SHORTCODE || '174379',
      PartyB: phone,
      Remarks: request.description || 'USDC Off-ramp payout',
      QueueTimeOutURL: `${baseCallbackUrl}/b2c/timeout`,
      ResultURL: `${baseCallbackUrl}/b2c/result`,
      Occasion: request.reference || 'USDC-to-KSH'
    };

    console.log('B2C Request:', {
      ...requestBody,
      SecurityCredential: '[HIDDEN]', // Don't log the credential
      InitiatorName: requestBody.InitiatorName,
      Amount: requestBody.Amount,
      PartyB: phone
    });

    const response = await fetch(
      `${baseUrl}/mpesa/b2c/v1/paymentrequest`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    const data = await response.json();
    console.log('B2C Response:', JSON.stringify(data, null, 2));

    if (data.ResponseCode === '0') {
      return {
        success: true,
        conversationId: data.ConversationID,
        originatorConversationId: data.OriginatorConversationID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription
      };
    } else {
      return {
        success: false,
        error: data.ResponseDescription || data.errorMessage || 'B2C payment failed',
        responseCode: data.ResponseCode
      };
    }

  } catch (error) {
    console.error('B2C Payment Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}