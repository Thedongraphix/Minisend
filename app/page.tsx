"use client";

import {
  useMiniKit,
  useAddFrame,
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import { Home } from "./components/DemoComponents";
import { Features } from "./components/DemoComponents";
import { OffRampFlow } from "./components/OffRampFlow";
import { WalletSelector } from "./components/WalletSelector";
import { initializeUserSession, trackEvent } from "@/lib/analytics";
import { useAppActions, getClientInfo } from "@/lib/sdk-actions";
import Image from 'next/image';
import "./theme.css";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  const addFrame = useAddFrame();
  const { shareApp, openDocs } = useAppActions();

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
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div>
            <div className="flex items-center space-x-2">
              {/* Show MiniKit wallet if in frame context, otherwise show custom wallet selector */}
              {context ? (
                <Wallet className="z-10">
                  <ConnectWallet>
                    <Avatar className="h-6 w-6" />
                    <Name className="text-inherit" />
                  </ConnectWallet>
                  <WalletDropdown>
                    <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                      <Avatar />
                      <Name />
                      <Address />
                      <EthBalance />
                    </Identity>
                    <WalletDropdownDisconnect />
                  </WalletDropdown>
                </Wallet>
              ) : (
                <WalletSelector />
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Share button */}
            <Button
              variant="ghost"
              size="medium"
              onClick={shareApp}
              className="text-[var(--app-accent)] p-2"
              iconName="sparkles"
            >
              Share
            </Button>
            {saveFrameButton}
          </div>
        </header>

        {/* Premium Tab Navigation */}
        {(activeTab === "features" || activeTab === "offramp") && (
          <nav className="relative mb-6">
            <div className="relative rounded-2xl card-shadow-lg overflow-hidden">
              {/* Premium background */}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-black to-gray-800">
                <div className="absolute inset-0 gradient-mesh opacity-30"></div>
              </div>
              
              {/* Tab content */}
              <div className="relative flex p-1.5 space-x-1">
                <button
                  onClick={() => setActiveTab("features")}
                  className={`flex-1 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                    activeTab === "features"
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>⚡</span>
                    <span>Features</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("offramp")}
                  className={`flex-1 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                    activeTab === "offramp"
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>💰</span>
                    <span>Off-Ramp</span>
                  </div>
                </button>
              </div>
              
              {/* Subtle border */}
              <div className="absolute inset-0 rounded-2xl border border-white/10"></div>
            </div>
          </nav>
        )}

        <main className="flex-1">
          {activeTab === "home" && <Home setActiveTab={setActiveTab} />}
          {activeTab === "features" && <Features setActiveTab={setActiveTab} />}
          {activeTab === "offramp" && <OffRampFlow />}
        </main>

        <footer className="mt-6 pt-4 flex justify-center">
          <div className="relative rounded-xl card-shadow overflow-hidden">
            {/* Premium footer background */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800">
              <div className="absolute inset-0 gradient-mesh opacity-20"></div>
            </div>
            
            {/* Footer content */}
            <button
              onClick={openDocs}
              className="relative flex items-center space-x-2 text-gray-400 hover:text-white text-xs p-3 transition-all duration-300"
            >
              <Image 
                src="/Base_Network_Logo.svg" 
                alt="Base Network" 
                width={12}
                height={12}
                className="opacity-60"
              />
              <span>Built on Base with MiniKit</span>
            </button>
            
            {/* Subtle border */}
            <div className="absolute inset-0 rounded-xl border border-white/10"></div>
          </div>
        </footer>
      </div>
    </div>
  );
}
