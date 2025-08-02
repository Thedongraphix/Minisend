"use client";

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

export function useMobileWalletConnection() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { context } = useMiniKit();
  
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Detect mobile and Coinbase Wallet environment
  const isMobile = typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isCoinbaseWallet = context?.user?.fid === 309857;

  // Enhanced connection function with mobile-specific retry logic
  const connectWallet = useCallback(async () => {
    if (isConnecting || isConnected) return;

    try {
      setLastError(null);
      setConnectionAttempts(prev => prev + 1);

      console.log('🔗 Attempting wallet connection...', {
        isMobile,
        isCoinbaseWallet,
        attempt: connectionAttempts + 1
      });

      // For mobile Coinbase Wallet, add specific handling
      if (isMobile && isCoinbaseWallet) {
        // Prevent multiple rapid connections
        if (connectionAttempts > 0 && connectionAttempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Add mobile-specific viewport handling
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
          );
        }

        // Prevent body scroll during connection
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      }

      // Get the Coinbase Wallet connector
      const coinbaseConnector = connectors.find(
        connector => connector.name === 'Coinbase Wallet'
      );

      if (!coinbaseConnector) {
        throw new Error('Coinbase Wallet connector not found');
      }

      // Attempt connection with timeout
      const connectionPromise = connect({ connector: coinbaseConnector });
      
      // Set mobile-specific timeout
      const timeoutDuration = isCoinbaseWallet && isMobile ? 150000 : 60000; // 2.5 min for CBW mobile
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), timeoutDuration)
      );

      await Promise.race([connectionPromise, timeoutPromise]);

    } catch (error) {
      console.error('💥 Wallet connection error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setLastError(errorMessage);

      // Handle specific timeout errors
      if (errorMessage.includes('timeout') || errorMessage.includes('keys.coinbase.com')) {
        if (connectionAttempts < 2) {
          console.log('🔄 Retrying connection due to timeout...');
          setIsRetrying(true);
          setTimeout(() => {
            setIsRetrying(false);
            connectWallet();
          }, 5000);
        } else {
          setLastError('Connection timed out. Try refreshing the app or connecting directly in Coinbase Wallet.');
        }
      }
    } finally {
      // Restore body styles
      if (isMobile) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      }
    }
  }, [
    connect, 
    connectors, 
    isConnecting, 
    isConnected, 
    connectionAttempts, 
    isMobile, 
    isCoinbaseWallet
  ]);

  // Reset connection attempts on successful connection
  useEffect(() => {
    if (isConnected) {
      setConnectionAttempts(0);
      setLastError(null);
      setIsRetrying(false);
    }
  }, [isConnected]);

  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      console.error('🔌 Connect error:', connectError);
      setLastError(connectError.message);
    }
  }, [connectError]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    setConnectionAttempts(0);
    setLastError(null);
    setIsRetrying(false);
  }, [disconnect]);

  return {
    address,
    isConnected,
    isConnecting: isConnecting || isRetrying,
    connectWallet,
    disconnectWallet,
    error: lastError,
    connectionAttempts,
    isMobile,
    isCoinbaseWallet,
    canRetry: connectionAttempts < 3 && !isConnected,
  };
}