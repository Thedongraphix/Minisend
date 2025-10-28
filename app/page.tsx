"use client";

import {
  useMiniKit,
  useAddFrame,
} from "@coinbase/onchainkit/minikit";
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

  const addFrame = useAddFrame();

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
      const frameAdded = await addFrame();
      setFrameAdded(Boolean(frameAdded));
    } catch (error) {
      console.error('Frame add error:', error);
    }
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (!mounted) return null;
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="medium"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          iconName="plus"
        >
          Save Frame
        </Button>
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
  }, [mounted, context, frameAdded, handleAddFrame]);

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
              src="/minisend-logo.png" 
              alt="Minisend" 
              width={40}
              height={40}
              className="flex-shrink-0"
            />
            <h1 className="text-2xl font-bold text-white truncate">Minisend</h1>
          </div>
          
          {/* Wallet Island and Leaderboard in top right */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2"> 
            {/*<button
              onClick={() => setActiveTab("leaderboard")}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-200"
              title="View Leaderboard"
            >
              <svg className="w-5 h-5 sm:w-5 sm:h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button> 
            */}
            <ConnectWidget 
              className="scale-75 sm:scale-100"
            />
          </div>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto px-4 pb-6 overflow-visible">
        {saveFrameButton && (
          <div className="flex justify-end mb-4">
            {saveFrameButton}
          </div>
        )}

        {/* Tab Navigation */}
        {(activeTab === "features" || activeTab === "offramp") && (
          <nav className="mb-8">
            <div className="flex bg-gray-900 rounded-lg p-1 space-x-1">
              <button
                onClick={() => setActiveTab("features")}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "features"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                Features
              </button>
              <button
                onClick={() => setActiveTab("offramp")}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "offramp"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                Cash Out
              </button>
            </div>
          </nav>
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
