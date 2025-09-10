"use client";

import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletAdvancedWalletActions,
  WalletAdvancedAddressDetails,
  WalletAdvancedTransactionActions,
  WalletAdvancedTokenHoldings,
} from '@coinbase/onchainkit/wallet';
import {
  Avatar,
  Name,
} from '@coinbase/onchainkit/identity';

interface WalletIslandProps {
  className?: string;
}

export function WalletIsland({ 
  className = '' 
}: WalletIslandProps) {
  return (
    <div className={className}>
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <WalletAdvancedWalletActions />
          <WalletAdvancedAddressDetails />
          <WalletAdvancedTransactionActions />
          <WalletAdvancedTokenHoldings />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}