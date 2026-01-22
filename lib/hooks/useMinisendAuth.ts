/**
 * Unified Authentication Hook for Minisend
 * Handles authentication across Farcaster, Base App, and Web platforms
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { sdk } from '@farcaster/miniapp-sdk';
import { getPlatform, isFarcasterMiniApp, isBaseApp, isWeb, type Platform } from '../platform-detection';

export interface MinisendUser {
  userId: string;
  platform: Platform;
  walletAddress?: string;
  minisendWallet?: string;
  blockradarAddressId?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface AuthData {
  userId: string;
  platform: Platform;
  walletAddress?: string;
  token?: string;
  email?: string;
}

interface UseMinisendAuthReturn {
  user: MinisendUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  minisendWallet: string | null;
  platform: Platform;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useMinisendAuth(): UseMinisendAuthReturn {
  const [user, setUser] = useState<MinisendUser | null>(null);
  const [minisendWallet, setMinisendWallet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const platform = getPlatform();

  // Wagmi hook for wallet connections (all platforms)
  const { address, isConnected } = useAccount();

  // Privy hook (always call unconditionally, but only use values on web)
  const privyHooks = usePrivy();

  // Use Privy hooks only if on web platform
  const {
    user: privyUser,
    authenticated: privyAuthenticated,
    login: privyLogin,
    logout: privyLogout,
    ready: privyReady,
  } = isWeb() ? privyHooks : {
    user: null,
    authenticated: false,
    login: async () => {},
    logout: async () => {},
    ready: false
  };

  /**
   * Gather authentication data based on platform
   */
  const gatherAuthData = useCallback(async (): Promise<AuthData | null> => {
    try {
      if (isFarcasterMiniApp()) {
        // Farcaster: Use FID and QuickAuth token
        const context = await sdk.context;
        if (!context?.user?.fid) {
          return null;
        }

        const tokenResult = await sdk.quickAuth.getToken().catch(() => null);
        const token = tokenResult ? String(tokenResult) : undefined;

        return {
          userId: context.user.fid.toString(),
          platform: 'farcaster',
          walletAddress: address,
          token,
        };
      }

      if (isBaseApp()) {
        // Base App: Use wallet address as user ID
        if (!address) {
          return null;
        }

        return {
          userId: address,
          platform: 'baseapp',
          walletAddress: address,
        };
      }

      // Web: Use Privy authentication
      if (privyAuthenticated && privyUser) {
        return {
          userId: privyUser.id,
          platform: 'web',
          walletAddress: privyUser.wallet?.address || address,
          email: privyUser.email?.address,
        };
      }

      return null;
    } catch (err) {
      console.error('Error gathering auth data:', err);
      return null;
    }
  }, [address, privyAuthenticated, privyUser]);

  /**
   * Assign Minisend wallet via BlockRadar with retry logic
   */
  const assignMinisendWallet = useCallback(async (authData: AuthData) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[useMinisendAuth] Assigning wallet for:', {
        userId: authData.userId,
        platform: authData.platform,
        walletAddress: authData.walletAddress,
        email: authData.email,
      });

      // Use API client with automatic retry
      const { apiClient } = await import('../utils/api-client');
      const { validateAuthData } = await import('../utils/validation');

      // Validate auth data before sending
      const validation = validateAuthData(authData as unknown as Record<string, unknown>);
      if (!validation.valid) {
        throw new Error(`Invalid auth data: ${validation.errors.join(', ')}`);
      }

      const data = await apiClient.assignWallet(authData);

      console.log('[useMinisendAuth] API response:', {
        minisendWallet: data.minisendWallet,
        blockradarAddressId: data.blockradarAddressId,
        existing: data.existing,
      });

      const minisendUser: MinisendUser = {
        userId: authData.userId,
        platform: authData.platform,
        walletAddress: authData.walletAddress,
        minisendWallet: data.minisendWallet,
        blockradarAddressId: data.blockradarAddressId,
        email: authData.email,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      };

      console.log('[useMinisendAuth] Setting user:', minisendUser);

      setUser(minisendUser);
      setMinisendWallet(data.minisendWallet);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      console.error('Failed to assign Minisend wallet:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle authentication flow
   */
  const handleAuth = useCallback(async () => {
    const authData = await gatherAuthData();

    if (authData) {
      await assignMinisendWallet(authData);
    } else {
      setIsLoading(false);
    }
  }, [gatherAuthData, assignMinisendWallet]);

  /**
   * Login function (mainly for web platform)
   */
  const login = useCallback(async () => {
    if (isWeb() && !privyAuthenticated) {
      await privyLogin();
    }
  }, [privyAuthenticated, privyLogin]);

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    if (isWeb() && privyAuthenticated) {
      await privyLogout();
    }

    setUser(null);
    setMinisendWallet(null);
  }, [privyAuthenticated, privyLogout]);

  /**
   * Effect: Handle auth when conditions change
   */
  useEffect(() => {
    // For Farcaster and Base App, auto-authenticate when wallet connects
    if (isFarcasterMiniApp() && isConnected) {
      handleAuth();
      return;
    }

    if (isBaseApp() && isConnected) {
      handleAuth();
      return;
    }

    // For Web, authenticate when Privy is ready and user is authenticated
    if (isWeb()) {
      if (privyReady && privyAuthenticated) {
        handleAuth();
      } else if (privyReady) {
        setIsLoading(false);
      }
    }
  }, [isConnected, privyAuthenticated, privyReady, handleAuth]);

  return {
    user,
    isAuthenticated: !!user && !!minisendWallet,
    isLoading,
    minisendWallet,
    platform,
    error,
    login,
    logout,
  };
}
