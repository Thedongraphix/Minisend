"use client";

import {
  useMiniKit,
} from "@coinbase/onchainkit/minikit";
import { sdk } from "@farcaster/miniapp-sdk";
// Wallet components removed since we don't show wallet connection in main page anymore
// Wallet components removed - now handled in Home component
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
// Analytics imports removed - not used in current implementation
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

  useEffect(() => {
    setMounted(true);
  }, []);

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
                src="/logo.svg"
                alt="Minisend"
                width={40}
                height={40}
                className="flex-shrink-0"
              />
              <h1 className="text-2xl font-bold text-white truncate">Minisend</h1>
            </div>

            {/* Wallet Island in top right */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <ConnectWidget
                className="scale-75 sm:scale-100"
              />
            </div>
          </div>
        </div>

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
      </div>
    </AppProvider>
  );
}
