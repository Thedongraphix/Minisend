"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { posthog, trackPageView } from './analytics';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const pathname = usePathname();
  const { context } = useMiniKit();

  // Track page views
  useEffect(() => {
    if (pathname) {
      trackPageView(pathname, {
        userId: context?.user?.fid ? `fid:${context.user.fid}` : undefined,
        clientId: context?.client?.clientFid,
        userFid: context?.user?.fid,
      });
    }
  }, [pathname, context]);

  // Set user properties when context changes
  useEffect(() => {
    if (typeof window !== 'undefined' && posthog && context?.user?.fid) {
      posthog.identify(`fid:${context.user.fid}`, {
        fid: context.user.fid,
        clientFid: context.client?.clientFid,
        isFrameAdded: context.client?.added,
        platform: 'farcaster',
        app: 'minisend',
      });
    }
  }, [context]);

  return <>{children}</>;
}