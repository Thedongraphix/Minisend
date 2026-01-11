"use client";

import { type ReactNode } from "react";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { MiniAppProvider } from "@neynar/react";
import { PrivyProvider } from "@privy-io/react-auth";
import { base as privyBase } from "@privy-io/chains";
import { base, baseSepolia } from "viem/chains";
import { PostHogProvider } from "@/lib/posthog-provider";
import { Logger } from "@/app/components/Logger";
import { paymasterConfig } from "@/lib/paymaster-config";
import { isWeb } from "@/lib/platform-detection";

/**
 * Conditional Privy Wrapper with Base Account Integration
 * Only wraps the app with Privy for web users, not for miniapps
 * Follows Base Account + Privy setup from docs.base.org
 */
function ConditionalPrivyProvider({ children }: { children: ReactNode }) {
  // Only use Privy on web platform, not in miniapps
  if (typeof window !== 'undefined' && isWeb()) {
    return (
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
        config={{
          appearance: {
            theme: 'light',
            accentColor: '#0052FF',
            logo: process.env.NEXT_PUBLIC_ICON_URL,
            landingHeader: 'Get a Minisend Wallet',
            loginMessage: 'Sign up and cashout usdc on any network',
          },
          loginMethods: ['email'],
          defaultChain: privyBase,
          supportedChains: [privyBase],
          // Legal links for session persistence
          legal: {
            termsAndConditionsUrl: 'https://app.minisend.xyz/terms',
            privacyPolicyUrl: 'https://app.minisend.xyz/privacy',
          },
        }}
      >
        {children}
      </PrivyProvider>
    );
  }

  // For miniapps, render children without Privy wrapper
  return <>{children}</>;
}

export function Providers(props: { children: ReactNode }) {
  // Use testnet or mainnet based on paymaster config
  const chain = paymasterConfig.network === 'mainnet' ? base : baseSepolia;

  return (
    <MiniAppProvider>
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
            termsUrl: 'https://app.minisend.xyz/terms',
            privacyUrl: 'https://app.minisend.xyz/privacy',
          },
          // CDP Paymaster for gasless transactions (OnchainKit built-in support)
          paymaster: paymasterConfig.isEnabled ? paymasterConfig.rpcUrl : undefined,
        }}
      >
        <ConditionalPrivyProvider>
          <Logger />
          <PostHogProvider>
            {props.children}
          </PostHogProvider>
        </ConditionalPrivyProvider>
      </MiniKitProvider>
    </MiniAppProvider>
  );
}