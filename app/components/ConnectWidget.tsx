"use client";

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { isFarcasterMiniApp } from '@/lib/platform-detection';
import { useAccount } from 'wagmi';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { base } from 'viem/chains';
import { useMinisendAuth } from '@/lib/hooks/useMinisendAuth';

interface ConnectWidgetProps {
  className?: string;
  onProfileClick?: () => void;
}

export function ConnectWidget({ className = '', onProfileClick }: ConnectWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const isFarcaster = isFarcasterMiniApp();

  // Get Minisend auth state (handles email + wallet)
  const { isAuthenticated, minisendWallet, user } = useMinisendAuth();

  // Always call hooks unconditionally
  const privyHooks = usePrivy();

  // Use Privy hooks only if not in Farcaster
  const { authenticated, ready, login } = !isFarcaster
    ? privyHooks
    : { authenticated: false, ready: false, login: async () => {} };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isFarcaster) return null;

  if (!ready) {
    return (
      <div className={className}>
        <div className="h-10 w-10 bg-gray-800 animate-pulse rounded-full" />
      </div>
    );
  }

  // Check if user is authenticated (via Privy email OR wallet connection)
  const isUserAuthenticated = isAuthenticated || authenticated || isConnected;

  // Get display address (prefer connected wallet, fallback to minisend wallet)
  const displayAddress = address || minisendWallet || user?.walletAddress;

  // Not authenticated: show Sign Up (Privy) and Connect Wallet (OnchainKit) buttons
  if (!isUserAuthenticated) {
    return (
      <div className={`${className} flex items-center gap-2`}>
        {/* Sign Up - Privy (White) */}
        <button
          onClick={login}
          className="px-4 py-3 bg-white hover:bg-gray-100 text-black rounded-xl text-sm font-semibold transition-all active:scale-95 whitespace-nowrap"
        >
          Sign Up
        </button>
        {/* Connect Wallet - OnchainKit (Blue) */}
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
        </Wallet>
      </div>
    );
  }

  // Authenticated: show professional profile icon with avatar
  return (
    <div className={className}>
      <button
        onClick={onProfileClick}
        className="group relative"
        title="View Profile"
      >
        <div className="relative">
          {displayAddress ? (
            <Avatar
              address={displayAddress as `0x${string}`}
              chain={base}
              className="h-10 w-10 rounded-full ring-2 ring-white/10 group-hover:ring-[#0052FF]/50 transition-all"
            />
          ) : (
            <div className="h-10 w-10 rounded-full ring-2 ring-white/10 group-hover:ring-[#0052FF]/50 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center transition-all">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/5 group-hover:to-white/10 transition-all pointer-events-none" />
        </div>
      </button>
    </div>
  );
}