"use client";

import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
} from '@coinbase/onchainkit/identity';

interface SmartWalletConnectionProps {
  showForTransaction?: boolean; // Only show full wallet UI when ready to transact
  onWalletReady?: (address: string) => void;
  onProceedToTransaction?: () => void; // Callback when ready to proceed with transaction
}

export function SmartWalletConnection({ 
  showForTransaction = false, 
  onWalletReady,
  onProceedToTransaction
}: SmartWalletConnectionProps) {
  // Dual wallet system: MiniKit for Farcaster, Wagmi for web
  const { context } = useMiniKit();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  
  // Enhanced Farcaster detection and wallet logic
  const isFarcaster = Boolean(context?.user || context?.client);
  const farcasterAddress = (context?.user as { walletAddress?: string })?.walletAddress;
  
  // Use wagmi address as fallback when in Farcaster but no farcaster address
  const address = farcasterAddress || wagmiAddress;
  const isConnected = Boolean(address) && (wagmiConnected || Boolean(farcasterAddress));

  // Notify when wallet is ready
  if (isConnected && address && onWalletReady) {
    onWalletReady(address);
  }

  // If we're in Farcaster and not showing for transaction, show MiniKit status
  if (isFarcaster && !showForTransaction) {
    if (!isConnected) {
      return (
        <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-400/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">🔗</span>
            </div>
            <div>
              <h4 className="text-blue-300 font-bold text-sm mb-1">Wallet Access Needed</h4>
              <p className="text-blue-200 text-xs">
                Enable wallet in your Farcaster app to continue
              </p>
            </div>
          </div>
          
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg font-bold text-xs hover:bg-blue-700 transition-all duration-300"
            >
              Retry
            </button>
            <button
              onClick={() => window.open('https://warpcast.com', '_blank')}
              className="flex-1 bg-gray-600 text-white py-2 px-3 rounded-lg font-bold text-xs hover:bg-gray-700 transition-all duration-300"
            >
              Use Warpcast
            </button>
          </div>
        </div>
      );
    }

    // Connected in Farcaster - show minimal status
    return (
      <div className="bg-green-500/20 p-3 rounded-xl border border-green-400/30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <span className="text-sm">✅</span>
          </div>
          <div>
            <div className="text-green-300 font-bold text-sm">Wallet Connected</div>
            <div className="text-green-200 text-xs font-mono">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connecting...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If we're showing for transaction OR we're on web, show full Coinbase Wallet UI
  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3 shadow-lg">
            <span className="text-xl">💰</span>
          </div>
          <p className="text-white font-medium mb-2">
            {showForTransaction ? 'Ready to Send USDC' : 'Connect Wallet'}
          </p>
          <p className="text-gray-300 text-sm mb-4">
            {showForTransaction 
              ? 'Connect your wallet to send the USDC transaction' 
              : 'Connect your wallet to get started'
            }
          </p>
        </div>
        
        {/* Full Coinbase Wallet Integration */}
        <Wallet>
          <ConnectWallet
            text={showForTransaction ? "Connect for Transaction" : "Connect Wallet"}
            className="w-full"
          />
          <WalletDropdown>
            <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
              <Avatar />
              <Name />
              <Address />
            </Identity>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>

        {showForTransaction && (
          <div className="bg-orange-500/20 p-3 rounded-xl border border-orange-400/30">
            <div className="flex items-start space-x-2">
              <span className="text-orange-300 text-sm">⚡</span>
              <div>
                <p className="text-orange-200 text-xs leading-relaxed">
                  This will use Coinbase Wallet via Base Pay to send your USDC to PayCrest for mobile money conversion.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Connected - show wallet info
  return (
    <div className="bg-green-500/20 p-4 rounded-xl border border-green-400/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl">✅</span>
          </div>
          <div>
            <div className="text-green-300 font-bold text-sm">
              {showForTransaction ? 'Ready to Send' : 'Wallet Connected'}
            </div>
            <div className="text-green-200 text-xs font-mono">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connecting...'}
            </div>
          </div>
        </div>

        {!isFarcaster && (
          <Wallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
              </Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        )}
      </div>

      {showForTransaction && (
        <div className="mt-3 space-y-3">
          <div className="text-center">
            <div className="text-green-200 text-xs mb-2">
              ⚡ Using Base network • USDC → Mobile Money
            </div>
          </div>
          
          {onProceedToTransaction && (
            <button
              onClick={onProceedToTransaction}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl font-bold text-sm hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>Send USDC Transaction</span>
                <span>🚀</span>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}