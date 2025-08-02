"use client";

import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet, walletConnect, injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create wagmi config with explicit connectors for web environments
// This ensures Coinbase Wallet appears in wallet selection
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    coinbaseWallet({
      appName: 'Minisend',
      appLogoUrl: 'https://minisend.xyz/minisend-logo.png',
      preference: 'all', // Shows both Smart Wallet and EOA options
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
      metadata: {
        name: 'Minisend',
        description: 'Convert USDC to mobile money',
        url: 'https://minisend.xyz',
        icons: ['https://minisend.xyz/minisend-logo.png'],
      },
      showQrModal: true,
    }),
    injected(), // For browser extension wallets like MetaMask, Phantom, etc.
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

// Detect if we're in a Farcaster frame environment
function isInFarcasterFrame() {
  if (typeof window === 'undefined') return false;
  return window.parent !== window && 
         (window.location.href.includes('farcaster') || 
          window.location.href.includes('warpcast'));
}

export function Providers(props: { children: ReactNode }) {
  const isFarcasterFrame = isInFarcasterFrame();

  if (isFarcasterFrame) {
    // In Farcaster frames, use pure MiniKit setup
    return (
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
    );
  }

  // For web environments, use custom wagmi config with explicit connectors
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
