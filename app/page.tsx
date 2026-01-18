"use client";

import {
  useMiniKit,
} from "@coinbase/onchainkit/minikit";
import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "./components/BaseComponents";
import { Icon } from "./components/BaseComponents";
import { Home } from "./components/BaseComponents";
import { Features } from "./components/BaseComponents";
import { ExchangeFlow } from "./components/ExchangeFlow";
import { SpendFlow } from "./components/SpendFlow";
import { SwapInterface } from "./components/SwapInterface";
import { ProfileView } from "./components/ProfileView";

import { DebugPanel } from "./components/DebugPanel";
import { AppProvider } from "./components/AppProvider";
import Image from 'next/image';
import "./theme.css";
import { ConnectWidget } from "./components/ConnectWidget";
import { WhatsAppButton } from "./components/WhatsAppButton";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [mounted, setMounted] = useState(false);
  const [showWhatsAppTooltip, setShowWhatsAppTooltip] = useState(false);
  const [addFrameError, setAddFrameError] = useState<string>("");
  const [showOfframpGuide, setShowOfframpGuide] = useState(false);
  const [showSpendGuide, setShowSpendGuide] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show guide cards on mount with staggered timing (only on home tab)
  useEffect(() => {
    if (mounted && activeTab === "home") {
      const hasSeenGuides = localStorage.getItem('minisend_guides_seen');
      if (hasSeenGuides) return;

      const timer1 = setTimeout(() => setShowOfframpGuide(true), 800);
      const timer2 = setTimeout(() => setShowSpendGuide(true), 1500);

      const hideTimer1 = setTimeout(() => setShowOfframpGuide(false), 7000);
      const hideTimer2 = setTimeout(() => setShowSpendGuide(false), 8000);

      localStorage.setItem('minisend_guides_seen', 'true');

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(hideTimer1);
        clearTimeout(hideTimer2);
      };
    }
  }, [mounted, activeTab]);

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => {
        setShowWhatsAppTooltip(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeTab, mounted]);

  const handleAddFrame = useCallback(async () => {
    try {
      setAddFrameError("");
      const response = await sdk.actions.addMiniApp();

      if (response.notificationDetails) {
        setFrameAdded(true);
      } else {
        setFrameAdded(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add mini app';
      setAddFrameError(errorMessage);
    }
  }, []);

  const saveFrameButton = useMemo(() => {
    if (!mounted) return null;
    if (context && !context.client.added) {
      return (
        <div className="flex flex-col items-end">
          <Button
            variant="ghost"
            size="medium"
            onClick={handleAddFrame}
            className="text-[var(--app-accent)] p-4"
            iconName="plus"
          >
            Save Minisend
          </Button>
          {addFrameError && (
            <div className="text-xs text-red-400 mt-1 px-4">
              {addFrameError}
            </div>
          )}
        </div>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [mounted, context, frameAdded, addFrameError, handleAddFrame]);

  if (!mounted) {
    return (
      <div className="flex flex-col min-h-screen bg-black text-white font-sans mini-app-theme">
        <div className="w-full text-center py-6">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="animate-pulse bg-gray-700 h-10 w-10 rounded"></div>
            <div className="animate-pulse bg-gray-700 h-8 w-24 rounded"></div>
          </div>
        </div>
        <div className="w-full max-w-md mx-auto px-4 pb-6">
          <div className="animate-pulse bg-gray-800 h-64 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <div className="flex flex-col min-h-screen bg-black text-white font-sans mini-app-theme overflow-visible">
        {/* Main heading outside container */}
        <div className="w-full py-6 px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <Image
                src="/minisend-white.png"
                alt="Minisend"
                width={130}
                height={130}
                className="flex-shrink-0"
              />
          
            </div>

            {/* Profile Icon / Connect Button in top right */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <ConnectWidget
                className="scale-75 sm:scale-100"
                onProfileClick={() => setActiveTab('profile')}
              />
            </div>
          </div>
        </div>

        {/* Service Disruption Banner 
        <div className="w-full max-w-md mx-auto px-4 mb-4">
          <div className="w-full bg-gradient-to-r from-amber-600 to-orange-600 p-4 rounded-xl shadow-lg border border-amber-500/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-white font-bold text-sm mb-1">Service Temporarily Unavailable</div>
                <div className="text-white/95 text-xs leading-relaxed">
                  We are currently experiencing a temporary service disruption. Our team is working to resolve the issue. We&apos;ll be back online soon.
                </div>
              </div>
            </div>
          </div>
        </div>
      */}
        {/* Wrapped 2025 Banner
        <div className="w-full max-w-md mx-auto px-4 mb-4">
          <Link href="/profile" className="block">
            <div className="w-full bg-gradient-to-r from-[#8b53ff] to-[#6b3fd9] p-4 rounded-xl hover:from-[#7a47e6] hover:to-[#5a35c8] transition-all duration-200 shadow-lg cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="text-white font-bold text-base mb-0.5">🎉 Your 2025 Wrapped is Ready!</div>
                  <div className="text-white/90 text-xs">Check your year in review</div>
                </div>
                <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
*/}
        <div className="w-full max-w-md mx-auto px-4 pb-6 overflow-visible">
          {saveFrameButton && (
            <div className="flex justify-end mb-4">
              {saveFrameButton}
            </div>
          )}

          <main className="flex-1 overflow-visible relative">
            {activeTab === "home" && <Home setActiveTab={setActiveTab} />}
            {activeTab === "features" && <Features setActiveTab={setActiveTab} />}
            {activeTab === "offramp" && <ExchangeFlow setActiveTab={setActiveTab} />}
            {activeTab === "spend" && <SpendFlow setActiveTab={setActiveTab} />}
            {activeTab === "swap" && <SwapInterface setActiveTab={setActiveTab} />}
            {activeTab === "profile" && <ProfileView setActiveTab={setActiveTab} />}
          </main>
        </div>

        {/* Footer outside container */}
        <div className="w-full text-center px-4 py-4">
          <div className="flex items-center justify-center">
            <Image
              src="/Base_lockup_2color.svg"
              alt="Built on Base"
              width={70}
              height={18}
              className="h-4 w-auto filter brightness-0 invert opacity-90"
            />
          </div>
        </div>

        <DebugPanel />
        <WhatsAppButton showTooltip={showWhatsAppTooltip} />

        {/* Feature Guide Cards - Bottom Left */}
        {(showOfframpGuide || showSpendGuide) && (
          <div className="fixed bottom-6 left-4 z-50 flex flex-col gap-3 max-w-[260px]">
            {showOfframpGuide && (
              <div
                className="animate-fade-in cursor-pointer"
                onClick={() => setShowOfframpGuide(false)}
              >
                <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl p-3.5 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-[#0066FF]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#0066FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold mb-1">Start Offramp</p>
                      <p className="text-[#8e8e93] text-xs leading-relaxed">Convert USDC to KES,NGN,UGX,GHS and receive to M-Pesa or bank</p>
                    </div>
                    <button
                      className="text-[#8e8e93] hover:text-white transition-colors p-0.5 -mr-1 -mt-1"
                      onClick={(e) => { e.stopPropagation(); setShowOfframpGuide(false); }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showSpendGuide && (
              <div
                className="animate-fade-in cursor-pointer"
                onClick={() => setShowSpendGuide(false)}
              >
                <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl p-3.5 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-[#0066FF]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#0066FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold mb-1">Pay with USDC</p>
                      <p className="text-[#8e8e93] text-xs leading-relaxed">Allows you to pay till numbers and paybills with USDC</p>
                    </div>
                    <button
                      className="text-[#8e8e93] hover:text-white transition-colors p-0.5 -mr-1 -mt-1"
                      onClick={(e) => { e.stopPropagation(); setShowSpendGuide(false); }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppProvider>
  );
}
