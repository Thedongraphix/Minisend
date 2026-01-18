"use client";

import { useAccount } from 'wagmi';
import { useEffect } from 'react';
import {
  Swap,
  SwapAmountInput,
  SwapToggleButton,
  SwapButton,
  SwapMessage,
  SwapToast,
} from '@coinbase/onchainkit/swap';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import type { Token } from '@coinbase/onchainkit/token';
import { Button } from './BaseComponents';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { trackSwapEvent, trackWalletEvent } from '@/lib/analytics';
import { useMinisendAuth } from '@/lib/hooks/useMinisendAuth';

interface SwapInterfaceProps {
  setActiveTab: (tab: string) => void;
}

export function SwapInterface({ setActiveTab }: SwapInterfaceProps) {
  const { address, isConnected } = useAccount();
  const { context } = useMiniKit();
  const { isAuthenticated } = useMinisendAuth();

  // Track component mount and wallet connection state
  useEffect(() => {
    trackSwapEvent('component_mounted', {
      success: true,
    }, context || undefined);

    if (isConnected && address) {
      trackWalletEvent('wallet_connected_swap', {
        address,
        success: true,
      }, context || undefined);
    }
  }, [address, isConnected, context]);

  const ETHToken: Token = {
    address: "",
    chainId: 8453,
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
    image: "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
  };

  const USDCToken: Token = {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    chainId: 8453,
    decimals: 6,
    name: "USDC",
    symbol: "USDC",
    image: "https://dynamic-assets.coinbase.com/3c15df5e2ac7d4abbe9499ed9335041f00c620f28e8de2f93474a9f432058742cdf4674bd43f309e69778a26969372310135be97eb183d91c492154176d455b8/asset_icons/9d67b728b6c8f457717154b3a35f9ddc702eae7e76c4684ee39302c4d7fd0bb8.png",
  };

  // Add other tokens here to display them as options in the swap
  const swappableTokens: Token[] = [ETHToken, USDCToken];

  // If user is authenticated via email, don't show wallet connection prompt
  // They should use the main payment flows instead
  if (!address && !isAuthenticated) {
    return (
      <div className="space-y-2 animate-fade-in">
        <div className="glass-effect rounded-xl card-shadow overflow-hidden max-w-xs mx-auto">
          <div className="p-3 text-center">
            <h3 className="text-base font-bold text-white mb-1">Swap Tokens</h3>
            <p className="text-gray-400 mb-2 text-xs">
              Connect your wallet to swap ETH to USDC
            </p>

            <div className="mb-2">
              <Wallet>
                <ConnectWallet>
                  <Avatar className="h-6 w-6" />
                  <Name />
                </ConnectWallet>
              </Wallet>
            </div>

            <Button
              variant="outlined"
              onClick={() => setActiveTab("home")}
              fullWidth
              size="medium"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If email user without wallet, show message to use payment flows
  if (!address && isAuthenticated) {
    return (
      <div className="space-y-2 animate-fade-in">
        <div className="glass-effect rounded-xl card-shadow overflow-hidden max-w-xs mx-auto">
          <div className="p-3 text-center">
            <h3 className="text-base font-bold text-white mb-1">Swap Tokens</h3>
            <p className="text-gray-400 mb-3 text-xs">
              Swap feature requires a connected wallet. Use the payment flows to convert USDC to mobile money.
            </p>

            <Button
              variant="primary"
              onClick={() => setActiveTab("home")}
              fullWidth
              size="medium"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => setActiveTab('send')}
        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all duration-200"
        title="Go back"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="glass-effect rounded-xl card-shadow overflow-hidden max-w-xs mx-auto">
        <div className="p-3">
          <h3 className="text-base font-bold text-white mb-1 text-center">Swap Tokens</h3>
          <p className="text-gray-400 mb-2 text-center text-xs">
            Convert ETH to USDC for mobile money payments
          </p>
          
          <div className="w-full">
            <Swap className="[&>h3]:hidden [&>*>h3]:hidden">
              <div className="space-y-2">
                <div className="touch-manipulation">
                  <SwapAmountInput
                    label="From"
                    swappableTokens={swappableTokens}
                    token={ETHToken}
                    type="from"
                    className="[&_button]:touch-manipulation [&_select]:touch-manipulation"
                  />
                </div>
                <div className="flex justify-center -my-1">
                  <SwapToggleButton className="touch-manipulation" />
                </div>
                <div className="touch-manipulation">
                  <SwapAmountInput
                    label="To"
                    swappableTokens={swappableTokens}
                    token={USDCToken}
                    type="to"
                    className="[&_button]:touch-manipulation [&_select]:touch-manipulation"
                  />
                </div>
                <div className="pt-2">
                  <SwapButton className="touch-manipulation" />
                </div>
                <SwapMessage />
              </div>
              <SwapToast />
            </Swap>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-700">
            <Button
              variant="secondary"
              onClick={() => setActiveTab("offramp")}
              fullWidth
              size="medium"
            >
              Cash Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}