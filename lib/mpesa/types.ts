export interface B2CPaymentRequest {
  phoneNumber: string;
  amount: number;
  reference: string;
  description: string;
}

export interface B2CPaymentResponse {
  success: boolean;
  conversationId?: string;
  originatorConversationId?: string;
  responseCode?: string;
  responseDescription?: string;
  error?: string;
}

export interface B2CCallbackData {
  result: {
    resultType: number;
    resultCode: number;
    resultDesc: string;
    originatorConversationID: string;
    conversationID: string;
    transactionID: string;
    resultParameters?: {
      resultParameter: Array<{
        key: string;
        value: any;
      }>;
    };
  };
}