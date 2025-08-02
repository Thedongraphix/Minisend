"use client";

import { useEffect, useState } from 'react';
import { useMobileWalletConnection } from '../../hooks/useMobileWalletConnection';
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
  const { 
    isConnected, 
    isConnecting, 
    connectWallet, 
    error: connectionError,
    isMobile,
    isCoinbaseWallet,
    canRetry,
    connectionAttempts,
    connectionDuration
  } = useMobileWalletConnection();
  
  const [mounted, setMounted] = useState(false);
  const [showConnectionTips, setShowConnectionTips] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Call success callback when connected
  useEffect(() => {
    if (isConnected && onConnectionSuccess) {
      onConnectionSuccess();
    }
  }, [isConnected, onConnectionSuccess]);

  // Show tips for mobile users having connection issues
  useEffect(() => {
    if (connectionAttempts > 1 && !isConnected && isMobile) {
      setShowConnectionTips(true);
    }
  }, [connectionAttempts, isConnected, isMobile]);

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
      {!isConnected ? (
        <div className="space-y-3">
          {/* Connection Button */}
          <div className="flex justify-center">
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors border-none flex items-center space-x-2 min-w-[160px] justify-center"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Connect Wallet</span>
              )}
            </button>
          </div>

          {/* Connection Progress Indicator */}
          {isConnecting && connectionDuration && (
            <div className="text-center">
              <div className="text-xs text-gray-400">
                {Math.floor(connectionDuration / 1000)}s elapsed
                {isCoinbaseWallet && isMobile && ' (up to 3min for mobile)'}
              </div>
            </div>
          )}

          {/* Error Display */}
          {connectionError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm text-center">{connectionError}</p>
              {canRetry && (
                <button 
                  onClick={connectWallet}
                  className="text-red-300 text-xs mt-2 underline hover:text-red-200 block mx-auto"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {/* Mobile Connection Tips */}
          {showConnectionTips && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="text-blue-300 text-xs space-y-2">
                <p className="font-medium">Having trouble connecting?</p>
                <ul className="space-y-1 text-left">
                  <li>• Try opening in Coinbase Wallet app directly</li>
                  <li>• Ensure you have the latest app version</li>
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing the page</li>
                </ul>
              </div>
            </div>
          )}

          {/* Environment Info for Debugging */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-2">
              <div className="text-gray-400 text-xs text-center space-y-1">
                <p>Debug: {isMobile ? 'Mobile' : 'Desktop'} | {isCoinbaseWallet ? 'CBW' : 'Other'}</p>
                <p>Attempts: {connectionAttempts}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Connected Wallet Display */}
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

          {/* Connection Success Message */}
          {connectionAttempts > 1 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
              <p className="text-green-400 text-xs text-center">
                ✅ Successfully connected after {connectionAttempts} attempt{connectionAttempts > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}