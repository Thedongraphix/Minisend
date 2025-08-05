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