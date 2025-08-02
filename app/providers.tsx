"use client";

import { type ReactNode } from "react";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { base } from "viem/chains";

export function Providers(props: { children: ReactNode }) {
  // Use ONCHAINKIT_API_KEY or fallback to CDP_API_KEY for compatibility
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY || process.env.NEXT_PUBLIC_CDP_API_KEY;
  
  // Log API key status for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔑 OnchainKit API Key status:', {
      hasOnchainKitKey: !!process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
      hasCdpKey: !!process.env.NEXT_PUBLIC_CDP_API_KEY,
      usingKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'NONE',
    });
  }
  
  return (
    <OnchainKitProvider
      apiKey={apiKey}
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
        },
      }}
    >
      <MiniKitProvider
        apiKey={apiKey}
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
          },
        }}
      >
        {props.children}
      </MiniKitProvider>
    </OnchainKitProvider>
  );
}
