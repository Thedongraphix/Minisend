import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    coinbaseWallet({
      appName: 'Minisend',
      appLogoUrl: '/minisend logo.png',
      preference: 'smartWalletOnly',
    })
  ]
})