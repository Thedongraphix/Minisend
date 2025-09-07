export interface ReceiptData {
  // Transaction Identity
  transactionId: string;
  paycrestOrderId: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  
  // Financial Details
  usdcAmount: number;
  localAmount: number;
  localCurrency: 'KES' | 'NGN';
  exchangeRate: number;
  
  // Fees Breakdown
  senderFee: number;
  transactionFee: number;
  totalFees: number;
  netAmount: number; // localAmount - totalFees for recipient
  
  // Recipient Information
  recipientName: string;
  recipientContact: string; // phone for KES, account number for NGN
  recipientBank?: string; // for NGN only
  recipientBankCode?: string; // for NGN only
  
  // Sender Details
  senderWallet: string;
  
  // Technical Details
  network: 'base';
  token: 'USDC';
  blockchainTxHash?: string;
  
  // Branding & Support
  receiptNumber: string; // Generated unique receipt number
  supportEmail: string;
  supportUrl: string;
}

export interface ReceiptStyles {
  // Brand Colors (Farcaster Purple & Base Blue)
  primaryColor: string; // Farcaster Purple
  secondaryColor: string; // Base Blue
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  backgroundPrimary: string;
  backgroundSecondary: string;
  
  // Typography
  fontFamily: string;
  headerFontSize: number;
  bodyFontSize: number;
  smallFontSize: number;
}

export const MINISEND_RECEIPT_STYLES: ReceiptStyles = {
  primaryColor: '#7C65C1', // Farcaster Purple
  secondaryColor: '#0052FF', // Base Blue
  accentColor: '#10B981', // Success Green
  textPrimary: '#1F2937', // Dark Gray
  textSecondary: '#6B7280', // Medium Gray
  backgroundPrimary: '#FFFFFF', // White
  backgroundSecondary: '#F9FAFB', // Light Gray
  
  fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
  headerFontSize: 24,
  bodyFontSize: 12,
  smallFontSize: 10,
};

export interface ReceiptGenerationOptions {
  includeQRCode?: boolean;
  includeLogo?: boolean;
  format?: 'A4' | 'letter' | 'receipt'; // receipt = compact thermal receipt style
  language?: 'en';
}