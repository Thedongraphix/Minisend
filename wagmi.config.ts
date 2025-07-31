import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(undefined, {
      timeout: 30000, // 30 second timeout for mobile
      retryCount: 3,
      retryDelay: 2000,
    }),
  },
  connectors: [
    coinbaseWallet({
      appName: 'Minisend',
      appLogoUrl: 'https://minisend.xyz/minisend-logo.png',
      preference: 'smartWalletOnly',
    })
  ]
})