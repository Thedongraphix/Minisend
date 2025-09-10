"use client";

import { useState, useEffect } from 'react';
import { usePWA } from './PWAProvider';
import { Button } from './DemoComponents';

export function PWAInstallPrompt({ className = '' }: { className?: string }) {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(isIOSDevice);
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else if (isInstallable) {
      await installApp();
    }
  };

  const IOSInstructionsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--app-gray)] rounded-lg p-6 max-w-xs w-full border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Install Minisend</h3>
          <button
            onClick={() => setShowIOSInstructions(false)}
            className="text-gray-400"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-[var(--app-accent)] rounded-full flex items-center justify-center text-white text-xs font-semibold">
              1
            </div>
            <span className="text-gray-300">Tap Share</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-[var(--app-accent)] rounded-full flex items-center justify-center text-white text-xs font-semibold">
              2
            </div>
            <span className="text-gray-300">Add to Home Screen</span>
          </div>
        </div>
        
        <Button
          variant="primary"
          size="medium"
          onClick={() => setShowIOSInstructions(false)}
          className="w-full mt-4"
        >
          Got it
        </Button>
      </div>
    </div>
  );

  if (isInstalled) return null;

  if (isInstallable || isIOS) {
    return (
      <>
        <Button
          variant="ghost"
          size="medium"
          onClick={handleInstallClick}
          className={`text-[var(--app-accent)] hover:text-[var(--app-accent-hover)] ${className}`}
          iconName="plus"
        >
          Install
        </Button>
        {showIOSInstructions && <IOSInstructionsModal />}
      </>
    );
  }

  return null;
}