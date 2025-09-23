"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import {
  initializeWalletSession,
  trackWalletEvent,
  trackWalletPaymentEvent,
  trackWalletConnectionEvent,
  getUserByWallet,
  linkWalletWithFID,
  resetWalletSession
} from '@/lib/wallet-analytics';

interface WalletUser {
  id: string;
  wallet_address: string;
  phone_number?: string;
  fid?: number;
  created_at: string;
  updated_at: string;
}

interface UseWalletAnalyticsReturn {
  user: WalletUser | null;
  isInitialized: boolean;
  isLoading: boolean;
  trackEvent: (event: string, properties?: Record<string, unknown>) => Promise<void>;
  trackPayment: (event: string, data: {
    amount?: string;
    currency?: string;
    phoneNumber?: string;
    orderId?: string;
    transactionHash?: string;
    success?: boolean;
    error?: string;
  }) => Promise<void>;
  trackConnection: (event: string, data: {
    walletType?: string;
    success?: boolean;
    error?: string;
  }) => Promise<void>;
  linkWithFID: (fid: number) => Promise<boolean>;
  reset: () => void;
}

export function useWalletAnalytics(): UseWalletAnalyticsReturn {
  const { address, isConnected } = useAccount();
  const { context } = useMiniKit();

  const [user, setUser] = useState<WalletUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize wallet session when address becomes available
  useEffect(() => {
    async function initializeSession() {
      if (!address || !isConnected || isInitialized) return;

      setIsLoading(true);
      try {
        const walletUser = await initializeWalletSession(address, context || undefined);
        setUser(walletUser);
        setIsInitialized(true);

        // Track wallet connection
        await trackWalletConnectionEvent('connected', {
          wallet_address: address,
          user_id: walletUser?.id,
          fid: walletUser?.fid || context?.user?.fid,
          walletType: 'onchainkit',
          success: true
        });

      } catch (error) {
        console.error('Failed to initialize wallet session:', error);
        await trackWalletConnectionEvent('connection_failed', {
          wallet_address: address,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      } finally {
        setIsLoading(false);
      }
    }

    initializeSession();
  }, [address, isConnected, context, isInitialized]);

  // Reset session when wallet disconnects
  useEffect(() => {
    if (!isConnected && isInitialized) {
      setUser(null);
      setIsInitialized(false);
      resetWalletSession();
    }
  }, [isConnected, isInitialized]);

  // Track event with wallet context
  const trackEvent = useCallback(async (
    event: string,
    properties: Record<string, unknown> = {}
  ): Promise<void> => {
    if (!address || !user) {
      console.warn('Cannot track event: wallet not connected or user not initialized');
      return;
    }

    await trackWalletEvent(event, {
      wallet_address: address,
      user_id: user.id,
      fid: user.fid,
      ...properties
    });
  }, [address, user]);

  // Track payment events
  const trackPayment = useCallback(async (
    event: string,
    data: {
      amount?: string;
      currency?: string;
      phoneNumber?: string;
      orderId?: string;
      transactionHash?: string;
      success?: boolean;
      error?: string;
    }
  ): Promise<void> => {
    if (!address || !user) {
      console.warn('Cannot track payment: wallet not connected or user not initialized');
      return;
    }

    await trackWalletPaymentEvent(event, {
      wallet_address: address,
      user_id: user.id,
      fid: user.fid,
      ...data
    });
  }, [address, user]);

  // Track connection events
  const trackConnection = useCallback(async (
    event: string,
    data: {
      walletType?: string;
      success?: boolean;
      error?: string;
    }
  ): Promise<void> => {
    if (!address) {
      console.warn('Cannot track connection: no wallet address');
      return;
    }

    await trackWalletConnectionEvent(event, {
      wallet_address: address,
      user_id: user?.id,
      fid: user?.fid,
      ...data
    });
  }, [address, user]);

  // Link wallet with FID
  const linkWithFID = useCallback(async (fid: number): Promise<boolean> => {
    if (!address) {
      console.warn('Cannot link FID: no wallet address');
      return false;
    }

    const success = await linkWalletWithFID(address, fid);
    if (success && user) {
      // Update local user state
      setUser({ ...user, fid });
    }
    return success;
  }, [address, user]);

  // Reset session
  const reset = useCallback(() => {
    setUser(null);
    setIsInitialized(false);
    resetWalletSession();
  }, []);

  return {
    user,
    isInitialized,
    isLoading,
    trackEvent,
    trackPayment,
    trackConnection,
    linkWithFID,
    reset
  };
}