import { base, baseSepolia } from 'wagmi/chains'

// USDC contract addresses - Base mainnet and testnet
export const USDC_CONTRACTS = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base mainnet
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
} as const

// Network configurations - Base mainnet and testnet
export const NETWORK_CONFIG = {
  [base.id]: {
    name: 'Base',
    explorerUrl: 'https://basescan.org',
    isTestnet: false,
  },
  [baseSepolia.id]: {
    name: 'Base Sepolia',
    explorerUrl: 'https://sepolia.basescan.org',
    isTestnet: true,
  },
} as const

// Helper function to get USDC contract address for current chain
export function getUSDCContract(chainId: number): string {
  const contract = USDC_CONTRACTS[chainId as keyof typeof USDC_CONTRACTS]
  if (!contract) {
    // Fallback to Base mainnet USDC for unknown chains
    console.warn(`USDC contract not found for chain ID: ${chainId}, falling back to Base mainnet`)
    return USDC_CONTRACTS[base.id]
  }
  return contract
}

// Helper function to get network config
export function getNetworkConfig(chainId: number) {
  const config = NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG]
  if (!config) {
    // Fallback to Base mainnet for unknown chains
    console.warn(`Network config not found for chain ID: ${chainId}, falling back to Base mainnet`)
    return NETWORK_CONFIG[base.id]
  }
  return config
}

// Helper function to generate explorer link
export function getExplorerLink(chainId: number, hash: string, type: 'tx' | 'address' | 'token' = 'tx'): string {
  const config = getNetworkConfig(chainId)
  const baseUrl = config.explorerUrl
  
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${hash}`
    case 'address':
      return `${baseUrl}/address/${hash}`
    case 'token':
      return `${baseUrl}/token/${hash}`
    default:
      return `${baseUrl}/search?q=${hash}`
  }
}

// Helper to check if current network is testnet
export function isTestnet(chainId: number): boolean {
  const config = NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG]
  return config?.isTestnet || false
} 