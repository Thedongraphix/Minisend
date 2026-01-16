"use client";

import { useState, useEffect, useRef } from 'react';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import { isFarcasterMiniApp } from '@/lib/platform-detection';
import { useAccount, useDisconnect } from 'wagmi';
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
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const isFarcaster = isFarcasterMiniApp();

  // Get Minisend auth state (handles email + wallet)
  const { isAuthenticated, minisendWallet, user } = useMinisendAuth();

  // Always call hooks unconditionally
  const privyHooks = usePrivy();

  // Use useLogin hook with callbacks for better UX
  const { login: privyLogin } = useLogin({
    onComplete: ({ user, isNewUser, loginMethod, loginAccount }) => {
      console.log('[Privy] Login complete:', {
        userId: user.id,
        isNewUser,
        loginMethod,
        accountType: loginAccount?.type
      });
      // Track new user signups for analytics
      if (isNewUser) {
        console.log('[Privy] New user signed up via:', loginMethod);
      }
    },
    onError: (error) => {
      console.error('[Privy] Login error:', error);
    }
  });

  // Use Privy hooks only if not in Farcaster
  const { authenticated, ready, logout: privyLogout } = !isFarcaster
    ? privyHooks
    : { authenticated: false, ready: false, logout: async () => {} };

  // Login function that works across platforms
  const login = !isFarcaster ? privyLogin : async () => {};

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Handle logout
  const handleLogout = async () => {
    try {
      // Disconnect wallet if connected
      if (isConnected) {
        disconnect();
      }

      // Logout from Privy if authenticated
      if (authenticated) {
        await privyLogout();
      }

      setShowDropdown(false);

      // Optional: Reload page to clear all state
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle profile click
  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
      setShowDropdown(false);
    }
  };

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

  // Authenticated: show profile button with dropdown
  return (
    <div className={`${className} relative`} ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-white/20"
      >
        {/* Avatar */}
        <div className="relative">
          {displayAddress ? (
            <Avatar
              address={displayAddress as `0x${string}`}
              chain={base}
              className="h-8 w-8 rounded-full ring-2 ring-white/10 group-hover:ring-[#0052FF]/50 transition-all"
            />
          ) : (
            <div className="h-8 w-8 rounded-full ring-2 ring-white/10 group-hover:ring-[#0052FF]/50 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center transition-all">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* "Your profile" text */}
        <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
          Your profile
        </span>

        {/* Chevron icon */}
        <svg
          className={`w-4 h-4 text-white/60 group-hover:text-white/80 transition-all ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl overflow-hidden z-50">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-white/10 bg-white/5">
            <p className="text-xs text-white/50 mb-1">Signed in as</p>
            <p className="text-sm text-white font-medium truncate">
              {user?.email || (displayAddress ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}` : 'User')}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* View Profile */}
            {onProfileClick && (
              <button
                onClick={handleProfileClick}
                className="w-full px-4 py-2.5 text-left text-sm text-white/90 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                View Profile
              </button>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}