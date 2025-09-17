"use client";

import { type ReactNode, useEffect, useState } from "react";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "viem/chains";
import { PostHogProvider } from "@/lib/posthog-provider";
import { ConsoleLoggerInit } from "@/app/components/ConsoleLoggerInit";

function ContextualProviders({ children }: { children: ReactNode }) {
  const [isFarcaster, setIsFarcaster] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Detect if we're in a Farcaster context
    const isInFrame = typeof window !== 'undefined' && window.parent !== window;
    const hasFarcasterUA = typeof window !== 'undefined' && /farcaster/i.test(navigator.userAgent);
    const isFarcasterContext = isInFrame || hasFarcasterUA;

    setIsFarcaster(isFarcasterContext);
  }, []);

  const sharedConfig = {
    appearance: {
      mode: 'auto' as const,
      theme: 'default' as const,
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Minisend',
      logo: process.env.NEXT_PUBLIC_ICON_URL,
    },
    wallet: {
      display: 'modal' as const,
      termsUrl: 'https://minisend.xyz/terms',
      privacyUrl: 'https://minisend.xyz/privacy',
    },
  };

  // Don't render until we know the context
  if (!mounted) {
    return null;
  }

  // If in Farcaster, use MiniKitProvider with OnchainKitProvider for compatibility
  if (isFarcaster) {
    return (
      <OnchainKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
        projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID!}
        chain={base}
        config={sharedConfig}
      >
        <MiniKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
          chain={base}
          autoConnect
          config={sharedConfig}
        >
          {children}
        </MiniKitProvider>
      </OnchainKitProvider>
    );
  }

  // For web, use OnchainKitProvider only
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
      projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID!}
      chain={base}
      config={sharedConfig}
    >
      {children}
    </OnchainKitProvider>
  );
}

export function Providers(props: { children: ReactNode }) {
  return (
    <ContextualProviders>
      <ConsoleLoggerInit />
      <PostHogProvider>
        {props.children}
      </PostHogProvider>
    </ContextualProviders>
  );
}