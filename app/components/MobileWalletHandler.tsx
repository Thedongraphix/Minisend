"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getName } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import { Wallet } from '@coinbase/onchainkit/wallet';

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
  
  const [mounted, setMounted] = useState(false);
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


  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-center">
        <Wallet />
      </div>

      {/* Connection Status Display */}
      {isConnected && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center justify-center space-x-2 text-green-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              {basename ? `Connected as ${basename}` : 'Wallet Connected'}
            </span>
          </div>
          {address && (
            <p className="text-center text-xs text-gray-400 mt-1">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          )}
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-2">
          <div className="text-gray-400 text-xs text-center space-y-1">
            <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Address: {address || 'None'}</p>
            {basename && <p>Basename: {basename}</p>}
          </div>
        </div>
      )}
    </div>
  );
}