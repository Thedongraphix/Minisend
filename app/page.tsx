"use client";

import {
  useMiniKit,
  useAddFrame,
} from "@coinbase/onchainkit/minikit";
// Wallet components removed since we don't show wallet connection in main page anymore
// Wallet components removed - now handled in Home component
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import { Home } from "./components/DemoComponents";
import { Features } from "./components/DemoComponents";
import { SimpleOffRampFlow } from "./components/SimpleOffRampFlow";
import { SpendUSDCFlow } from "./components/SpendUSDCFlow";
import { SwapComponent } from "./components/SwapComponent";
import { UserProfile } from "./components/UserProfile";
import { WalletDebug } from "./components/WalletDebug";
import { PWAProvider } from "./components/PWAProvider";
import { initializeUserSession, trackEvent } from "@/lib/analytics";
import { getClientInfo } from "@/lib/sdk-actions";
import Image from 'next/image';
import "./theme.css";
import { WalletIsland } from "./components/WalletIsland";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [mounted, setMounted] = useState(false);

  const addFrame = useAddFrame();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

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
    <PWAProvider>
      <div className="flex flex-col min-h-screen bg-black text-white font-sans mini-app-theme">
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
          
          {/* Wallet Island in top right */}
          <div className="flex items-center flex-shrink-0 ml-2">
            <WalletIsland 
              className="scale-75 sm:scale-100"
            />
          </div>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto px-4 pb-6">
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

        <main className="flex-1">
          {activeTab === "home" && <Home setActiveTab={setActiveTab} />}
          {activeTab === "features" && <Features setActiveTab={setActiveTab} />}
          {activeTab === "offramp" && <SimpleOffRampFlow setActiveTab={setActiveTab} />}
          {activeTab === "spend" && <SpendUSDCFlow setActiveTab={setActiveTab} />}
          {activeTab === "swap" && <SwapComponent setActiveTab={setActiveTab} />}
          {activeTab === "profile" && <UserProfile setActiveTab={setActiveTab} />}
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
      
      <WalletDebug />
      </div>
    </PWAProvider>
  );
}
