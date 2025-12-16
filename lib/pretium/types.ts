// Pretium API Types
// Based on official Pretium API documentation

export type PretiumPaymentType = 'MOBILE' | 'BUY_GOODS' | 'PAYBILL' | 'BANK_TRANSFER';

export type PretiumChain = 'CELO' | 'BASE' | 'STELLAR' | 'TRON' | 'SCROLL';

export type PretiumTransactionStatus =
  | 'PENDING'
  | 'COMPLETE'
  | 'FAILED'
  | 'PROCESSING';

export type PretiumTransactionCategory = 'DISBURSEMENT' | 'COLLECTION';

export interface PretiumCountry {
  id: number;
  name: string;
  currency_code: string;
  phone_code: string;
}

export interface PretiumExchangeRate {
  buying_rate: number;
  selling_rate: number;
  quoted_rate: number;
}

export interface PretiumDisburseRequest {
  type: PretiumPaymentType;
  shortcode?: string; // Required for mobile money, optional for bank transfers
  account_number?: string; // Required for PAYBILL and NGN bank transfers
  account_name: string; // Required: Recipient account name
  amount: string;
  fee?: string; // Optional fee for collection
  mobile_network?: string; // Required for mobile money (e.g., "Safaricom", "MTN")
  chain: PretiumChain;
  transaction_hash: string;
  callback_url?: string;
  bank_code?: string; // Required for NGN bank transfers
  bank_name?: string; // Required for NGN bank transfers
}

export interface PretiumDisburseResponse {
  code: number;
  message: string;
  data: {
    status: PretiumTransactionStatus;
    transaction_code: string;
    message: string;
  };
}

export interface PretiumStatusRequest {
  transaction_code: string;
}

export interface PretiumTransactionData {
  id: number;
  transaction_code: string;
  status: PretiumTransactionStatus;
  amount: string;
  amount_in_usd: string;
  type: PretiumPaymentType;
  shortcode: string;
  account_number: string | null;
  public_name: string;
  receipt_number: string;
  category: PretiumTransactionCategory;
  chain: PretiumChain;
  asset: string | null;
  transaction_hash: string | null;
  message: string;
  currency_code: string;
  is_released: boolean;
  created_at: string;
}

export interface PretiumStatusResponse {
  code: number;
  message: string;
  data: PretiumTransactionData;
}

export interface PretiumWebhookPayload {
  status?: PretiumTransactionStatus;
  transaction_code: string;
  receipt_number?: string;
  public_name?: string | null;
  message?: string;
  is_released?: boolean;
  transaction_hash?: string;
}

export interface PretiumCountriesResponse {
  code: number;
  message: string;
  data: PretiumCountry[];
}

export interface PretiumExchangeRateRequest {
  currency_code: string;
}

export interface PretiumExchangeRateResponse {
  code: number;
  message: string;
  data: PretiumExchangeRate;
}

export interface PretiumApiError {
  code: number;
  message: string;
  data?: unknown;
}

// Internal Types for Minisend Integration

export interface PretiumOrderPayload {
  type: PretiumPaymentType;
  shortcode: string;
  accountNumber?: string;
  amount: number;
  fee: number;
  currency: 'KES' | 'GHS';
  transactionHash: string;
  accountName: string;
  walletAddress: string;
  fid?: number;
}

export interface PretiumOrderResult {
  success: boolean;
  transactionCode: string;
  status: PretiumTransactionStatus;
  message: string;
  error?: string;
}
