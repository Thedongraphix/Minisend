"use client";

import { useState, useEffect } from 'react';

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface UseFarcasterUserReturn {
  user: FarcasterUser | null;
  isInMiniApp: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to get Farcaster user information when running in a Mini App
 * Returns null when not in a Mini App environment
 */
export function useFarcasterUser(): UseFarcasterUserReturn {
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUserData = async () => {
      try {
        // Dynamically import Farcaster SDK
        const { sdk } = await import('@farcaster/miniapp-sdk');

        // Check if we're in a Mini App
        const inMiniApp = await sdk.isInMiniApp();

        if (!mounted) return;

        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          // Get context and extract user info
          const context = await sdk.context;

          if (!mounted) return;

          if (context?.user) {
            setUser({
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
              pfpUrl: context.user.pfpUrl,
            });
          }
        }

        setIsLoading(false);
      } catch (err) {
        if (!mounted) return;

        setError(err instanceof Error ? err.message : 'Failed to load user data');
        setIsLoading(false);
      }
    };

    loadUserData();

    return () => {
      mounted = false;
    };
  }, []);

  return { user, isInMiniApp, isLoading, error };
}

/**
 * Hook to get just the FID (most common use case)
 */
export function useFarcasterFid(): number | null {
  const { user } = useFarcasterUser();
  return user?.fid ?? null;
}
