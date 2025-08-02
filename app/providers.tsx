"use client";

import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mobile-optimized wagmi config to handle keys.coinbase.com redirects
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(undefined, {
      timeout: 120000, // 2 minutes for mobile
      retryCount: 2,
      retryDelay: 3000,
    }),
  },
  connectors: [
    coinbaseWallet({
      appName: 'Minisend',
      appLogoUrl: 'https://minisend.xyz/minisend-logo.png',
      preference: 'smartWalletOnly',
      enableMobileWalletLink: true,
      // Add mobile-specific configuration
      headlessMode: true, // Prevent external browser redirects
      reloadOnDisconnect: false, // Prevent page reloads on mobile
    })
  ],
  // Override SSR for mobile
  ssr: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 2000,
      staleTime: 30000,
    },
    mutations: {
      retry: 1,
      retryDelay: 2000,
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
            // Enable paymaster for sponsored transactions if configured
            ...(process.env.NEXT_PUBLIC_PAYMASTER_ENDPOINT && {
              paymaster: process.env.NEXT_PUBLIC_PAYMASTER_ENDPOINT
            })
          }}
        >
          {props.children}
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
