import { DatabaseService } from '@/lib/supabase/config';
import { generateReceiptPDF } from '@/lib/receipt-generator';
import type { OrderData } from '@/lib/types/order';
import type { Order } from '@/lib/supabase/config';

/**
 * Receipt helper functions for Pretium transactions
 */

/**
 * Check if receipt is available for a transaction
 */
export async function isReceiptAvailable(transactionCode: string): Promise<boolean> {
  try {
    const order = await DatabaseService.getOrderByPretiumTransactionCode(transactionCode);
    return order !== null && order.status === 'completed' && !!order.pretium_receipt_number;
  } catch {
    return false;
  }
}

/**
 * Get receipt data for a Pretium transaction
 */
export async function getReceiptData(transactionCode: string): Promise<{
  available: boolean;
  order?: Order;
  receiptUrl?: string;
  mpesaCode?: string;
}> {
  try {
    const order = await DatabaseService.getOrderByPretiumTransactionCode(transactionCode);

    if (!order) {
      return { available: false };
    }

    const receiptUrl = order.status === 'completed'
      ? `/api/pretium/receipt/${transactionCode}`
      : undefined;

    return {
      available: order.status === 'completed',
      order,
      receiptUrl,
      mpesaCode: order.pretium_receipt_number,
    };
  } catch {
    return { available: false };
  }
}

/**
 * Convert Order to OrderData format for receipt generation
 */
export function orderToReceiptData(order: Order): OrderData {
  return {
    id: order.id,
    paycrest_order_id: order.paycrest_order_id,
    amount_in_usdc: order.amount_in_usdc,
    amount_in_local: order.amount_in_local,
    local_currency: order.local_currency,
    account_name: order.account_name || 'Unknown',
    phone_number: order.phone_number,
    account_number: order.account_number,
    bank_code: order.bank_code,
    bank_name: order.bank_name,
    wallet_address: order.wallet_address,
    rate: order.rate || 0,
    sender_fee: order.sender_fee || 0,
    transaction_fee: order.transaction_fee || 0,
    status: (order.status as 'completed' | 'pending' | 'failed') || 'pending',
    created_at: order.created_at,
    blockchain_tx_hash: order.transaction_hash,
    pretium_receipt_number: order.pretium_receipt_number,
    pretium_transaction_code: order.pretium_transaction_code,
  };
}

/**
 * Generate receipt PDF from transaction code
 */
export async function generateReceiptForTransaction(
  transactionCode: string
): Promise<Blob | null> {
  try {
    const order = await DatabaseService.getOrderByPretiumTransactionCode(transactionCode);

    if (!order || order.status !== 'completed') {
      return null;
    }

    const orderData = orderToReceiptData(order);
    return await generateReceiptPDF(orderData);
  } catch (error) {
    console.error('Failed to generate receipt:', error);
    return null;
  }
}

/**
 * Get receipt summary for display
 */
export interface ReceiptSummary {
  transactionCode: string;
  mpesaReceiptNumber?: string;
  recipientName?: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  downloadUrl: string;
}

export async function getReceiptSummary(
  transactionCode: string
): Promise<ReceiptSummary | null> {
  try {
    const order = await DatabaseService.getOrderByPretiumTransactionCode(transactionCode);

    if (!order) {
      return null;
    }

    return {
      transactionCode,
      mpesaReceiptNumber: order.pretium_receipt_number,
      recipientName: order.account_name || undefined,
      amount: order.amount_in_local,
      currency: order.local_currency,
      date: order.created_at,
      status: order.status,
      downloadUrl: `/api/pretium/receipt/${transactionCode}`,
    };
  } catch {
    return null;
  }
}
