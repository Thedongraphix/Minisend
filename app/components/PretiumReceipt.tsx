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
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [attempts, setAttempts] = useState(0);

  // Detect miniapp environment
  useEffect(() => {
    const checkMiniAppEnvironment = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp);
      } catch {
        setIsInMiniApp(false);
      }
    };
    checkMiniAppEnvironment();
  }, []);

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
      return false;
    }
  }, [transactionCode]);

  // Poll for receipt readiness - improved polling logic
  useEffect(() => {
    if (!transactionCode) return;

    let pollTimeout: NodeJS.Timeout;
    let currentAttempt = 0;
    const maxAttempts = 30; // Increased to 30 attempts for longer polling
    let isCancelled = false;

    const poll = async () => {
      if (isCancelled) return;

      if (currentAttempt >= maxAttempts) {
        console.log('[PretiumReceipt] Polling timed out after', currentAttempt, 'attempts');
        setIsChecking(false);
        setAttempts(currentAttempt);
        return;
      }

      console.log('[PretiumReceipt] Polling attempt', currentAttempt + 1, 'of', maxAttempts);
      const isReady = await checkReceiptStatus();

      if (isReady) {
        console.log('[PretiumReceipt] Receipt ready!');
        setAttempts(currentAttempt);
        return;
      }

      if (isCancelled) return;

      currentAttempt++;
      setAttempts(currentAttempt);

      // Exponential backoff: 2s, 2s, 3s, 3s, 5s, 5s, then 10s for the rest
      let interval = 10000; // default 10s
      if (currentAttempt < 2) interval = 2000;
      else if (currentAttempt < 4) interval = 3000;
      else if (currentAttempt < 6) interval = 5000;

      console.log('[PretiumReceipt] Next check in', interval / 1000, 'seconds');
      pollTimeout = setTimeout(poll, interval);
    };

    // Start polling immediately
    poll();

    return () => {
      isCancelled = true;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [transactionCode, checkReceiptStatus]);

  // Download receipt PDF
  const downloadReceipt = async () => {
    setIsDownloading(true);

    // Open window immediately to avoid popup blocker (only for Mini App)
    let newWindow: Window | null = null;
    if (isInMiniApp) {
      // Open blank window immediately while in user action context
      newWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');
    }

    try {
      const response = await fetch(`/api/pretium/receipt/${transactionCode}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate receipt');
      }

      const blob = await response.blob();
      const filename = `minisend-receipt-${transactionCode}.pdf`;

      // Farcaster Mini App: Use Web Share API or open in new window
      if (isInMiniApp) {
        // Try Web Share API first (works on mobile)
        if (navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], filename, { type: 'application/pdf' });

            if (navigator.canShare({ files: [file] })) {
              // Close the blank window we opened earlier
              if (newWindow) {
                newWindow.close();
              }

              await navigator.share({
                files: [file],
                title: 'Minisend Receipt',
                text: 'Your transaction receipt from Minisend'
              });
              return;
            }
          } catch {
            // Share API failed, fall through to alternative
          }
        }

        // Fallback: Use the window we already opened
        if (newWindow && !newWindow.closed) {
          const pdfUrl = URL.createObjectURL(blob);
          newWindow.location.href = pdfUrl;

          // Cleanup after a delay
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
        } else {
          // Window was blocked or closed, show error
          console.error('[PretiumReceipt] Popup was blocked. Please allow popups to view receipts.');
        }

      } else {
        // Standard web browser: Use traditional download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[PretiumReceipt] Download error:', err);
      // Close window on error
      if (newWindow && !newWindow.closed) {
        newWindow.close();
      }
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
          >
            <div className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <p className="text-sm text-gray-300">Preparing receipt...</p>
            </div>
          </motion.div>
        ) : receiptData?.ready ? (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="space-y-3">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                {/* Only show transaction code for KES and GHS, not NGN */}
                {receiptData.currency !== 'NGN' && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">
                      {receiptData.currency === 'GHS' ? 'Mobile Money Code' : 'M-Pesa Code'}
                    </span>
                    <span className="text-white font-mono font-semibold">{receiptData.receiptNumber}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">
                    {receiptData.currency === 'NGN' ? 'Sent to' : 'Recipient'}
                  </span>
                  <span className="text-gray-200 text-sm">{receiptData.recipientName}</span>
                </div>
                {receiptData.currency === 'NGN' && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Amount</span>
                    <span className="text-white font-semibold">₦{receiptData.amount?.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <button
                onClick={downloadReceipt}
                disabled={isDownloading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <span>{isInMiniApp ? 'View Receipt' : 'Download Receipt'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-sm text-gray-300 text-center">Receipt not ready yet</p>
              <button
                onClick={() => {
                  setIsChecking(true);
                  setAttempts(0);
                }}
                className="mt-3 w-full text-sm text-purple-400 hover:text-purple-300"
              >
                Try again
              </button>
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
  const [isInMiniApp, setIsInMiniApp] = useState(false);

  // Detect miniapp environment
  useEffect(() => {
    const checkMiniAppEnvironment = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp);
      } catch {
        setIsInMiniApp(false);
      }
    };
    checkMiniAppEnvironment();
  }, []);

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

    // Open window immediately to avoid popup blocker (only for Mini App)
    let newWindow: Window | null = null;
    if (isInMiniApp) {
      newWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');
    }

    try {
      const response = await fetch(`/api/pretium/receipt/${transactionCode}`);
      const blob = await response.blob();
      const filename = `receipt-${transactionCode}.pdf`;

      if (isInMiniApp) {
        // Farcaster Mini App: Use Web Share API or open in new window
        if (navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], filename, { type: 'application/pdf' });
            if (navigator.canShare({ files: [file] })) {
              // Close the blank window
              if (newWindow) {
                newWindow.close();
              }
              await navigator.share({
                files: [file],
                title: 'Minisend Receipt',
                text: 'Your transaction receipt'
              });
              return;
            }
          } catch {
            // Fall through to window.open
          }
        }

        // Fallback: Use the window we already opened
        if (newWindow && !newWindow.closed) {
          const pdfUrl = URL.createObjectURL(blob);
          newWindow.location.href = pdfUrl;
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
        }

      } else {
        // Standard browser download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[CompactReceiptButton] Download error:', err);
      // Close window on error
      if (newWindow && !newWindow.closed) {
        newWindow.close();
      }
    } finally {
      setIsDownloading(false);
    }
  };

  if (isChecking) {
    return (
      <button disabled className={`px-3 py-2 bg-white/5 border border-white/10 rounded-xl ${className}`}>
        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </button>
    );
  }

  if (!isReady) {
    return (
      <button disabled className={`px-3 py-2 bg-white/5 border border-white/10 rounded-xl opacity-50 ${className}`}>
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={download}
      disabled={isDownloading}
      className={`px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors ${className}`}
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
