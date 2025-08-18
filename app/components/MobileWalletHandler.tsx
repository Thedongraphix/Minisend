"use client";

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
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
import { BasenameResolver } from './BasenameResolver';

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
  const { isConnected, address } = useAccount();

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
          {address ? (
            <BasenameResolver address={address} />
          ) : (
            <Name chain={base} />
          )}
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar/>
            {address ? (
              <BasenameResolver address={address} />
            ) : (
              <Name chain={base} />
            )}
            <Address />
            
            {showBalance && <EthBalance />}
          </Identity>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}