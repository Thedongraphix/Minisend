"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getName } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';

interface MobileWalletHandlerProps {
  onConnectionSuccess?: () => void;
  showBalance?: boolean;
  className?: string;
}

export function MobileWalletHandler({ 
  onConnectionSuccess, 
  showBalance = false,
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
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
          <WalletDropdown>
            <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
              <Avatar />
              {basename ? (
                <div className="text-sm font-medium">{basename}</div>
              ) : (
                <Name />
              )}
              <Address />
              {showBalance && <EthBalance />}
            </Identity>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && address && (
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-2">
          <div className="text-gray-400 text-xs text-center space-y-1">
            <p>Connected: {address}</p>
            {basename && <p>Basename: {basename}</p>}
          </div>
        </div>
      )}
    </div>
  );
}