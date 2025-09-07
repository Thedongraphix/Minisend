"use client";

import { useState } from 'react';
import { generateReceiptPDF } from '@/lib/receipt-generator';
import { OrderData } from '@/lib/types/order';

interface ReceiptDownloadButtonProps {
  orderData: OrderData;
  className?: string;
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
}

export function ReceiptDownloadButton({ 
  orderData, 
  className = '',
  variant = 'primary',
  size = 'md'
}: ReceiptDownloadButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadReceipt = async () => {
    if (!orderData) {
      setError('No transaction data available');
      return;
    }

    setGenerating(true);
    setError(null);
    
    try {
      // Generate the PDF receipt
      const pdfBlob = await generateReceiptPDF(orderData);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Create filename with timestamp
      const date = new Date().toISOString().split('T')[0];
      const filename = `minisend-receipt-${orderData.id || 'transaction'}-${date}.pdf`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Failed to generate receipt:', err);
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

  const baseStyles = 'inline-flex items-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

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
            <span>Download Receipt</span>
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

  const downloadReceipt = async () => {
    setGenerating(true);
    
    try {
      const pdfBlob = await generateReceiptPDF(orderData);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${orderData.id || Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate receipt:', error);
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

// Receipt section for success pages - minimal version
export function ReceiptSection({ 
  orderData, 
  className = '' 
}: { 
  orderData: OrderData; 
  className?: string; 
}) {
  if (!orderData) return null;

  return (
    <div className={className}>
      <ReceiptDownloadButton 
        orderData={orderData}
        variant="primary"
        size="lg"
        className="w-full"
      />
    </div>
  );
}