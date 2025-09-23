"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { posthog, trackPageView } from './analytics';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const pathname = usePathname();
  const { context } = useMiniKit();
  const { address, isConnected } = useAccount();

  // Track page views with both wallet and FID context
  useEffect(() => {
    if (pathname) {
      const pageViewProperties = {
        // Prioritize wallet address for identification, fallback to FID
        userId: address || (context?.user?.fid ? `fid:${context.user.fid}` : undefined),
        wallet_address: address,
        fid: context?.user?.fid,
        clientId: context?.client?.clientFid,
        userFid: context?.user?.fid,
        tracking_method: address ? 'wallet_based' : 'fid_based',
        is_wallet_connected: isConnected
      };

      trackPageView(pathname, pageViewProperties);
    }
  }, [pathname, context, address, isConnected]);

  // Set user properties when context or wallet changes
  useEffect(() => {
    if (typeof window !== 'undefined' && posthog) {
      // Prioritize wallet address as distinct_id
      const distinctId = address || (context?.user?.fid ? `fid:${context.user.fid}` : null);

      if (distinctId) {
        const userProperties = {
          // Core identifiers
          wallet_address: address,
          fid: context?.user?.fid,

          // Farcaster context
          clientFid: context?.client?.clientFid,
          isFrameAdded: context?.client?.added,

          // App context
          platform: 'farcaster',
          app: 'minisend',
          tracking_method: address ? 'wallet_based' : 'fid_based',

          // Wallet status
          is_wallet_connected: isConnected,

          // Legacy compatibility
          ...(context?.user?.fid && { legacy_fid: `fid:${context.user.fid}` })
        };

        posthog.identify(distinctId, userProperties);

        // If we have both wallet and FID, create an alias to link them
        if (address && context?.user?.fid) {
          posthog.alias(`fid:${context.user.fid}`, address);
        }
      }
    }
  }, [context, address, isConnected]);

  return <>{children}</>;
}