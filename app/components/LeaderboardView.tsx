"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { Icon } from './BaseComponents';
import Image from 'next/image';

interface LeaderboardViewProps {
  setActiveTab: (tab: string) => void;
}

interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  fid?: number;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  points: number;
  daily_transactions: number;
  total_usdc: number;
  total_local: number;
  local_currency: string;
  last_transaction: string;
}

export function LeaderboardView({ setActiveTab }: LeaderboardViewProps) {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const miniAppStatus = await sdk.isInMiniApp();
        setIsInMiniApp(miniAppStatus);

        if (miniAppStatus) {
          const context = await sdk.context;

          if (address && context.user.fid) {
            await fetch('/api/user/farcaster', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                wallet_address: address,
                fid: context.user.fid,
                username: context.user.username,
                display_name: context.user.displayName,
                pfp_url: context.user.pfpUrl,
              }),
            }).catch(() => {
              // Silently handle profile storage errors
            });
          }
        }
      } catch {
        setIsInMiniApp(false);
      }
    };

    loadUserData();
  }, [address]);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/leaderboard?period=${period}&limit=100`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const entries: LeaderboardEntry[] = data.leaderboard || [];
      setLeaderboard(entries);

      if (address) {
        const userEntry = entries.find(
          entry => entry.wallet_address.toLowerCase() === address.toLowerCase()
        );
        setUserRank(userEntry || null);
      }

    } catch {
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [period, address]);

  useEffect(() => {
    loadLeaderboard();

    const interval = setInterval(() => {
      loadLeaderboard();
    }, 60000);

    return () => clearInterval(interval);
  }, [loadLeaderboard]);

  const refreshLeaderboard = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'all': return 'All Time';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.display_name) return entry.display_name;
    if (entry.username) return `@${entry.username}`;
    return `${entry.wallet_address.substring(0, 6)}...${entry.wallet_address.substring(38)}`;
  };

  if (loading && leaderboard.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="glass-effect rounded-3xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-blue-400 mx-auto mb-4"></div>
            <p className="text-white">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => setActiveTab('home')}
        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all duration-200"
        title="Go back"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="glass-effect rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Leaderboard</h2>
            <p className="text-gray-400 text-xs sm:text-sm">Top users by daily transactions</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 rounded-lg sm:rounded-xl p-1">
            {(['today', 'week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md sm:rounded-lg transition-all ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All'}
              </button>
            ))}
          </div>

          <button
            onClick={refreshLeaderboard}
            disabled={refreshing}
            className="flex items-center gap-1 px-2 py-1.5 sm:gap-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 transition-all duration-200 disabled:opacity-50"
            title="Refresh leaderboard"
          >
            {refreshing ? (
              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        </div>

        {userRank && (
          <div className="mb-6 p-3 sm:p-4 bg-blue-500/10 border-2 border-blue-500/30 rounded-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-lg sm:text-xl font-bold text-blue-400">{getRankDisplay(userRank.rank)}</div>
                <div>
                  <p className="text-white font-bold text-sm sm:text-base">Your Rank</p>
                  <p className="text-gray-400 text-xs sm:text-sm">{userRank.points} point{userRank.points !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-400 font-bold text-lg sm:text-2xl">{userRank.points}</p>
                <p className="text-gray-400 text-xs">points</p>
              </div>
            </div>
          </div>
        )}

        {!isInMiniApp && (
          <div className="mb-6 p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl sm:rounded-2xl">
            <p className="text-yellow-200 text-xs sm:text-sm">
              <span className="font-bold">Tip:</span> Open Minisend in the Farcaster or Base app to see user profiles with avatars and usernames on the leaderboard.
            </p>
          </div>
        )}

        <div className="space-y-2 sm:space-y-3">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Icon name="star" size="lg" className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No transactions yet</p>
              <p className="text-gray-500 text-sm">Be the first on the leaderboard!</p>
            </div>
          ) : (
            leaderboard.map((entry) => (
              <div
                key={entry.wallet_address}
                className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all ${
                  address && entry.wallet_address.toLowerCase() === address.toLowerCase()
                    ? 'bg-blue-500/20 border-2 border-blue-500/30'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0 rounded-full font-bold text-sm sm:text-base ${
                  entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                  entry.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                  entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-white/10 text-gray-400'
                }`}>
                  {getRankDisplay(entry.rank)}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {entry.pfp_url ? (
                    <Image
                      src={entry.pfp_url}
                      alt={getDisplayName(entry)}
                      width={40}
                      height={40}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 border border-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 border border-white/20"></div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm sm:text-base truncate">
                      {getDisplayName(entry)}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Last active: {formatTimeAgo(entry.last_transaction)}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-white font-bold text-base sm:text-lg">{entry.points}</p>
                  <p className="text-gray-400 text-xs">point{entry.points !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 text-center text-gray-500 text-xs">
          <p>Showing top {leaderboard.length} users for {getPeriodLabel().toLowerCase()}</p>
          <p className="mt-1">Rankings update every minute</p>
        </div>
      </div>
    </div>
  );
}
