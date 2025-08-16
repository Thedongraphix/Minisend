"use client";

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
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
  const { isConnected } = useAccount();

  // Call success callback when connected
  useEffect(() => {
    if (isConnected && onConnectionSuccess) {
      onConnectionSuccess();
    }
  }, [isConnected, onConnectionSuccess]);

  return (
    <div className={`flex justify-center ${className}`}>
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar/>
            <Name />
            <Address />
            
            {showBalance && <EthBalance />}
          </Identity>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}