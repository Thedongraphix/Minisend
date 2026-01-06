'use client';

import { useEffect } from 'react';

export default function SharePage() {
  useEffect(() => {
    // Redirect to main app after a brief moment
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <img
            src="https://app.minisend.xyz/icon.png"
            alt="Minisend Logo"
            className="w-20 h-20 mx-auto mb-4 rounded-full"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Minisend
          </h1>
          <p className="text-gray-600 mb-4">
            Convert USDC to KES or NGN instantly
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Redirecting to app...
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}