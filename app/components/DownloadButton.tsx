"use client";

import { useState, useEffect } from 'react';
import { generateReceiptPDF } from '@/lib/receipt-generator';
import { OrderData } from '@/lib/types/order';

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
      const pdfBlob = await generateReceiptPDF(orderData);
      const date = new Date().toISOString().split('T')[0];
      const filename = `minisend-receipt-${orderData.id || 'transaction'}-${date}.pdf`;

      // Farcaster Mini App: Use Web Share API or open in new window
      if (isInMiniApp) {
        // Try Web Share API first (works on mobile)
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
          } catch {
            // Share API failed, fall through to alternative
          }
        }

        // Fallback: Open PDF in new window/tab (works in Farcaster)
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');

        // Cleanup after a delay
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);

      } else {
        // Standard web browser: Use traditional download
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
      }

    } catch {
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
      const pdfBlob = await generateReceiptPDF(orderData);
      const filename = `receipt-${orderData.id || Date.now()}.pdf`;

      if (isInMiniApp) {
        // Farcaster Mini App: Use Web Share API or open in new window
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
          } catch {
            // Fall through to window.open
          }
        }

        // Fallback: Open in new window
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);

      } else {
        // Standard browser download
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
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