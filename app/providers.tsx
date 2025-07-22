"use client";

import { type ReactNode } from "react";
import { base, baseSepolia } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";

export function Providers(props: { children: ReactNode }) {
  // Support both Base mainnet and testnet
  // Default to mainnet unless explicitly set to use testnet
  const useTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === 'true'
  const currentChain = useTestnet ? baseSepolia : base

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={currentChain}
      config={{
        appearance: {
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Kenya USDC Off-Ramp',
          logo: process.env.NEXT_PUBLIC_ICON_URL,
          mode: 'auto',
          theme: 'default',
        },
        wallet: {
          display: 'modal',
          termsUrl: 'https://base.org/terms',
          privacyUrl: 'https://base.org/privacy',
          supportedWallets: {
            coinbaseWallet: true,
            metamask: true,
          },
        },
      }}
    >
      <MiniKitProvider chain={currentChain}>
        {props.children}
      </MiniKitProvider>
    </OnchainKitProvider>
  );
}
