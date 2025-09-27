"use client";

import { type ReactNode } from "react";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { base, baseSepolia } from "viem/chains";
import { PostHogProvider } from "@/lib/posthog-provider";
import { Logger } from "@/app/components/Logger";
import { paymasterConfig } from "@/lib/paymaster-config";

export function Providers(props: { children: ReactNode }) {
  // Use testnet or mainnet based on paymaster config
  const chain = paymasterConfig.network === 'mainnet' ? base : baseSepolia;

  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
      chain={chain}
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
        // CDP Paymaster for gasless transactions (OnchainKit built-in support)
        paymaster: paymasterConfig.isEnabled ? paymasterConfig.rpcUrl : undefined,
      }}
    >
      <Logger />
      <PostHogProvider>
        {props.children}
      </PostHogProvider>
    </MiniKitProvider>
  );
}