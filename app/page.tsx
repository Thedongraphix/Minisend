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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 font-inter antialiased">
      {/* Premium background with subtle pattern overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/40 to-slate-950"></div>
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      
      <div className="relative w-full max-w-md mx-auto px-6 py-4 z-10">
        {/* Premium header with glassmorphism */}
        <header className="flex justify-between items-center mb-6 p-4 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
          <div>
            <div className="flex items-center space-x-3">
              {/* Premium wallet interface */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-medium text-slate-400">Live</span>
              </div>
              {context ? (
                <Wallet className="z-10 [&>button]:bg-gradient-to-r [&>button]:from-blue-600 [&>button]:to-blue-500 [&>button]:border-blue-400/50 [&>button]:text-white [&>button]:font-medium [&>button]:shadow-lg [&>button]:backdrop-blur-sm">
                  <ConnectWallet>
                    <Avatar className="h-8 w-8 ring-2 ring-blue-400/50" />
                    <Name className="text-slate-100 font-medium" />
                  </ConnectWallet>
                  <WalletDropdown>
                    <Identity className="px-4 pt-3 pb-2 bg-slate-800/95 backdrop-blur-sm" hasCopyAddressOnClick>
                      <Avatar />
                      <Name className="text-slate-100" />
                      <Address className="text-slate-400" />
                      <EthBalance className="text-emerald-400" />
                    </Identity>
                    <WalletDropdownDisconnect className="text-red-400 hover:bg-red-500/10" />
                  </WalletDropdown>
                </Wallet>
              ) : (
                <WalletSelector />
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Premium share button */}
            <button
              onClick={shareApp}
              className="relative overflow-hidden px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium text-sm shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-300 opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <span className="relative flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span>Share</span>
              </span>
            </button>
            {saveFrameButton}
          </div>
        </header>

        {/* Premium tab navigation */}
        {activeTab !== "home" && (
          <nav className="flex space-x-1 mb-6 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-1.5 rounded-2xl shadow-2xl">
            <button
              onClick={() => setActiveTab("features")}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden group ${
                activeTab === "features"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              {activeTab === "features" && <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-300 opacity-20"></div>}
              <span className="relative">Features</span>
            </button>
            <button
              onClick={() => setActiveTab("wallets")}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden group ${
                activeTab === "wallets"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              {activeTab === "wallets" && <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-300 opacity-20"></div>}
              <span className="relative">Wallets</span>
            </button>
            <button
              onClick={() => setActiveTab("offramp")}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden group ${
                activeTab === "offramp"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              {activeTab === "offramp" && <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-300 opacity-20"></div>}
              <span className="relative">Off-Ramp</span>
            </button>
            <button
              onClick={() => setActiveTab("testing")}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden group ${
                activeTab === "testing"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              {activeTab === "testing" && <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-300 opacity-20"></div>}
              <span className="relative">Testing</span>
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

        {/* Premium footer */}
        <footer className="mt-8 pt-6 flex justify-center border-t border-slate-700/50">
          <button
            onClick={openDocs}
            className="text-slate-400 text-xs hover:text-slate-300 transition-colors duration-200 flex items-center space-x-2 group"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 group-hover:bg-blue-400 transition-colors"></span>
            <span>Built on Base with MiniKit</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
