"use client";

import { useState, useEffect } from 'react';
import { generateReceiptPDF } from '@/lib/receipt-generator';
import { OrderData } from '@/lib/types/order';
import { useOpenUrl } from '@coinbase/onchainkit/minikit';

interface DownloadButtonProps {
  orderData: OrderData;
  className?: string;
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
}

export function DownloadButton({
  orderData,
  className = '',
  variant = 'primary',
  size = 'md'
}: DownloadButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const openUrl = useOpenUrl();

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

  const downloadReceipt = async () => {
    if (!orderData) {
      setError('No transaction data available');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Get the base URL
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

      if (isInMiniApp) {
        // Farcaster Mini App: Use openUrl to open the receipt
        if (orderData.pretium_transaction_code) {
          // For Pretium transactions, use API endpoint
          const receiptUrl = `${baseUrl}/api/pretium/receipt/${orderData.pretium_transaction_code}`;
          await openUrl(receiptUrl);
        } else {
          // For other transactions, we need to generate locally first, then share
          // This is less ideal but necessary for non-Pretium orders
          const pdfBlob = await generateReceiptPDF(orderData);
          const date = new Date().toISOString().split('T')[0];
          const filename = `minisend-receipt-${orderData.id || 'transaction'}-${date}.pdf`;

          // Try Web Share API for locally generated PDFs
          if (navigator.share && navigator.canShare) {
            try {
              const file = new File([pdfBlob], filename, { type: 'application/pdf' });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                  files: [file],
                  title: 'Minisend Receipt',
                  text: 'Your transaction receipt from Minisend'
                });
                return;
              }
            } catch (err) {
              console.error('[DownloadButton] Web Share failed:', err);
              setError('Unable to share receipt. Please try again.');
            }
          } else {
            setError('Receipt sharing not supported in this environment.');
          }
        }
      } else {
        // Standard web browser: Use traditional download
        let pdfBlob: Blob;

        if (orderData.pretium_transaction_code) {
          const response = await fetch(`${baseUrl}/api/pretium/receipt/${orderData.pretium_transaction_code}`);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.hint || 'Failed to fetch receipt from server');
          }

          pdfBlob = await response.blob();
        } else {
          pdfBlob = await generateReceiptPDF(orderData);
        }

        const date = new Date().toISOString().split('T')[0];
        const filename = `minisend-receipt-${orderData.id || 'transaction'}-${date}.pdf`;
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
      }

    } catch (err) {
      console.error('[DownloadButton] Error:', err);
      setError('Failed to generate receipt. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Variant styles
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600',
    minimal: 'bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400'
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const baseStyles = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-2">
      <button
        onClick={downloadReceipt}
        disabled={generating}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      >
        {generating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Generating...</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>{isInMiniApp ? 'View Receipt' : 'Download Receipt'}</span>
          </>
        )}
      </button>
      
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function CompactReceiptButton({
  orderData,
  className = ''
}: {
  orderData: OrderData;
  className?: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const openUrl = useOpenUrl();

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

  const downloadReceipt = async () => {
    setGenerating(true);

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

      if (isInMiniApp) {
        // Farcaster Mini App: Use openUrl to open the receipt
        if (orderData.pretium_transaction_code) {
          const receiptUrl = `${baseUrl}/api/pretium/receipt/${orderData.pretium_transaction_code}`;
          await openUrl(receiptUrl);
        } else {
          // For other transactions, generate and share
          const pdfBlob = await generateReceiptPDF(orderData);
          const filename = `receipt-${orderData.id || Date.now()}.pdf`;

          if (navigator.share && navigator.canShare) {
            try {
              const file = new File([pdfBlob], filename, { type: 'application/pdf' });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                  files: [file],
                  title: 'Minisend Receipt',
                  text: 'Your transaction receipt'
                });
                return;
              }
            } catch (err) {
              console.error('[CompactReceiptButton] Web Share failed:', err);
            }
          }
        }
      } else {
        // Standard browser download
        let pdfBlob: Blob;

        if (orderData.pretium_transaction_code) {
          const response = await fetch(`${baseUrl}/api/pretium/receipt/${orderData.pretium_transaction_code}`);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.hint || 'Failed to fetch receipt');
          }

          pdfBlob = await response.blob();
        } else {
          pdfBlob = await generateReceiptPDF(orderData);
        }

        const filename = `receipt-${orderData.id || Date.now()}.pdf`;
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[CompactReceiptButton] Error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={downloadReceipt}
      disabled={generating}
      className={`p-2 text-gray-400 hover:text-purple-400 transition-colors ${className}`}
      title="Download Receipt"
    >
      {generating ? (
        <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
      )}
    </button>
  );
}


export function ReceiptSection({ 
  orderData, 
  className = '' 
}: { 
  orderData: OrderData; 
  className?: string; 
}) {
  if (!orderData) return null;

  return (
    <div className={`${className} space-y-3`}>
      <DownloadButton
        orderData={orderData}
        variant="primary"
        size="lg"
        className="w-full"
      />
    </div>
  );
}