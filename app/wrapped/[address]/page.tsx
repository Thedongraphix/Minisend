'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { useComposeCast } from '@coinbase/onchainkit/minikit';

interface WrappedStats {
  walletAddress: string;
  hasTransactions: boolean;
  totalTransactions: number;
  totalUsdcSent: number;
  memberSince: string;
  daysActive: number;
  rank: number;
  totalUsers: number;
  percentile: number;
}

export default function WrappedPage() {
  const params = useParams();
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useAccount();
  const { composeCast } = useComposeCast();
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const addressParam = params.address as string;

  useEffect(() => {
    // Privacy check - only show if user is viewing their own wrapped
    if (!isConnected || !connectedAddress) {
      router.push('/profile');
      return;
    }

    if (addressParam.toLowerCase() !== connectedAddress.toLowerCase()) {
      setError('You can only view your own wrapped stats');
      setLoading(false);
      return;
    }

    fetchWrappedStats();
  }, [addressParam, connectedAddress, isConnected, router]);

  const fetchWrappedStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wrapped/stats/${addressParam}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to load wrapped stats');
      }
    } catch (err) {
      console.error('Error fetching wrapped stats:', err);
      setError('Failed to load wrapped stats');
    } finally {
      setLoading(false);
    }
  };

  const handleFarcasterShare = async () => {
    if (!stats) return;

    setIsSharing(true);
    try {
      // Natural caption that tags @minisend
      const text = `My 2025 wrapped 🎁

${stats.totalTransactions} transactions
${stats.totalUsdcSent.toFixed(2)} USDC sent
Top ${stats.percentile}% user

@minisend`;

      await composeCast({
        text,
        embeds: ['https://farcaster.xyz/minisend'],
      });
    } catch (error) {
      console.error('Error sharing to Farcaster:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || !stats) return;

    setIsSharing(true);
    try {
      // Generate image from card
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2,
      });

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'minisend-wrapped-2025.png', { type: 'image/png' });

        // Create share text
        const shareText = `Just checked my Minisend 2025 Wrapped! 🎉\n\n💸 Sent ${stats.totalUsdcSent.toFixed(2)} USDC\n📊 ${stats.totalTransactions} transactions\n🏆 Top ${stats.percentile}% of users\n\nCheck yours at minisend.com/wrapped\n\n#MinisendWrapped`;

        // Try native share if available
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            text: shareText,
            files: [file],
          });
        } else {
          // Fallback: Download image
          const url = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = 'minisend-wrapped-2025.png';
          link.href = url;
          link.click();

          // Copy text to clipboard
          await navigator.clipboard.writeText(shareText);
          alert('Image downloaded and text copied to clipboard!');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error sharing:', err);
      alert('Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border border-gray-800 border-t-white rounded-full"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-gray-800/50 rounded-2xl p-8 bg-[#111] text-center">
          <h1 className="text-xl font-medium text-white mb-3">Error</h1>
          <p className="text-gray-400 text-sm mb-6">{error || 'Failed to load wrapped stats'}</p>
          <button
            onClick={() => router.push('/profile')}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  if (!stats.hasTransactions) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-gray-800/50 rounded-2xl p-8 bg-[#111] text-center">
          <h1 className="text-xl font-medium text-white mb-3">No Wrapped Yet</h1>
          <p className="text-gray-400 text-sm mb-6">
            You haven&apos;t made any transactions yet. Start using Minisend to see your 2025 Wrapped!
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Make Your First Transaction
          </button>
        </div>
      </div>
    );
  }

  const getRankText = () => {
    if (stats.percentile <= 10) {
      return `Top ${stats.percentile}%`;
    }
    return `#${stats.rank} of ${stats.totalUsers}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-medium text-white">Your 2025 Wrapped</h1>
            <p className="text-sm text-gray-400">A year of seamless USDC transactions</p>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="px-4 py-2 bg-[#111] border border-gray-800/50 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Back to Profile
          </button>
        </div>

        {/* Wrapped Card */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="border border-gray-800/50 rounded-2xl p-8 bg-[#111] mb-6"
        >
          {/* Member Since */}
          <p className="text-sm text-gray-400 mb-8">
            Member Since {stats.memberSince}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total USDC */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">TOTAL SENT</p>
              <p className="text-3xl font-medium text-white mb-1">
                {stats.totalUsdcSent.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-sm text-gray-400">USDC</p>
            </div>

            {/* Transactions */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">TRANSACTIONS</p>
              <p className="text-3xl font-medium text-white">
                {stats.totalTransactions}
              </p>
              <p className="text-sm text-gray-400">completed</p>
            </div>

            {/* Rank */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">YOUR RANK</p>
              <p className="text-3xl font-medium text-white">
                {getRankText()}
              </p>
              <p className="text-sm text-gray-400">of {stats.totalUsers} users</p>
            </div>
          </div>
        </motion.div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={handleFarcasterShare}
            disabled={isSharing}
            className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSharing ? (
              <>
                <div className="animate-spin w-4 h-4 border border-gray-300 border-t-black rounded-full"></div>
                Preparing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share on Farcaster
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
