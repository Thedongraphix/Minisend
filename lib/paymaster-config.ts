/**
 * Paymaster configuration for gasless transactions
 * Based on Coinbase Developer Platform (CDP) Paymaster
 */

export interface PaymasterConfig {
  rpcUrl: string;
  isEnabled: boolean;
  network: 'mainnet' | 'testnet';
  contractAllowlist: string[];
  maxSponsorshipUSD: number;
}

export const paymasterConfig: PaymasterConfig = {
  // Get this from CDP Dashboard -> Paymaster -> Configuration
  rpcUrl: process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL || '',
  isEnabled: process.env.NODE_ENV === 'production' ?
    (process.env.NEXT_PUBLIC_PAYMASTER_ENABLED === 'true') : true, // Always enabled in dev
  network: process.env.NEXT_PUBLIC_PAYMASTER_NETWORK as 'mainnet' | 'testnet' || 'testnet',

  // USDC contract on Base - allowlist this in CDP Dashboard
  contractAllowlist: [
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base mainnet
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
  ],

  // Reasonable limits for Minisend
  maxSponsorshipUSD: 100, // $100 max per user per month
};

export const isPaymasterEnabled = (): boolean => {
  return paymasterConfig.isEnabled && Boolean(paymasterConfig.rpcUrl);
};

export const getPaymasterRpcUrl = (): string => {
  if (!paymasterConfig.rpcUrl) {
    return '';
  }
  return paymasterConfig.rpcUrl;
};

// Contract functions to allowlist in CDP Dashboard
export const ALLOWLISTED_FUNCTIONS = [
  'transfer(address,uint256)', // USDC transfer function
  'approve(address,uint256)',  // USDC approve function (if needed)
] as const;

export const ENTRY_POINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as const;
export const FACTORY_ADDRESS = '0x15Ba39375ee2Ab563E8873C8390be6f2E2F50232';