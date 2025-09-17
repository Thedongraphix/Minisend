"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletAdvancedWalletActions,
  WalletAdvancedAddressDetails,
  WalletAdvancedTransactionActions,
  WalletAdvancedTokenHoldings,
  WalletDropdownFundLink,
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
  const [isMobile, setIsMobile] = useState(false);
  const { isConnected } = useAccount();
  const { context } = useMiniKit();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);


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
          <WalletDropdownFundLink text="Buy Crypto" openIn={isMobile ? "tab" : "popup"} />
          <WalletAdvancedTransactionActions />
          {!isMobile && <WalletAdvancedTokenHoldings />}
        </WalletDropdown>
      </Wallet>
    </div>
  );
}