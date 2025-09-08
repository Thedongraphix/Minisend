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
  startingPosition?: {
    x: number;
    y: number;
  };
  className?: string;
}

export function WalletIsland({ 
  startingPosition,
  className = '' 
}: WalletIslandProps) {
  // Default starting position (bottom-right corner)
  const defaultPosition = {
    x: typeof window !== 'undefined' ? window.innerWidth - 300 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight - 100 : 0,
  };

  return (
    <div className={className}>
      <Wallet
        draggable={true}
        draggableStartingPosition={startingPosition || defaultPosition}
      >
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