"use client";

import { Avatar, Name } from '@coinbase/onchainkit/identity';
import {
  Swap,
  SwapAmountInput,
  SwapToggleButton,
  SwapButton,
  SwapMessage,
  SwapToast,
  SwapDefault
} from '@coinbase/onchainkit/swap';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import type { Token } from '@coinbase/onchainkit/token';

// Token definitions following OnchainKit documentation format
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

const USDTToken: Token = {
  address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
  chainId: 8453,
  decimals: 6,
  name: "Tether USD",
  symbol: "USDT",
  image: "https://dynamic-assets.coinbase.com/41f6a93a3a222078c939115fc304a67c384886b7a9e6c15dcbfa6519dc45f6bb7654a36c988991c140608529d9d6c345be1ba2fe197bd70ac2b61de7a6c0bb5/asset_icons/1f8489bb8d3c3f6b9d27b7e95a0e2eb6a7b71d53c3c3c7a9b1f0c7b9d1c5b9.png",
};

const DAIToken: Token = {
  address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  chainId: 8453,
  decimals: 18,
  name: "Dai Stablecoin",
  symbol: "DAI",
  image: "https://dynamic-assets.coinbase.com/6e84d26eef5fc9de4648bb58f3aea89b5ddad30af18a7e7fd4e8e8b00afc879b5ea54055ddfd4faca3c3dbb7bbc33d1b85e1e5524dcc42b6f6b9d4a6f5b0a5b/asset_icons/0788ad2b14f7b0b5a5c0c62f6c3b3f7f3b7b3b3f3b3b3f3b3b3f3b3b3f3b3b.png",
};

// Add all tokens to swappable list
const swappableTokens: Token[] = [ETHToken, USDCToken, USDTToken, DAIToken];

interface SwapComponentProps {
  className?: string;
}

export function SwapComponent({ className = '' }: SwapComponentProps) {
  const { address } = useAccount();

  // If no wallet connected, show connect wallet UI
  if (!address) {
    return (
      <div className={`w-full max-w-md mx-auto ${className}`}>
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet to Swap</h2>
            <p className="text-gray-400 text-sm">
              Connect your wallet to start swapping tokens on Base
            </p>
          </div>
          
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
          </Wallet>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Swap Tokens</h2>
          <p className="text-gray-400 text-sm">
            Swap ETH for USDC or other tokens on Base network
          </p>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4">
          <Swap>
            <SwapAmountInput
              label="Sell"
              swappableTokens={swappableTokens}
              token={ETHToken}
              type="from"
            />
            <SwapToggleButton />
            <SwapAmountInput
              label="Buy"
              swappableTokens={swappableTokens}
              token={USDCToken}
              type="to"
            />
            <SwapButton />
            <SwapMessage />
            <SwapToast />
          </Swap>
        </div>
        
        {/* Network indicator */}
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-500 flex items-center justify-center space-x-1">
            <span>⚡</span>
            <span>Base Network</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Specialized swap components for specific use cases
export function ETHToUSDCSwap({ className = '' }: SwapComponentProps) {
  const { address } = useAccount();

  const handleSwapSuccess = (transactionReceipt: any) => {
    console.log('✅ ETH to USDC swap successful:', transactionReceipt);
    // Add analytics tracking if needed
  };

  const handleSwapError = (error: Error) => {
    console.error('❌ ETH to USDC swap failed:', error);
    // Add error reporting if needed
  };

  if (!address) {
    return (
      <div className={`w-full max-w-md mx-auto ${className}`}>
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
            <p className="text-gray-400 text-sm">
              Connect your wallet to convert ETH to USDC
            </p>
          </div>
          
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
          </Wallet>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Convert ETH to USDC</h2>
          <p className="text-gray-400 text-sm">
            Perfect for getting USDC to cash out via mobile money
          </p>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4">
          <Swap>
            <SwapAmountInput
              label="Sell"
              token={ETHToken}
              type="from"
            />
            <SwapAmountInput
              label="Buy"
              token={USDCToken}
              type="to"
            />
            <SwapButton />
            <SwapMessage />
            <SwapToast />
          </Swap>
        </div>
      </div>
    </div>
  );
}

export function USDCToETHSwap({ className = '' }: SwapComponentProps) {
  const { address } = useAccount();

  const handleSwapSuccess = (transactionReceipt: any) => {
    console.log('✅ USDC to ETH swap successful:', transactionReceipt);
    // Add analytics tracking if needed
  };

  const handleSwapError = (error: Error) => {
    console.error('❌ USDC to ETH swap failed:', error);
    // Add error reporting if needed
  };

  if (!address) {
    return (
      <div className={`w-full max-w-md mx-auto ${className}`}>
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
            <p className="text-gray-400 text-sm">
              Connect your wallet to convert USDC to ETH
            </p>
          </div>
          
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
          </Wallet>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Convert USDC to ETH</h2>
          <p className="text-gray-400 text-sm">
            Get ETH from your USDC balance
          </p>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4">
          <Swap>
            <SwapAmountInput
              label="Sell"
              token={USDCToken}
              type="from"
            />
            <SwapAmountInput
              label="Buy"
              token={ETHToken}
              type="to"
            />
            <SwapButton />
            <SwapMessage />
            <SwapToast />
          </Swap>
        </div>
      </div>
    </div>
  );
}

// SwapDefault version for simple usage
export function SimpleSwapDefault({ className = '' }: SwapComponentProps) {
  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Quick Swap</h2>
          <p className="text-gray-400 text-sm">
            Simple swap interface using SwapDefault
          </p>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4">
          <SwapDefault 
            from={[ETHToken, USDCToken]} 
            to={[USDCToken, ETHToken]} 
          />
        </div>
        
        {/* Network indicator */}
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-500 flex items-center justify-center space-x-1">
            <span>⚡</span>
            <span>Base Network</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced swap with paymaster support for sponsored transactions
export function SponsoredSwap({ className = '' }: SwapComponentProps) {
  const { address } = useAccount();

  if (!address) {
    return (
      <div className={`w-full max-w-md mx-auto ${className}`}>
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
            <p className="text-gray-400 text-sm">
              Connect your Smart Wallet for sponsored swaps
            </p>
          </div>
          
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
          </Wallet>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Sponsored Swap</h2>
          <p className="text-gray-400 text-sm">
            Gas-free swaps for Smart Wallet users
          </p>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4">
          <Swap isSponsored>
            <SwapAmountInput
              label="Sell"
              swappableTokens={swappableTokens}
              token={ETHToken}
              type="from"
            />
            <SwapToggleButton />
            <SwapAmountInput
              label="Buy"
              swappableTokens={swappableTokens}
              token={USDCToken}
              type="to"
            />
            <SwapButton />
            <SwapMessage />
            <SwapToast />
          </Swap>
        </div>
        
        {/* Sponsored transaction indicator */}
        <div className="mt-4 text-center">
          <div className="text-xs text-green-400 flex items-center justify-center space-x-1">
            <span>🎉</span>
            <span>Gas Sponsored</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Token exports for reuse
export { ETHToken, USDCToken, USDTToken, DAIToken, swappableTokens };