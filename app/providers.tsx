"use client";

import { type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, metaMask, injected } from 'wagmi/connectors';
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";

// Support both Base mainnet and testnet
const useTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === 'true'
const currentChain = useTestnet ? baseSepolia : base

// Create wagmi config following OnchainKit documentation
const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Minisend',
      preference: 'all',
    }),
    metaMask(),
    injected(),
  ],
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <OnchainKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        chain={base}
        config={{
          appearance: {
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Minisend',
            logo: process.env.NEXT_PUBLIC_ICON_URL,
            mode: 'auto',
            theme: 'default',
          },
        }}
      >
        <MiniKitProvider chain={currentChain}>
          {props.children}
        </MiniKitProvider>
      </OnchainKitProvider>
    </WagmiProvider>
  );
}
