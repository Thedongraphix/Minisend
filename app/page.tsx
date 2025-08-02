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
import { initializeUserSession, trackEvent } from "@/lib/analytics";
import { getClientInfo } from "@/lib/sdk-actions";
import Image from 'next/image';
import "./theme.css";

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
    if (!mounted) return;
    
    const initializeFrame = async () => {
      // Detect mobile for optimized handling
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      console.log('MiniKit - Frame ready status:', isFrameReady);
      console.log('MiniKit - Context:', context);
      console.log('MiniKit - Mobile detected:', isMobile);
      
      if (!isFrameReady) {
        try {
          // For mobile, add preventive measures against gesture conflicts
          if (isMobile) {
            // Prevent default touch behaviors that might interfere with wallet connection
            document.body.style.touchAction = 'pan-x pan-y';
            document.body.style.userSelect = 'none';
            
            // Add mobile-specific meta tags to prevent zooming during wallet connection
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
              viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            }
          }
          
          // Initialize frame with mobile optimizations
          await setFrameReady();
          console.log('MiniKit - Frame marked as ready with mobile optimizations');
          
        } catch (error) {
          console.error('MiniKit - Frame initialization error:', error);
          
          // Fallback initialization for mobile
          if (isMobile) {
            setTimeout(async () => {
              try {
                await setFrameReady();
                console.log('MiniKit - Mobile fallback initialization succeeded');
              } catch (fallbackError) {
                console.error('MiniKit - Mobile fallback initialization failed:', fallbackError);
              }
            }, 1000);
          }
        }
      }
    };

    initializeFrame();
  }, [mounted, setFrameReady, isFrameReady, context]);

  // Initialize analytics session when context is available
  useEffect(() => {
    if (!mounted || !context || !isFrameReady) return;
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
  }, [mounted, context, isFrameReady]);

  // Track tab changes for analytics
  useEffect(() => {
    if (!mounted || !context) return;
    if (context) {
      const clientInfo = getClientInfo(context);
      trackEvent("tab_changed", {
        userId: context.user?.fid ? `fid:${context.user.fid}` : undefined,
        tab: activeTab,
        clientName: clientInfo.clientName,
      });
    }
  }, [mounted, activeTab, context]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
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
    <div className="flex flex-col min-h-screen bg-black text-white font-sans mini-app-theme">
      {/* Main heading outside container */}
      <div className="w-full text-center py-6">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <Image 
            src="/minisend-logo.png" 
            alt="Minisend" 
            width={40}
            height={40}
          />
          <h1 className="text-2xl font-bold text-white">Minisend</h1>
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
          {activeTab === "offramp" && <SimpleOffRampFlow />}
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
