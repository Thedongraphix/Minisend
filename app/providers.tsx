"use client";

import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet, walletConnect, injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Add multiple wallet connectors including Coinbase Wallet
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    coinbaseWallet({
      appName: 'Minisend',
      appLogoUrl: 'https://minisend.xyz/minisend-logo.png',
      preference: 'all', // Show both Smart Wallet and EOA options
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
      metadata: {
        name: 'Minisend',
        description: 'Convert USDC to mobile money',
        url: 'https://minisend.xyz',
        icons: ['https://minisend.xyz/minisend-logo.png'],
      },
    }),
    injected(), // For browser extension wallets
  ],
});

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{
            appearance: {
              mode: 'auto',
              theme: 'default', 
              name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Minisend',
              logo: process.env.NEXT_PUBLIC_ICON_URL,
            },
            wallet: {
              display: 'modal',
              termsUrl: 'https://minisend.xyz/terms',
              privacyUrl: 'https://minisend.xyz/privacy',
              signUpEnabled: true,
            },
          }}
        >
          {props.children}
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
