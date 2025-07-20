"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
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
import { NetworkTester } from "./components/NetworkTester";
import { WalletShowcase } from "./components/WalletShowcase";
import { WalletSelector } from "./components/WalletSelector";
import { initializeUserSession, trackEvent } from "@/lib/analytics";
import { useAppActions, getClientInfo } from "@/lib/sdk-actions";

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
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
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

        {/* Tab Navigation */}
        {(activeTab === "features" || activeTab === "offramp" || activeTab === "testing" || activeTab === "wallets") && (
          <nav className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("features")}
              className={`flex-1 px-2 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === "features"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setActiveTab("wallets")}
              className={`flex-1 px-2 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === "wallets"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Wallets
            </button>
            <button
              onClick={() => setActiveTab("offramp")}
              className={`flex-1 px-2 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === "offramp"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Off-Ramp
            </button>
            <button
              onClick={() => setActiveTab("testing")}
              className={`flex-1 px-2 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === "testing"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Testing
            </button>
          </nav>
        )}

        <main className="flex-1">
          {activeTab === "home" && <Home setActiveTab={setActiveTab} />}
          {activeTab === "features" && <Features setActiveTab={setActiveTab} />}
          {activeTab === "wallets" && <WalletShowcase />}
          {activeTab === "offramp" && <OffRampFlow />}
          {activeTab === "testing" && <NetworkTester />}
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
          <Button
            variant="ghost"
            size="medium"
            className="text-[var(--ock-text-foreground-muted)] text-xs"
            onClick={openDocs}
          >
            Built on Base with MiniKit
          </Button>
        </footer>
      </div>
    </div>
  );
}
