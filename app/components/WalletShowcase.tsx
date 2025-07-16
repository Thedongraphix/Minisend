"use client";

import { useAccount, useChainId } from "wagmi";
import { 
  Avatar, 
  Name, 
  Address, 
  EthBalance,
  Identity 
} from "@coinbase/onchainkit/identity";
import { 
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect 
} from "@coinbase/onchainkit/wallet";
import { base, baseSepolia } from "wagmi/chains";

export function WalletShowcase() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();

  const currentChain = chainId === base.id ? 'Base Mainnet' : 
                     chainId === baseSepolia.id ? 'Base Sepolia' : 
                     'Unknown Network';

  const supportedWallets = [
    { name: 'Coinbase Wallet', icon: '🔵', description: 'Smart wallet & EOA support' },
    { name: 'MetaMask', icon: '🦊', description: 'Most popular Ethereum wallet' },
    { name: 'Phantom', icon: '👻', description: 'Multi-chain wallet' },
    { name: 'Rabby', icon: '🐰', description: 'Security-focused wallet' },
    { name: 'Trust Wallet', icon: '🛡️', description: 'Mobile-first wallet' },
    { name: 'Frame', icon: '🖼️', description: 'Desktop native wallet' },
  ];

  return (
    <div className="space-y-6">
      {/* Wallet Connection Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4 text-center">Multi-Wallet Connection</h2>
        
        <div className="flex justify-center mb-6">
          <Wallet className="w-full max-w-sm">
            <ConnectWallet className="w-full">
              <Avatar className="h-6 w-6" />
              <Name className="text-inherit" />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>

        {/* Connection Status */}
        {isConnected ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-800 dark:text-green-200 font-medium">✅ Wallet Connected</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{currentChain}</span>
            </div>
            {connector && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div>Connected via: <span className="font-medium">{connector.name}</span></div>
                {address && (
                  <div className="mt-1">
                    Address: <span className="font-mono text-xs">{address.slice(0, 6)}...{address.slice(-4)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="text-yellow-800 dark:text-yellow-200 font-medium">⚠️ No Wallet Connected</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Click the button above to connect any supported wallet
            </div>
          </div>
        )}
      </div>

      {/* Supported Wallets Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Supported Wallets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supportedWallets.map((wallet) => (
            <div 
              key={wallet.name}
              className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <span className="text-2xl mr-3">{wallet.icon}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{wallet.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{wallet.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Information */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Network Support</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">Base Mainnet</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Production network for live transactions</div>
            </div>
            <span className="text-blue-600 dark:text-blue-400">🟢</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div>
              <div className="font-medium text-purple-900 dark:text-purple-100">Base Sepolia</div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Testnet for development and testing</div>
            </div>
            <span className="text-purple-600 dark:text-purple-400">🟡</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Wallet Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start">
            <span className="text-green-500 mr-2 mt-1">✓</span>
            <div>
              <div className="font-medium">Smart Wallet Support</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Gasless transactions with Coinbase Wallet</div>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 mr-2 mt-1">✓</span>
            <div>
              <div className="font-medium">Multi-Chain Ready</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Base mainnet and testnet support</div>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 mr-2 mt-1">✓</span>
            <div>
              <div className="font-medium">Security First</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Industry-standard wallet security</div>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 mr-2 mt-1">✓</span>
            <div>
              <div className="font-medium">Modal Interface</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Beautiful wallet selection modal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 