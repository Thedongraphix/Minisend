"use client";

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

export function useMobileWalletConnection() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { context } = useMiniKit();
  
  const [lastError, setLastError] = useState<string | null>(null);

  // Simple mobile detection
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

  // Simple connection function following MiniKit best practices
  const connectWallet = useCallback(async () => {
    if (isPending || isConnected) return;

    try {
      setLastError(null);
      
      console.log('🔗 Connecting wallet with MiniKit...', {
        isMobile,
        isCoinbaseWallet,
        isInFrame,
        availableConnectors: connectors.map(c => c.name),
      });

      // Use the first available connector (MiniKit handles the right one automatically)
      const connector = connectors[0];
      
      if (!connector) {
        throw new Error('No wallet connector available');
      }

      console.log('📱 Using connector:', connector.name);
      
      // Simple connection - let MiniKit handle the complexity
      await connect({ connector });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      console.error('💥 Connection failed:', errorMessage);
      
      // Handle user rejection vs other errors
      if (errorMessage.toLowerCase().includes('user rejected') || 
          errorMessage.toLowerCase().includes('user denied') ||
          errorMessage.toLowerCase().includes('cancelled')) {
        setLastError('Connection cancelled by user');
      } else {
        setLastError(errorMessage);
      }
    }
  }, [connect, connectors, isPending, isConnected, isMobile, isCoinbaseWallet, isInFrame]);

  // Handle wagmi connection errors
  useEffect(() => {
    if (connectError) {
      console.error('🔌 Wagmi connect error:', connectError);
      setLastError(connectError.message);
    }
  }, [connectError]);

  // Clear errors on successful connection
  useEffect(() => {
    if (isConnected) {
      console.log('🎉 Wallet connected successfully');
      setLastError(null);
    }
  }, [isConnected, address]);

  const disconnectWallet = useCallback(() => {
    console.log('🔌 Disconnecting wallet...');
    disconnect();
    setLastError(null);
  }, [disconnect]);

  return {
    address,
    isConnected,
    isConnecting: isPending,
    connectWallet,
    disconnectWallet,
    error: lastError,
    connectionAttempts: 0, // Remove complex retry logic
    isMobile,
    isCoinbaseWallet,
    isInFrame,
    canRetry: !isConnected && !isPending,
    connectionDuration: null, // Remove complex timing
  };
}