'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectWidget } from '../components/ConnectWidget';
import { toPng } from 'html-to-image';

interface WrappedStats {
  walletAddress: string;
  hasTransactions: boolean;
  totalTransactions: number;
  totalUsdcSent: number;
  totalReceived: {
    KES: number;
    NGN: number;
    GHS: number;
  };
  biggestTransaction: {
    usdcAmount: number;
    localAmount: number;
    currency: string;
    date: string;
  };
  favoriteCurrency: string;
  favoritePaymentMethod: string;
  currencyUsagePercent: number;
  memberSince: string;
  daysActive: number;
  mostActiveMonth: string;
  rank: number;
  totalUsers: number;
  percentile: number;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [usdcImage, setUsdcImage] = useState<string>('');
  const [baseImage, setBaseImage] = useState<string>('');

  // Convert images to base64 for reliable html2canvas rendering
  useEffect(() => {
    const loadImage = (src: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        };
        img.onerror = reject;
        img.src = src;
      });
    };

    Promise.all([
      loadImage('/usd-coin.png'),
      loadImage('/Base_lockup_white.png')
    ]).then(([usdc, base]) => {
      setUsdcImage(usdc);
      setBaseImage(base);
    }).catch(err => {
      console.error('Error loading images:', err);
    });
  }, []);

  const fetchWrappedStats = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/wrapped/stats/${address}`);
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
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchWrappedStats();
    }
  }, [address, fetchWrappedStats]);

  const handleDownload = async () => {
    if (!cardRef.current || !stats) return;

    setIsDownloading(true);
    try {
      // Small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use html-to-image for better image handling
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0a0a0a',
        cacheBust: true,
        skipFonts: false,
      });

      const link = document.createElement('a');
      link.download = 'minisend-wrapped-2025.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading:', err);
      alert('Failed to download. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || !stats) return;

    setIsDownloading(true);
    try {
      // Generate image
      await new Promise(resolve => setTimeout(resolve, 500));
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0a0a0a',
        cacheBust: true,
        skipFonts: false,
      });

      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'minisend-wrapped-2025.png', { type: 'image/png' });

      const shareText = `Just checked my Minisend 2025 Wrapped! 🎉\n\n💸 Sent ${formatNumber(stats.totalUsdcSent)} USDC\n📊 ${stats.totalTransactions} ${stats.totalTransactions === 1 ? 'trade' : 'trades'}\n🏆 ${getRankText()}\n\nCheck yours at app.minisend.xyz/profile`;

      // Try native share
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          text: shareText,
          files: [file],
        });
      } else {
        // Fallback: Copy text and download image
        await navigator.clipboard.writeText(shareText);
        const link = document.createElement('a');
        link.download = 'minisend-wrapped-2025.png';
        link.href = dataUrl;
        link.click();
        alert('Image downloaded and share text copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      if ((err as Error).name !== 'AbortError') {
        alert('Failed to share. Please try again.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-medium text-white mb-2">Connect Wallet</h1>
            <p className="text-sm text-gray-400">Connect your wallet to view your wrapped stats</p>
          </div>
          <div className="flex justify-center">
            <ConnectWidget />
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getRankText = () => {
    if (!stats) return '';
    if (stats.percentile <= 10) {
      return `Top ${stats.percentile}%`;
    }
    return `#${stats.rank}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-2xl font-medium text-white mb-2">Minisend 2025 Wrapped </h1>
          <p className="text-sm text-gray-500 font-mono">
            {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
          </p>
        </div>

        {/* Wrapped Content */}
        {loading ? (
          <div className="p-20 text-center">
            <div className="animate-spin w-8 h-8 border border-gray-800 border-t-white rounded-full mx-auto"></div>
          </div>
        ) : error ? (
          <div className="p-12 border border-gray-800/50 rounded-2xl text-center bg-[#111]">
            <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : !stats?.hasTransactions ? (
          <div className="p-16 border border-gray-800/50 rounded-2xl text-center bg-[#111]">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <p className="text-gray-400 text-sm">No wrapped yet</p>
            <p className="text-gray-500 text-xs mt-1">Make your first transaction to see your 2025 wrapped</p>
          </div>
        ) : (
          <>
            {/* Wrapped Card - Optimized for Social Media Stories */}
            <div className="flex justify-center mb-6">
              <div ref={cardRef} className="w-full max-w-[440px] sm:max-w-[540px]">
                <div className="border border-gray-800/50 rounded-2xl p-6 sm:p-8 bg-[#111]">
                  {/* Header with Logo */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-0.5">Your 2025 Wrapped 🎉</h2>
                      <p className="text-[10px] text-gray-500">User since {stats.memberSince}</p>
                    </div>
                    <img
                      src="/minisend 7 transparent.png"
                      alt="Minisend"
                      className="h-14 w-auto"
                    />
                  </div>

                  {/* Main Stat */}
                  <div className="mb-5">
                    <p className="text-[10px] text-gray-500 mb-1.5">💸 TOTAL SENT</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold text-white">
                        {formatNumber(stats.totalUsdcSent)}
                      </span>
                      {usdcImage && (
                        <img src={usdcImage} alt="USDC" className="w-8 h-8 object-contain" />
                      )}
                    </div>
                  </div>

                  {/* Stats List */}
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">📊 {stats.totalTransactions === 1 ? 'Trade' : 'Trades'}</span>
                      <span className="text-lg font-bold text-white">{stats.totalTransactions}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">🏆 Rank</span>
                      <span className="text-lg font-bold text-white">{getRankText()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Single Trade</span>
                      <span className="text-sm font-semibold text-white">
                        ${formatNumber(stats.biggestTransaction.usdcAmount)} → {stats.biggestTransaction.currency} {formatNumber(stats.biggestTransaction.localAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Favorite Currency</span>
                      <span className="text-sm font-semibold text-white">
                        {stats.favoriteCurrency} ({stats.currencyUsagePercent}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Days Active</span>
                      <span className="text-lg font-bold text-white">{stats.daysActive}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Active Month</span>
                      <span className="text-sm font-semibold text-white">{stats.mostActiveMonth}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Chain</span>
                      {baseImage && (
                        <img src={baseImage} alt="Base" className="w-10 h-10 object-contain" />
                      )}
                    </div>

                    {/* Total Received */}
                    {(stats.totalReceived.KES > 0 || stats.totalReceived.NGN > 0 || stats.totalReceived.GHS > 0) && (
                      <>
                        <div className="pt-2.5 border-t border-gray-800/50">
                          <p className="text-[10px] text-gray-500 mb-2">TOTAL RECEIVED</p>
                          <div className="space-y-1.5">
                            {stats.totalReceived.KES > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">KES</span>
                                <span className="text-xs font-semibold text-white">{formatNumber(stats.totalReceived.KES)}</span>
                              </div>
                            )}
                            {stats.totalReceived.NGN > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">NGN</span>
                                <span className="text-xs font-semibold text-white">{formatNumber(stats.totalReceived.NGN)}</span>
                              </div>
                            )}
                            {stats.totalReceived.GHS > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">GHS</span>
                                <span className="text-xs font-semibold text-white">{formatNumber(stats.totalReceived.GHS)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="text-center pt-3 border-t border-gray-800/50">
                    <p className="text-[10px] text-gray-600">www.minisend.xyz</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-6 py-3 bg-[#8b53ff] text-white rounded-lg hover:bg-[#7a47e6] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                    Preparing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                disabled={isDownloading}
                className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
