"use client";

import { useEffect, useState } from 'react';

interface PWAProviderProps {
  children: React.ReactNode;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Handle app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Check if app is already installed
    const checkIfInstalled = () => {
      if (typeof window !== 'undefined') {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const navigator = window.navigator as Navigator & { standalone?: boolean };
        const isIOSInstalled = navigator.standalone === true;
        setIsInstalled(isStandalone || isIOSInstalled);
      }
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check installation status
    checkIfInstalled();

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Expose PWA state to global context (optional)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const globalWindow = window as typeof window & {
        pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
        pwaIsInstallable?: boolean;
        pwaIsInstalled?: boolean;
      };
      globalWindow.pwaDeferredPrompt = deferredPrompt;
      globalWindow.pwaIsInstallable = isInstallable;
      globalWindow.pwaIsInstalled = isInstalled;
    }
  }, [deferredPrompt, isInstallable, isInstalled]);

  return <>{children}</>;
}

// Hook to use PWA functionality in components
export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const globalWindow = window as typeof window & {
        pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
        pwaIsInstallable?: boolean;
        pwaIsInstalled?: boolean;
      };
      setDeferredPrompt(globalWindow.pwaDeferredPrompt || null);
      setIsInstallable(globalWindow.pwaIsInstallable || false);
      setIsInstalled(globalWindow.pwaIsInstalled || false);
    }
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  return {
    isInstallable,
    isInstalled,
    installApp,
  };
}