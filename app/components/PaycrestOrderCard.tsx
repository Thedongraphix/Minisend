"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PaycrestOrder {
  id: string;
  receiveAddress: string;
  validUntil: string;
  senderFee: string;
  transactionFee: string;
  totalAmount: string;
  status: string;
  recipient: {
    phoneNumber: string;
    accountName: string;
    provider: string;
  };
}

interface PaycrestOrderCardProps {
  order: PaycrestOrder;
  usdcAmount: number;
  kshAmount: number;
  onComplete: () => void;
}

export function PaycrestOrderCard({ order, usdcAmount, kshAmount, onComplete }: PaycrestOrderCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [orderStatus, setOrderStatus] = useState(order.status);

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const validUntil = new Date(order.validUntil).getTime();
      const difference = validUntil - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('Expired');
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [order.validUntil]);

  // Poll for order status updates
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/paycrest/orders?orderId=${order.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.order.status !== orderStatus) {
            setOrderStatus(data.order.status);
            if (data.order.status === 'validated') {
              onComplete();
            }
          }
        }
      } catch (error) {
        console.error('Error polling order status:', error);
      }
    };

    // Poll every 10 seconds
    const interval = setInterval(pollStatus, 10000);
    return () => clearInterval(interval);
  }, [order.id, orderStatus, onComplete]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-400/30';
      case 'validated': return 'text-green-400 bg-green-500/20 border-green-400/30';
      case 'settled': return 'text-blue-400 bg-blue-500/20 border-blue-400/30';
      case 'expired': return 'text-red-400 bg-red-500/20 border-red-400/30';
      case 'refunded': return 'text-orange-400 bg-orange-500/20 border-orange-400/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-400/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting for payment';
      case 'validated': return 'Payment confirmed - KSH sent!';
      case 'settled': return 'Completed on blockchain';
      case 'expired': return 'Order expired';
      case 'refunded': return 'Payment refunded';
      default: return status;
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative rounded-3xl card-shadow-lg overflow-hidden">
        {/* Premium background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
          <div className="absolute inset-0 gradient-mesh opacity-40"></div>
          
          {/* Floating elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-6 right-6 w-16 h-16 border border-blue-400 rounded-full animate-pulse"></div>
            <div className="absolute bottom-8 left-8 w-10 h-10 border border-purple-400 rounded-full"></div>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">⚡</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Send USDC Payment</h3>
            </div>
            
            {/* Timer */}
            <div className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
              timeLeft === 'Expired' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {timeLeft === 'Expired' ? 'Expired' : `⏰ ${timeLeft}`}
            </div>
          </div>

          {/* Status Indicator */}
          <div className={`mb-6 p-3 rounded-xl border ${getStatusColor(orderStatus)}`}>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                orderStatus === 'pending' ? 'animate-pulse bg-yellow-400' : 
                orderStatus === 'validated' ? 'bg-green-400' :
                orderStatus === 'settled' ? 'bg-blue-400' :
                orderStatus === 'expired' ? 'bg-red-400' :
                'bg-orange-400'
              }`}></div>
              <span className="font-bold text-sm">{getStatusText(orderStatus)}</span>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="space-y-4">
            {/* Amount to Send */}
            <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-400/30">
              <h4 className="text-blue-300 font-bold text-sm mb-2">💰 Send Exactly</h4>
              <div className="text-2xl font-bold text-white mb-1">{order.totalAmount} USDC</div>
              <div className="text-blue-200 text-xs">
                Base amount: ${usdcAmount} + Fees: ${(parseFloat(order.senderFee) + parseFloat(order.transactionFee)).toFixed(6)}
              </div>
            </div>

            {/* Receive Address */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-gray-300 font-bold text-sm">📍 Send to Address</h4>
                <button
                  onClick={() => copyToClipboard(order.receiveAddress)}
                  className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
                >
                  {copied ? '✅ Copied' : '📋 Copy'}
                </button>
              </div>
              <div className="font-mono text-sm text-white bg-black/50 p-3 rounded-lg border border-white/20 break-all">
                {order.receiveAddress}
              </div>
            </div>

            {/* Network Info */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Network</span>
                <div className="flex items-center space-x-2">
                  <Image 
                    src="/Base_Network_Logo.svg" 
                    alt="Base Network" 
                    width={16}
                    height={16}
                  />
                  <span className="text-white font-medium text-sm">Base</span>
                </div>
              </div>
            </div>

            {/* Recipient Info */}
            <div className="bg-green-500/10 p-4 rounded-xl border border-green-400/20">
              <h4 className="text-green-300 font-bold text-sm mb-2">📱 Will send KSH to</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Name</span>
                  <span className="text-white font-medium">{order.recipient.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Phone</span>
                  <span className="text-white font-mono">{order.recipient.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Amount</span>
                  <span className="text-green-400 font-bold">KSH {kshAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-400/20 rounded-xl">
            <h4 className="font-bold text-yellow-300 mb-3 text-sm">📋 Instructions:</h4>
            <ol className="text-gray-300 text-xs space-y-2">
              <li className="flex items-start space-x-2">
                <span className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <span>Open your wallet and send <strong className="text-white">{order.totalAmount} USDC</strong> to the address above</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <span>Make sure you&apos;re sending on <strong className="text-white">Base network</strong></span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <span>KSH will be sent to M-Pesa once payment is confirmed</span>
              </li>
            </ol>
          </div>

          {/* Order ID */}
          <div className="mt-4 text-center">
            <span className="text-gray-400 text-xs">Order ID: </span>
            <span className="text-gray-300 text-xs font-mono">{order.id}</span>
          </div>
        </div>
        
        {/* Subtle border */}
        <div className="absolute inset-0 rounded-3xl border border-white/10"></div>
      </div>
    </div>
  );
}