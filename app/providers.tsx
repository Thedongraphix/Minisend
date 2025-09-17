"use client";

import { type ReactNode } from "react";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { base } from "viem/chains";
import { PostHogProvider } from "@/lib/posthog-provider";
import { ConsoleLoggerInit } from "@/app/components/ConsoleLoggerInit";

export function Providers(props: { children: ReactNode }) {
  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
    >
      <ConsoleLoggerInit />
      <PostHogProvider>
        {props.children}
      </PostHogProvider>
    </MiniKitProvider>
  );
}
