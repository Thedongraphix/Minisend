/**
 * OnchainKit Paymaster configuration for gasless transactions
 * Based on Coinbase Developer Platform (CDP) Paymaster
 *
 * Required CDP Dashboard Configuration:
 * 1. Navigate to https://portal.cdp.coinbase.com/products/bundler-and-paymaster
 * 2. Enable paymaster toggle for Base Mainnet
 * 3. Add allowlisted contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC)
 * 4. Add allowlisted function: transfer(address,uint256)
 * 5. Set per-user and global spending limits
 */

export const paymasterConfig = {
  // CDP Paymaster RPC URL - this is your bundler + paymaster endpoint
  rpcUrl: process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL || '',

  // Enable paymaster in production only if explicitly enabled, always enabled in dev
  isEnabled: process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_PAYMASTER_ENABLED === 'true'
    : true,

  // Network selection for chain configuration
  network: (process.env.NEXT_PUBLIC_PAYMASTER_NETWORK as 'mainnet' | 'testnet') || 'mainnet',
} as const;

// Helper functions
export const isPaymasterEnabled = (): boolean => {
  return paymasterConfig.isEnabled && Boolean(paymasterConfig.rpcUrl);
};

export const getPaymasterRpcUrl = (): string => {
  return paymasterConfig.rpcUrl;
};

// USDC contract addresses for reference
export const USDC_CONTRACTS = {
  mainnet: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base mainnet
  testnet: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
} as const;

// Functions that should be allowlisted in CDP Dashboard
export const CDP_ALLOWLISTED_FUNCTIONS = [
  'transfer(address,uint256)', // Required for USDC transfers
] as const;