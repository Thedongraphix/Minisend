"use client";

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { base } from 'viem/chains';
import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownFundLink,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import { useMinisendAuth } from '@/lib/hooks/useMinisendAuth';

interface ConnectionHandlerProps {
  onConnectionSuccess?: () => void;
  showBalance?: boolean;
  className?: string;
}

export function ConnectionHandler({
  onConnectionSuccess,
  showBalance = false,
  className = ''
}: ConnectionHandlerProps) {
  const { isConnected, address } = useAccount();
  const { isAuthenticated } = useMinisendAuth();

  useEffect(() => {
    if (isConnected && onConnectionSuccess) {
      onConnectionSuccess();
    }
  }, [isConnected, onConnectionSuccess]);

  // If user is authenticated via email (has minisend wallet but no connected wallet),
  // don't show wallet connection prompt - they can use their deposit address
  if (isAuthenticated && !isConnected) {
    return null;
  }

  // Show wallet connection for users who need to connect a wallet for transactions
  return (
    <div className={`flex justify-center ${className}`}>
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name address={address} chain={base} className="text-white" />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name
              address={address}
              chain={base}
              className="text-white font-semibold"
            />
            <Address className="text-gray-300 text-sm" />

            {showBalance && <EthBalance />}
          </Identity>

          <WalletDropdownFundLink />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}