"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { Wallet } from '@coinbase/onchainkit/wallet';

interface AdaptiveWalletProps {
  onConnectionSuccess?: () => void;
  className?: string;
}

export function AdaptiveWallet({ 
  onConnectionSuccess, 
  className = '' 
}: AdaptiveWalletProps) {
  const { isConnected } = useAccount();
  const { context } = useMiniKit();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Call success callback when connected
  useEffect(() => {
    if (isConnected && onConnectionSuccess) {
      onConnectionSuccess();
    }
  }, [isConnected, onConnectionSuccess]);

  // Don't render on server to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={`flex justify-center ${className}`}>
        <div className="animate-pulse bg-gray-700 h-12 w-32 rounded-lg"></div>
      </div>
    );
  }

  // Detect if we're in Farcaster environment
  const isInFarcaster = !!context?.user?.fid;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Always use the standard Wallet component */}
      <div className="flex justify-center">
        <Wallet />
      </div>

      {/* Show connection status when connected */}
      {isConnected && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center justify-center space-x-2 text-green-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              {isInFarcaster ? 'Connected via Farcaster' : 'Wallet Connected'}
            </span>
          </div>
        </div>
      )}

      {/* Debug info in development only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-2">
          <div className="text-gray-400 text-xs text-center space-y-1">
            <p>Environment: {isInFarcaster ? 'Farcaster' : 'Web'}</p>
            <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
            {isInFarcaster && <p>FID: {context.user.fid}</p>}
          </div>
        </div>
      )}
    </div>
  );
}