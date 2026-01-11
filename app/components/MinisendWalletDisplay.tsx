/**
 * Minisend Wallet Display Component
 * Shows the BlockRadar-assigned wallet address after successful authentication
 */

"use client";

import { useState } from 'react';
import { useMinisendAuth } from '@/lib/hooks/useMinisendAuth';
import { Icon } from './BaseComponents';

export function MinisendWalletDisplay() {
  const { minisendWallet, isAuthenticated, isLoading, error, user } = useMinisendAuth();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!minisendWallet) return;

    try {
      await navigator.clipboard.writeText(minisendWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Don't show if not authenticated or still loading
  if (!isAuthenticated || isLoading) {
    return null;
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full max-w-md mx-auto p-4 mb-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-red-400 font-medium">Wallet Assignment Failed</p>
            <p className="text-xs text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show wallet address
  return (
    <div className="w-full max-w-md mx-auto p-4 mb-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="dollar-sign" size="sm" className="text-blue-400 flex-shrink-0" />
            <p className="text-xs font-medium text-gray-300 uppercase tracking-wide">
              Your Minisend Wallet
            </p>
          </div>

          <div className="font-mono text-sm text-white break-all bg-black/30 p-2 rounded">
            {minisendWallet}
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Use this address to deposit USDC on Base Network
          </p>

          {user?.email && (
            <p className="text-xs text-gray-500 mt-1">
              Linked to: {user.email}
            </p>
          )}
        </div>

        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Copy address"
        >
          {copied ? (
            <Icon name="check" size="sm" className="text-green-400" />
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1 px-2 py-1 bg-green-900/30 border border-green-500/30 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-300 font-medium">Active</span>
        </div>

        <div className="text-gray-500">
          {user?.platform && (
            <span className="capitalize">{user.platform}</span>
          )}
        </div>
      </div>
    </div>
  );
}
