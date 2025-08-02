"use client";

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import {
  Wallet,
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
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  
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

  // Show error message if connection failed
  if (error) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-sm text-center">Connection error: {error.message}</p>
          <button 
            onClick={() => connect({ connector: connectors[0] })}
            className="text-red-300 text-xs mt-2 underline hover:text-red-200 block mx-auto"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isPending) {
    return (
      <div className={`flex justify-center ${className}`}>
        <button
          disabled
          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 min-w-[160px] justify-center"
        >
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Connecting...</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {!isConnected ? (
        <div className="flex justify-center">
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors border-none min-w-[160px]"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Connected Wallet Display using OnchainKit components */}
          <div className="flex justify-center">
            <Wallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address />
                  {showBalance && <EthBalance />}
                </Identity>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>

          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-2">
              <div className="text-gray-400 text-xs text-center space-y-1">
                <p>Connected: {address}</p>
                <p>Connector: {connectors[0]?.name || 'Unknown'}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}