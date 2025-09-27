"use client";

import { useState, useEffect } from 'react';
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

interface ConnectWidgetProps {
  className?: string;
}

export function ConnectWidget({
  className = ''
}: ConnectWidgetProps) {
  const [isMobile, setIsMobile] = useState(false);

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