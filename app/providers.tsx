"use client";

import { type ReactNode } from "react";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { base } from "viem/chains";
import { PostHogProvider } from "@/lib/posthog-provider";
import { ConsoleLoggerInit } from "@/app/components/ConsoleLoggerInit";

export function Providers(props: { children: ReactNode }) {
  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
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
      <ConsoleLoggerInit />
      <PostHogProvider>
        {props.children}
      </PostHogProvider>
    </MiniKitProvider>
  );
}