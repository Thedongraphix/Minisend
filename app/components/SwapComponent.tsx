"use client";

import { useAccount } from 'wagmi';
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
import { Button } from './DemoComponents';

interface SwapComponentProps {
  setActiveTab: (tab: string) => void;
}

export function SwapComponent({ setActiveTab }: SwapComponentProps) {
  const { address } = useAccount();

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

  if (!address) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="glass-effect rounded-3xl card-shadow overflow-hidden">
          <div className="p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Swap Tokens</h3>
            <p className="text-gray-300 mb-6">
              Connect your wallet to swap ETH to USDC and get ready for seamless payments.
            </p>
            
            <div className="mb-6">
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-effect rounded-3xl card-shadow overflow-hidden">
        <div className="p-8">
          <h3 className="text-2xl font-bold text-white mb-2 text-center">Swap Tokens</h3>
          <p className="text-gray-300 mb-6 text-center text-sm">
            Convert ETH to USDC for mobile money payments
          </p>
          
          <div className="w-full max-w-md mx-auto">
            <Swap>
              <div className="space-y-6">
                <div className="relative mb-4">
                  <SwapAmountInput
                    label="From"
                    swappableTokens={swappableTokens}
                    token={ETHToken}
                    type="from"
                  />
                </div>
                <div className="flex justify-center py-4 relative z-20">
                  <SwapToggleButton />
                </div>
                <div className="relative mt-4">
                  <SwapAmountInput
                    label="To"
                    swappableTokens={swappableTokens}
                    token={USDCToken}
                    type="to"
                  />
                </div>
                <div className="pt-6 relative z-10">
                  <SwapButton />
                </div>
                <SwapMessage />
              </div>
              <SwapToast />
            </Swap>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-700 flex gap-3">
            <Button 
              variant="outlined" 
              onClick={() => setActiveTab("home")} 
              fullWidth 
              size="medium"
            >
              Back to Home
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setActiveTab("offramp")} 
              fullWidth 
              size="medium"
            >
              Cash Out USDC
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}