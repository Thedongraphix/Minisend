"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getName } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import { FarcasterCompatibleWallet } from './FarcasterCompatibleWallet';

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

  // Fetch basename when address changes
  useEffect(() => {
    if (address && isConnected) {
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
        });
    } else {
      setBasename(null);
    }
  }, [address, isConnected]);

  return (
    <div className={`space-y-4 ${className}`}>
      <FarcasterCompatibleWallet 
        onConnectionSuccess={onConnectionSuccess} 
      />
      
      {/* Show basename if available */}
      {basename && isConnected && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
          <div className="flex items-center justify-center space-x-2 text-purple-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Basename: {basename}</span>
          </div>
        </div>
      )}
    </div>
  );
}