"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getName } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import { AdaptiveWallet } from './AdaptiveWallet';

interface MobileWalletHandlerProps {
  onConnectionSuccess?: () => void;
  showBalance?: boolean;
  className?: string;
}

export function MobileWalletHandler({ 
  onConnectionSuccess, 
  className = '' 
}: MobileWalletHandlerProps) {
  const { address, isConnected } = useAccount();
  const [basename, setBasename] = useState<string | null>(null);
  const [isLoadingBasename, setIsLoadingBasename] = useState(false);

  // Fetch basename when address changes
  useEffect(() => {
    if (address && isConnected) {
      setIsLoadingBasename(true);
      getName({ address, chain: base })
        .then((name) => {
          if (name && name.endsWith('.base.eth')) {
            setBasename(name);
            console.log('✅ Basename found:', name);
          } else {
            setBasename(null);
          }
        })
        .catch(() => {
          console.log('ℹ️ No basename found for address:', address);
          setBasename(null);
        })
        .finally(() => {
          setIsLoadingBasename(false);
        });
    } else {
      setBasename(null);
      setIsLoadingBasename(false);
    }
  }, [address, isConnected]);

  return (
    <div className={`space-y-4 ${className}`}>
      <AdaptiveWallet 
        onConnectionSuccess={onConnectionSuccess} 
      />
      
      {/* Show connected wallet info seamlessly */}
      {isConnected && (
        <div className="text-center space-y-2">
          {/* Show basename prominently if available */}
          {basename ? (
            <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-center justify-center space-x-2 text-blue-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span className="text-base font-semibold">{basename}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
          ) : (
            /* Show address only if no basename */
            <div className="text-gray-400 text-sm">
              {isLoadingBasename ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <span>Checking Base name...</span>
                </div>
              ) : (
                <span>{address?.slice(0, 8)}...{address?.slice(-6)}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}