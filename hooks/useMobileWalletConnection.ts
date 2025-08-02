"use client";

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

interface ConnectionState {
  isConnecting: boolean;
  connectionAttempts: number;
  lastError: string | null;
  isRetrying: boolean;
  startTime: number | null;
}

export function useMobileWalletConnection() {
  const { address, isConnected, isConnecting: wagmiConnecting } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { context } = useMiniKit();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnecting: false,
    connectionAttempts: 0,
    lastError: null,
    isRetrying: false,
    startTime: null,
  });

  // Enhanced mobile detection and environment checks
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  );
  
  const isCoinbaseWallet = typeof window !== 'undefined' && (
    context?.user?.fid !== undefined || 
    window.location.href.includes('coinbase') ||
    navigator.userAgent.includes('CoinbaseWallet')
  );

  const isInFrame = typeof window !== 'undefined' && window.parent !== window;

  // Connection status tracking
  const isConnecting = wagmiConnecting || connectionState.isConnecting || connectionState.isRetrying;

  // Enhanced connection function with comprehensive mobile handling
  const connectWallet = useCallback(async () => {
    if (isConnecting || isConnected) return;

    const startTime = Date.now();
    setConnectionState(prev => ({
      ...prev,
      isConnecting: true,
      startTime,
      lastError: null,
      connectionAttempts: prev.connectionAttempts + 1,
    }));

    try {
      console.log('🔗 Initiating wallet connection...', {
        isMobile,
        isCoinbaseWallet,
        isInFrame,
        attempt: connectionState.connectionAttempts + 1,
        userAgent: navigator.userAgent.substring(0, 100),
      });

      // Pre-connection mobile optimizations
      if (isMobile) {
        // Prevent zoom and scrolling during connection
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
          );
        }

        // Stabilize layout during connection
        document.body.style.touchAction = 'none';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        
        // Add connection delay for mobile stability
        if (connectionState.connectionAttempts > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Get Coinbase Wallet connector with fallback
      const coinbaseConnector = connectors.find(
        connector => connector.name.toLowerCase().includes('coinbase')
      ) || connectors[0];

      if (!coinbaseConnector) {
        throw new Error('No wallet connector available');
      }

      console.log('📱 Using connector:', coinbaseConnector.name);

      // Enhanced connection with dynamic timeout
      const connectionPromise = connect({ connector: coinbaseConnector });
      
      // Dynamic timeout based on environment
      let timeoutDuration = 45000; // Default 45s
      if (isMobile && isCoinbaseWallet) {
        timeoutDuration = 180000; // 3 minutes for mobile CBW
      } else if (isMobile) {
        timeoutDuration = 90000; // 1.5 minutes for other mobile
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Connection timeout after ${timeoutDuration / 1000}s`));
        }, timeoutDuration);
        
        return timer;
      });

      // Race connection against timeout
      await Promise.race([connectionPromise, timeoutPromise]);

      console.log('✅ Connection successful in', Date.now() - startTime, 'ms');

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      
      console.error('💥 Connection failed:', {
        error: errorMessage,
        duration,
        attempts: connectionState.connectionAttempts + 1,
        isMobile,
        isCoinbaseWallet,
      });

      // Enhanced error handling and retry logic
      if (errorMessage.toLowerCase().includes('timeout') || 
          errorMessage.includes('keys.coinbase.com') ||
          errorMessage.includes('user rejected') === false) {
        
        if (connectionState.connectionAttempts < 2) {
          console.log('🔄 Scheduling retry...');
          setConnectionState(prev => ({
            ...prev,
            isRetrying: true,
            lastError: `Retrying connection... (${errorMessage})`,
          }));

          setTimeout(() => {
            setConnectionState(prev => ({ ...prev, isRetrying: false }));
            connectWallet();
          }, Math.min(5000 * (connectionState.connectionAttempts + 1), 15000));
          
          return;
        } else {
          setConnectionState(prev => ({
            ...prev,
            lastError: 'Connection failed after multiple attempts. Try refreshing or using Coinbase Wallet app directly.',
          }));
        }
      } else {
        setConnectionState(prev => ({
          ...prev,
          lastError: errorMessage,
        }));
      }
    } finally {
      // Cleanup mobile optimizations
      if (isMobile) {
        setTimeout(() => {
          document.body.style.touchAction = '';
          document.body.style.userSelect = '';
          document.body.style.webkitUserSelect = '';
        }, 1000);
      }

      setConnectionState(prev => ({
        ...prev,
        isConnecting: false,
        startTime: null,
      }));
    }
  }, [
    connect, 
    connectors, 
    isConnecting, 
    isConnected, 
    connectionState.connectionAttempts, 
    isMobile, 
    isCoinbaseWallet,
    isInFrame
  ]);

  // Reset state on successful connection
  useEffect(() => {
    if (isConnected) {
      console.log('🎉 Wallet connected successfully:', address);
      setConnectionState({
        isConnecting: false,
        connectionAttempts: 0,
        lastError: null,
        isRetrying: false,
        startTime: null,
      });
    }
  }, [isConnected, address]);

  // Handle wagmi connection errors
  useEffect(() => {
    if (connectError) {
      console.error('🔌 Wagmi connect error:', connectError);
      setConnectionState(prev => ({
        ...prev,
        lastError: connectError.message,
        isConnecting: false,
      }));
    }
  }, [connectError]);

  const disconnectWallet = useCallback(() => {
    console.log('🔌 Disconnecting wallet...');
    disconnect();
    setConnectionState({
      isConnecting: false,
      connectionAttempts: 0,
      lastError: null,
      isRetrying: false,
      startTime: null,
    });
  }, [disconnect]);

  return {
    address,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    error: connectionState.lastError,
    connectionAttempts: connectionState.connectionAttempts,
    isMobile,
    isCoinbaseWallet,
    isInFrame,
    canRetry: connectionState.connectionAttempts < 3 && !isConnected && !isConnecting,
    connectionDuration: connectionState.startTime ? Date.now() - connectionState.startTime : null,
  };
}