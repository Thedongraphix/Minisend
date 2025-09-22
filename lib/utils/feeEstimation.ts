/**
 * Fee estimation utilities for PayCrest transactions
 * Since PayCrest doesn't provide a fee estimation endpoint,
 * we use conservative estimates based on typical fee structures
 */

export interface FeeEstimate {
  estimatedSenderFee: number;
  estimatedTransactionFee: number;
  totalEstimatedFees: number;
  totalAmountWithFees: number;
  estimationMethod: 'conservative' | 'historical' | 'api';
}

/**
 * Conservative fee estimation for PayCrest orders
 * Uses a percentage-based approach as a safety buffer
 */
export function estimatePaycrestFees(baseAmountUSDC: number): FeeEstimate {
  // Conservative estimates based on typical fintech fee structures
  // PayCrest typically charges around 1-2% in total fees
  const feePercentage = 0.02; // 2% conservative estimate

  const totalEstimatedFees = baseAmountUSDC * feePercentage;

  // Split between sender fee (usually larger) and transaction fee
  const estimatedSenderFee = totalEstimatedFees * 0.8; // 80% of fees
  const estimatedTransactionFee = totalEstimatedFees * 0.2; // 20% of fees

  return {
    estimatedSenderFee,
    estimatedTransactionFee,
    totalEstimatedFees,
    totalAmountWithFees: baseAmountUSDC + totalEstimatedFees,
    estimationMethod: 'conservative'
  };
}

/**
 * Validate if user has sufficient balance including estimated fees
 */
export function validateBalanceWithFeeEstimate(
  userBalance: number,
  baseAmount: number,
  gasBuffer: number = 0.1 // 10% buffer for gas
): {
  hasSufficientBalance: boolean;
  feeEstimate: FeeEstimate;
  totalRequired: number;
  shortfall?: number;
} {
  const feeEstimate = estimatePaycrestFees(baseAmount);
  const totalRequired = feeEstimate.totalAmountWithFees * (1 + gasBuffer);

  const hasSufficientBalance = userBalance >= totalRequired;

  return {
    hasSufficientBalance,
    feeEstimate,
    totalRequired,
    shortfall: hasSufficientBalance ? undefined : totalRequired - userBalance
  };
}

/**
 * Get user-friendly fee breakdown for display
 */
export function getFeeBreakdownMessage(
  baseAmount: number,
  actualSenderFee?: number,
  actualTransactionFee?: number
): string {
  if (actualSenderFee !== undefined && actualTransactionFee !== undefined) {
    const totalFees = actualSenderFee + actualTransactionFee;
    const feePercentage = (totalFees / baseAmount) * 100;

    return `Total fees: $${totalFees.toFixed(4)} (${feePercentage.toFixed(2)}%) - Service: $${actualSenderFee.toFixed(4)}, Network: $${actualTransactionFee.toFixed(4)}`;
  }

  const estimate = estimatePaycrestFees(baseAmount);
  const feePercentage = (estimate.totalEstimatedFees / baseAmount) * 100;

  return `Estimated fees: ~$${estimate.totalEstimatedFees.toFixed(4)} (~${feePercentage.toFixed(2)}%)`;
}