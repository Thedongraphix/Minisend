"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PretiumReceiptProps {
  transactionCode: string;
  className?: string;
}

interface ReceiptData {
  ready: boolean;
  status: string;
  receiptNumber?: string;
  transactionCode?: string;
  recipientName?: string;
  amount?: number;
  currency?: string;
}

/**
 * Modern receipt component for Pretium transactions
 * Integrates directly with pretium_orders table via webhook
 */
export function PretiumReceipt({ transactionCode, className = '' }: PretiumReceiptProps) {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  // Check receipt status (polls until webhook data is received)
  const checkReceiptStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/pretium/receipt-status/${transactionCode}`);

      if (!response.ok) {
        throw new Error('Failed to check receipt status');
      }

      const data: ReceiptData = await response.json();
      setReceiptData(data);

      if (data.ready) {
        setIsChecking(false);
        return true; // Stop polling
      }

      return false; // Continue polling
    } catch (err) {
      console.error('[PretiumReceipt] Status check error:', err);
      setError('Unable to check receipt status');
      return false;
    }
  }, [transactionCode]);

  // Poll for receipt readiness
  useEffect(() => {
    if (!transactionCode) return;

    let pollInterval: NodeJS.Timeout;
    const maxAttempts = 20; // 20 attempts * 3 seconds = 60 seconds max

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsChecking(false);
        setError('Receipt is taking longer than expected');
        return;
      }

      const isReady = await checkReceiptStatus();

      if (!isReady) {
        setAttempts(prev => prev + 1);
        // Exponential backoff: 3s, 3s, 5s, 5s, 10s, 10s...
        const interval = attempts < 2 ? 3000 : attempts < 4 ? 5000 : 10000;
        pollInterval = setTimeout(poll, interval);
      }
    };

    // Initial check
    poll();

    return () => {
      if (pollInterval) clearTimeout(pollInterval);
    };
  }, [transactionCode, attempts, checkReceiptStatus]);

  // Download receipt PDF
  const downloadReceipt = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pretium/receipt/${transactionCode}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate receipt');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `minisend-receipt-${transactionCode}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PretiumReceipt] Download error:', err);
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`${className}`}>
      <AnimatePresence mode="wait">
        {isChecking ? (
          <motion.div
            key="checking"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Checking state */}
            <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl">
              <div className="relative flex items-center justify-center">
                <div className="w-5 h-5 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="absolute w-3 h-3 bg-purple-500/20 rounded-full animate-ping"></div>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-gray-200">Preparing your receipt...</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Waiting for M-Pesa confirmation
                </p>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="px-4">
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min((attempts / 20) * 100, 95)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This usually takes 5-10 seconds
              </p>
            </div>
          </motion.div>
        ) : receiptData?.ready ? (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            {/* Receipt ready card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/30 p-6">
              {/* Success icon with animation */}
              <div className="absolute top-4 right-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center"
                >
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              </div>

              {/* Receipt details */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-green-400">Receipt Ready!</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {receiptData.currency} {receiptData.amount?.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">To:</span>
                    <span className="text-gray-200 font-medium">{receiptData.recipientName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">M-Pesa Code:</span>
                    <span className="text-green-400 font-mono font-semibold">
                      {receiptData.receiptNumber}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Transaction ID:</span>
                    <span className="text-gray-300 font-mono text-xs">
                      {transactionCode.slice(0, 12)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Download button - NEW DESIGN */}
              <motion.button
                onClick={downloadReceipt}
                disabled={isDownloading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6 w-full relative overflow-hidden group"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-size-200 animate-gradient"></div>

                {/* Button content */}
                <div className="relative flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl border border-white/20">
                  {isDownloading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="font-bold text-white">Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <span className="font-bold text-white">Download Receipt</span>
                      <svg className="w-4 h-4 text-white/60 group-hover:translate-x-0.5 transition-transform"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </div>
              </motion.button>

              {/* Additional actions */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.open(`https://basescan.org/tx/${transactionCode}`, '_blank')}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-xl transition-colors group"
                >
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white">View on Base</span>
                </button>

                <button
                  onClick={downloadReceipt}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-xl transition-colors group"
                >
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white">Share</span>
                </button>
              </div>
            </div>

            {/* Success message */}
            <div className="text-center text-xs text-gray-500">
              Your transaction was successful and the receipt is ready for download
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl"
          >
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-400">Receipt Not Available</p>
                <p className="text-xs text-gray-400 mt-1">
                  {error || 'The receipt is not ready yet. Please wait a moment and try again.'}
                </p>
                <button
                  onClick={() => {
                    setIsChecking(true);
                    setAttempts(0);
                    setError(null);
                  }}
                  className="mt-3 text-xs font-medium text-red-400 hover:text-red-300 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact receipt button for use in lists/grids
 */
export function CompactReceiptButton({
  transactionCode,
  className = ''
}: {
  transactionCode: string;
  className?: string;
}) {
  const [isReady, setIsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/pretium/receipt-status/${transactionCode}`);
        const data = await response.json();

        if (data.ready) {
          setIsReady(true);
          setIsChecking(false);
        } else {
          // Poll again after 3 seconds
          setTimeout(checkStatus, 3000);
        }
      } catch {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [transactionCode]);

  const download = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/pretium/receipt/${transactionCode}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${transactionCode}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isChecking) {
    return (
      <button disabled className={`px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
      </button>
    );
  }

  if (!isReady) {
    return (
      <button disabled className={`px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg opacity-50 ${className}`}>
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={download}
      disabled={isDownloading}
      className={`px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border border-purple-500/50 rounded-lg transition-all ${className}`}
    >
      {isDownloading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : (
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      )}
    </button>
  );
}
