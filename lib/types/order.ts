// Order data interface for receipt generation
export interface OrderData {
  id: string;
  paycrest_order_id?: string;
  amount_in_usdc: number;
  amount_in_local: number;
  local_currency: 'KES' | 'NGN' | 'GHS' | 'UGX';
  account_name: string;
  phone_number?: string;
  account_number?: string;
  bank_code?: string;
  bank_name?: string;
  till_number?: string;
  paybill_number?: string;
  paybill_account?: string;
  wallet_address: string;
  rate: number;
  sender_fee: number;
  transaction_fee: number;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  receive_address?: string;
  valid_until?: string;
  blockchain_tx_hash?: string;
  transactionHash?: string;
  currency?: 'KES' | 'NGN' | 'GHS' | 'UGX';
  amount?: string;
  accountName?: string;
  phoneNumber?: string;
  accountNumber?: string;
  bankCode?: string;
  returnAddress?: string;
  pretium_receipt_number?: string; // M-Pesa transaction code
  pretium_transaction_code?: string; // Pretium internal code
  public_name?: string; // Verified recipient name from webhook
}