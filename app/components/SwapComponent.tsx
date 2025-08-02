"use client";

import { SwapDefault } from '@coinbase/onchainkit/swap';
import type { Token } from '@coinbase/onchainkit/token';

// Token definitions for Base network
const eth: Token = {
  name: 'ETH',
  address: '',
  symbol: 'ETH',
  decimals: 18,
  image: 'https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png',
  chainId: 8453,
};

const usdc: Token = {
  name: 'USDC',
  address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  symbol: 'USDC',
  decimals: 6,
  image: 'https://d3r81g40ycuhqg.cloudfront.net/wallet/wais/44/2b/442b80bd16af0c0d9b22e03a16753823fe826e5bfd457292b55fa0ba8c1ba213-ZWUzYjJmZGUtMDYxNy00NDcyLTg0NjQtMWI4OGEwYjBiODE2',
  chainId: 8453,
};

const usdt: Token = {
  name: 'USDT',
  address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  symbol: 'USDT',
  decimals: 6,
  image: 'https://wallet-api-production.s3.amazonaws.com/uploads/tokens/usdt_288.png',
  chainId: 8453,
};

const dai: Token = {
  name: 'DAI',
  address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  symbol: 'DAI',
  decimals: 18,
  image: 'https://wallet-api-production.s3.amazonaws.com/uploads/tokens/dai_288.png',
  chainId: 8453,
};

interface SwapComponentProps {
  className?: string;
}

export function SwapComponent({ className = '' }: SwapComponentProps) {
  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Swap Tokens</h2>
          <p className="text-gray-400 text-sm">
            Swap ETH for USDC or other tokens on Base network
          </p>
        </div>
        
        <SwapDefault 
          from={[eth, usdc, usdt, dai]} 
          to={[usdc, eth, usdt, dai]} 
        />
      </div>
    </div>
  );
}

// Export individual components for flexible usage
export function ETHToUSDCSwap({ className = '' }: SwapComponentProps) {
  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Convert ETH to USDC</h2>
          <p className="text-gray-400 text-sm">
            Perfect for getting USDC to cash out via mobile money
          </p>
        </div>
        
        <SwapDefault from={[eth]} to={[usdc]} />
      </div>
    </div>
  );
}

export function USDCToETHSwap({ className = '' }: SwapComponentProps) {
  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Convert USDC to ETH</h2>
          <p className="text-gray-400 text-sm">
            Get ETH from your USDC balance
          </p>
        </div>
        
        <SwapDefault from={[usdc]} to={[eth]} />
      </div>
    </div>
  );
}

// Token exports for reuse
export { eth, usdc, usdt, dai };