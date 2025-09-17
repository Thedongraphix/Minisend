"use client";

import { type ReactNode } from "react";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "viem/chains";
import { PostHogProvider } from "@/lib/posthog-provider";
import { ConsoleLoggerInit } from "@/app/components/ConsoleLoggerInit";

export function Providers(props: { children: ReactNode }) {
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
      >
        <ConsoleLoggerInit />
        <PostHogProvider>
          {props.children}
        </PostHogProvider>
      </MiniKitProvider>
    </OnchainKitProvider>
  );
}