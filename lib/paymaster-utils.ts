/**
 * Paymaster utilities for gasless transactions in Minisend
 * Integrates with OnchainKit Transaction component
 */

import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { paymasterConfig, isPaymasterEnabled, getPaymasterRpcUrl, ENTRY_POINT_ADDRESS } from './paymaster-config';

/**
 * Create paymaster client for sponsoring transactions
 */
export function createPaymasterClient() {
  const rpcUrl = getPaymasterRpcUrl();

  if (!rpcUrl) {
    throw new Error('Paymaster RPC URL not configured');
  }

  const chain = paymasterConfig.network === 'mainnet' ? base : baseSepolia;

  return createPimlicoClient({
    chain,
    transport: http(rpcUrl),
    entryPoint: {
      address: ENTRY_POINT_ADDRESS,
      version: "0.7" as const,
    },
  });
}

/**
 * Check if transaction should be sponsored
 */
export function shouldSponsorTransaction(contractAddress: string): boolean {
  if (!isPaymasterEnabled()) {
    return false;
  }

  // Check if contract is in allowlist
  const isAllowlisted = paymasterConfig.contractAllowlist.some(
    address => address.toLowerCase() === contractAddress.toLowerCase()
  );

  return isAllowlisted;
}

/**
 * Get paymaster configuration for OnchainKit Transaction
 */
export function getPaymasterOptions() {
  if (!isPaymasterEnabled()) {
    return undefined;
  }

  try {
    const paymasterClient = createPaymasterClient();

    return {
      // This will be used by OnchainKit to sponsor transactions
      sponsorUserOperation: paymasterClient.sponsorUserOperation,
    };
  } catch {
    return undefined;
  }
}

/**
 * Enhanced transaction options with paymaster support
 */
export interface EnhancedTransactionOptions {
  shouldSponsor?: boolean;
  contractAddress?: string;
  maxSponsorshipUSD?: number;
}

/**
 * Determine if specific transaction should use paymaster
 */
export function getTransactionSponsorshipConfig(options: EnhancedTransactionOptions) {
  const { shouldSponsor = true, contractAddress, maxSponsorshipUSD } = options;

  // If explicitly disabled
  if (!shouldSponsor) {
    return { usePaymaster: false };
  }

  // If no paymaster configured
  if (!isPaymasterEnabled()) {
    return { usePaymaster: false, reason: 'Paymaster not configured' };
  }

  // If contract not allowlisted
  if (contractAddress && !shouldSponsorTransaction(contractAddress)) {
    return {
      usePaymaster: false,
      reason: `Contract ${contractAddress} not allowlisted for sponsorship`
    };
  }

  // Check sponsorship limits
  if (maxSponsorshipUSD && maxSponsorshipUSD > paymasterConfig.maxSponsorshipUSD) {
    return {
      usePaymaster: false,
      reason: `Transaction amount $${maxSponsorshipUSD} exceeds max sponsorship $${paymasterConfig.maxSponsorshipUSD}`
    };
  }

  return {
    usePaymaster: true,
    paymasterOptions: getPaymasterOptions(),
    network: paymasterConfig.network
  };
}

/**
 * User-friendly status messages
 */
export function getGaslessStatusMessage(sponsored: boolean): string {
  if (sponsored) {
    return '⚡ Gas-free transaction - powered by Minisend';
  }
  return '⛽ You\'ll pay a small gas fee for this transaction';
}

/**
 * Estimate transaction cost savings
 */
export function estimateGasSavings(transactionCount: number = 1): string {
  // Base network transactions typically cost ~$0.01-0.02
  const avgGasCostUSD = 0.015;
  const savings = transactionCount * avgGasCostUSD;

  if (savings < 0.01) {
    return '$0.01';
  }

  return `$${savings.toFixed(3)}`;
}