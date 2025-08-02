"use client";

import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { WagmiProvider, createConfig, http, createStorage, cookieStorage } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mobile-optimized wagmi config with timeout fixes
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(undefined, {
      timeout: 120000, // Extended timeout for mobile
      retryCount: 3,
      retryDelay: 5000,
    }),
  },
  connectors: [
    coinbaseWallet({
      appName: 'Minisend',
      appLogoUrl: 'https://minisend.xyz/minisend-logo.png',
      preference: 'smartWalletOnly', // CRITICAL: Bypasses redirect timeouts
      headlessMode: false, // Allow proper mobile wallet flows
    })
  ],
  // Add persistent storage for mobile sessions
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: false, // Important for mobile compatibility
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 3000,
      staleTime: 60000, // Extended for mobile
    },
    mutations: {
      retry: 2,
      retryDelay: 3000,
    },
  },
});

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
