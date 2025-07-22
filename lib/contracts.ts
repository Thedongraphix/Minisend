import { base } from 'wagmi/chains'

// USDC contract addresses - Base mainnet only
export const USDC_CONTRACTS = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base mainnet
} as const

// Network configurations - Base mainnet only
export const NETWORK_CONFIG = {
  [base.id]: {
    name: 'Base',
    explorerUrl: 'https://basescan.org',
    isTestnet: false,
  },
} as const

// Helper function to get USDC contract address for current chain
export function getUSDCContract(chainId: number): string {
  const contract = USDC_CONTRACTS[chainId as keyof typeof USDC_CONTRACTS]
  if (!contract) {
    throw new Error(`USDC contract not found for chain ID: ${chainId}`)
  }
  return contract
}

// Helper function to get network config
export function getNetworkConfig(chainId: number) {
  const config = NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG]
  if (!config) {
    throw new Error(`Network config not found for chain ID: ${chainId}`)
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