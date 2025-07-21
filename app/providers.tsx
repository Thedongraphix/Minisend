"use client";

import { type ReactNode } from "react";
import { base, baseSepolia } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";

export function Providers(props: { children: ReactNode }) {
  // Determine which chain to use based on environment or a flag
  const isDevelopment = process.env.NODE_ENV === 'development'
  const useTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === 'true' || isDevelopment
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
            rabby: true,
            trust: true,
            frame: true,
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
