import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { coinbaseWallet } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    miniAppConnector(), // For Farcaster frames
    coinbaseWallet({
      appName: 'Minisend',
      appLogoUrl: 'https://minisend.xyz/minisend-logo.svg',
    }), // For web users
  ]
})