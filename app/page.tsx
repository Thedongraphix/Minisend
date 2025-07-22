"use client";

import {
  useMiniKit,
  useAddFrame,
} from "@coinbase/onchainkit/minikit";
// Wallet components removed - now handled in Home component
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import { Home } from "./components/DemoComponents";
import { Features } from "./components/DemoComponents";
import { OffRampFlow } from "./components/OffRampFlow";
import { initializeUserSession, trackEvent } from "@/lib/analytics";
import { getClientInfo } from "@/lib/sdk-actions";
import Image from 'next/image';
import "./theme.css";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  const addFrame = useAddFrame();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Initialize analytics session when context is available
  useEffect(() => {
    if (context && isFrameReady) {
      const session = initializeUserSession(context);
      const clientInfo = getClientInfo(context);
      
      trackEvent("app_loaded", {
        userId: session?.userId,
        clientName: clientInfo.clientName,
        isCoinbaseWallet: clientInfo.isCoinbaseWallet,
        isFrameAdded: clientInfo.isFrameAdded,
      });
    }
  }, [context, isFrameReady]);

  // Track tab changes for analytics
  useEffect(() => {
    if (context) {
      const clientInfo = getClientInfo(context);
      trackEvent("tab_changed", {
        userId: context.user?.fid ? `fid:${context.user.fid}` : undefined,
        tab: activeTab,
        clientName: clientInfo.clientName,
      });
    }
  }, [activeTab, context]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
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
  }, [context, frameAdded, handleAddFrame]);

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-sans mini-app-theme">
      {/* Main heading outside container */}
      <div className="w-full text-center py-6">
        <h1 className="text-2xl font-bold text-white">Kenya USDC Off-Ramp</h1>
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
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "features"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                Features
              </button>
              <button
                onClick={() => setActiveTab("offramp")}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "offramp"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                Off-Ramp
              </button>
            </div>
          </nav>
        )}

        <main className="flex-1">
          {activeTab === "home" && <Home setActiveTab={setActiveTab} />}
          {activeTab === "features" && <Features setActiveTab={setActiveTab} />}
          {activeTab === "offramp" && <OffRampFlow />}
        </main>

      </div>
      
      {/* Footer outside container */}
      <div className="w-full text-center px-4 py-4">
        <div className="flex items-center justify-center space-x-2">
          <Image 
            src="/Base_Network_Logo.svg" 
            alt="Base Network" 
            width={16}
            height={16}
          />
          <span className="text-sm text-gray-400">Built on Base with MiniKit</span>
        </div>
      </div>
    </div>
  );
}
