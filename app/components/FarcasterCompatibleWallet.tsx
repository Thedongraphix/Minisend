"use client";

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useConnectors } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

interface FarcasterCompatibleWalletProps {
  onConnectionSuccess?: () => void;
  className?: string;
}

export function FarcasterCompatibleWallet({ 
  onConnectionSuccess, 
  className = '' 
}: FarcasterCompatibleWalletProps) {
  const { address, isConnected } = useAccount();
  const { connect, error } = useConnect();
  const connectors = useConnectors();
  const { context } = useMiniKit();
  
  const [mounted, setMounted] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Call success callback when connected
  useEffect(() => {
    if (isConnected && onConnectionSuccess) {
      onConnectionSuccess();
    }
  }, [isConnected, onConnectionSuccess]);

  // Handle wagmi connection errors
  useEffect(() => {
    if (error) {
      if (error.message.includes('User rejected') || error.message.includes('denied')) {
        setConnectionError('Connection cancelled by user');
      } else if (error.message.includes('timeout') || error.message.includes('keys.coinbase.com')) {
        setConnectionError('⚠️ External wallet redirects not supported in miniapps. Please use Farcaster\'s built-in wallet.');
      } else {
        setConnectionError(`Connection failed: ${error.message}`);
      }
    } else {
      setConnectionError(null);
    }
  }, [error]);

  // Don't render on server to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={`flex justify-center ${className}`}>
        <div className="animate-pulse bg-gray-700 h-12 w-32 rounded-lg"></div>
      </div>
    );
  }

  const handleConnect = async () => {
    try {
      setConnectionError(null);
      
      // Use the first available connector (should be Farcaster's injected wallet)
      if (connectors.length > 0) {
        await connect({ connector: connectors[0] });
      } else {
        setConnectionError('No compatible wallet found. Please use this app within Farcaster.');
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      // Error will be handled by the useEffect above
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Farcaster Context Status */}
      {context?.user?.fid && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-center justify-center space-x-2 text-blue-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              Farcaster User (FID: {context.user.fid})
            </span>
          </div>
        </div>
      )}

      {/* Wallet Connection */}
      <div className="flex justify-center">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={connectors.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {connectors.length > 0 ? 'Connect Wallet' : 'No Wallet Available'}
          </button>
        ) : (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 w-full">
            <div className="flex items-center justify-center space-x-2 text-green-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Wallet Connected</span>
            </div>
            {address && (
              <p className="text-center text-xs text-gray-400 mt-1">
                {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <div className="flex items-center justify-center space-x-2 text-red-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{connectionError}</span>
          </div>
        </div>
      )}

      {/* Compatibility Notice for non-Farcaster environments */}
      {!context?.user?.fid && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="text-yellow-400 text-xs text-center">
            <p className="font-medium mb-1">⚠️ Miniapp Compatibility</p>
            <p>This app works best within Farcaster clients (Warpcast, Base App).</p>
            <p>External wallet connections may timeout in iframe environments.</p>
          </div>
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-2">
          <div className="text-gray-400 text-xs text-center space-y-1">
            <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Address: {address || 'None'}</p>
            <p>Connectors: {connectors.length}</p>
            <p>In Farcaster: {context?.user?.fid ? 'Yes' : 'No'}</p>
            <p>Error: {error?.message || 'None'}</p>
          </div>
        </div>
      )}
    </div>
  );
}