"use client";

import { type ReactNode } from "react";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { base } from "viem/chains";

export function Providers(props: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      chain={base}
      rpcUrl='https://mainnet.base.org'
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
        },
      }}
    >
      <MiniKitProvider
        chain={base}
        rpcUrl='https://mainnet.base.org'
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
          },
        }}
      >
        {props.children}
      </MiniKitProvider>
    </OnchainKitProvider>
  );
}
