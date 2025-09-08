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
import { MobileWalletHandler } from "./components/MobileWalletHandler";
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
      // Enhanced mobile detection
      const isMobile = typeof window !== 'undefined' && (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768
      );
      
      const isInFrame = typeof window !== 'undefined' && window.parent !== window;
      const isCoinbaseWallet = typeof window !== 'undefined' && (
        context?.user?.fid !== undefined || 
        window.location.href.includes('coinbase') ||
        navigator.userAgent.includes('CoinbaseWallet')
      );
      
      console.log('🖼️ Frame initialization:', {
        isFrameReady,
        isMobile,
        isInFrame,
        isCoinbaseWallet,
        context: context ? 'available' : 'unavailable',
        userAgent: navigator.userAgent.substring(0, 100)
      });
      
      if (!isFrameReady) {
        try {
          // Pre-initialization mobile optimizations
          if (isMobile) {
            // Optimize viewport for mobile frame context
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
              viewport.setAttribute('content', 
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
              );
            }
            
            // Prevent gesture conflicts during frame initialization
            document.body.style.touchAction = 'manipulation';
            document.body.style.userSelect = 'none';
            document.body.style.setProperty('-webkit-user-select', 'none');
            document.body.style.setProperty('-webkit-touch-callout', 'none');
            
            // Add mobile-specific frame ready delay
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Enhanced frame initialization with timeout
          const frameInitPromise = setFrameReady();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Frame initialization timeout')), 10000)
          );
          
          await Promise.race([frameInitPromise, timeoutPromise]);
          console.log('✅ Frame marked as ready successfully');
          
        } catch (error) {
          console.error('❌ Frame initialization error:', error);
          
          // Enhanced fallback with multiple retry strategies
          if (isMobile || isInFrame) {
            const retryStrategies = [
              { delay: 1000, timeout: 8000 },
              { delay: 2000, timeout: 5000 },
              { delay: 3000, timeout: 3000 }
            ];
            
            for (const [index, strategy] of retryStrategies.entries()) {
              try {
                console.log(`🔄 Attempting frame initialization retry ${index + 1}...`);
                
                await new Promise(resolve => setTimeout(resolve, strategy.delay));
                
                const retryPromise = setFrameReady();
                const retryTimeout = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Retry timeout')), strategy.timeout)
                );
                
                await Promise.race([retryPromise, retryTimeout]);
                console.log(`✅ Frame initialization retry ${index + 1} succeeded`);
                break;
                
              } catch (retryError) {
                console.error(`❌ Frame initialization retry ${index + 1} failed:`, retryError);
                
                if (index === retryStrategies.length - 1) {
                  console.error('💥 All frame initialization retries exhausted');
                  // Continue anyway - some features may still work
                }
              }
            }
          }
        } finally {
          // Cleanup mobile optimizations after a delay
          if (isMobile) {
            setTimeout(() => {
              document.body.style.touchAction = '';
              document.body.style.userSelect = '';
              document.body.style.removeProperty('-webkit-user-select');
              document.body.style.removeProperty('-webkit-touch-callout');
            }, 2000);
          }
        }
      } else {
        console.log('✅ Frame already ready');
      }
    };

    // Debounce initialization to prevent multiple calls
    const timeoutId = setTimeout(initializeFrame, 100);
    return () => clearTimeout(timeoutId);
  }, [mounted, setFrameReady, isFrameReady, context]);

  // Initialize analytics session when context is available
  useEffect(() => {
    if (!mounted || !context || !isFrameReady || !context.user?.fid) return;
    
    const session = initializeUserSession(context);
    const clientInfo = getClientInfo(context);
    
    // Only track if we have valid session data
    if (session) {
      trackEvent("app_loaded", {
        userId: session.userId,
        clientId: session.clientId,
        clientFid: session.clientFid,
        userFid: context.user.fid,
        clientName: clientInfo.clientName,
        isCoinbaseWallet: clientInfo.isCoinbaseWallet,
        isFrameAdded: clientInfo.isFrameAdded,
      });
    }
  }, [mounted, context, isFrameReady]);

  // Track tab changes for analytics
  useEffect(() => {
    if (!mounted || !context || !context.user?.fid) return;
    
    const clientInfo = getClientInfo(context);
    const userId = `fid:${context.user.fid}`;
    const clientId = context.client?.clientFid;
    
    trackEvent("tab_changed", {
      userId,
      clientId,
      clientFid: context.user.fid,
      userFid: context.user.fid,
      tab: activeTab,
      clientName: clientInfo.clientName,
      timestamp: Date.now(),
    });
  }, [mounted, activeTab, context]);

  // Track frame addition attempts
  const handleAddFrame = useCallback(async () => {
    const clientInfo = getClientInfo(context || { client: {} });
    const userId = context?.user?.fid ? `fid:${context.user.fid}` : undefined;
    
    try {
      trackEvent("frame_add_attempt", {
        userId,
        clientId: context?.client?.clientFid,
        userFid: context?.user?.fid,
        clientName: clientInfo.clientName,
      });
      
      const frameAdded = await addFrame();
      setFrameAdded(Boolean(frameAdded));
      
      trackEvent("frame_add_result", {
        userId,
        clientId: context?.client?.clientFid,
        userFid: context?.user?.fid,
        success: Boolean(frameAdded),
        clientName: clientInfo.clientName,
      });
    } catch (error) {
      trackEvent("frame_add_error", {
        userId,
        clientId: context?.client?.clientFid,
        userFid: context?.user?.fid,
        error: error instanceof Error ? error.message : 'Unknown error',
        clientName: clientInfo.clientName,
      });
    }
  }, [addFrame, context]);


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
          
          {/* Basename display in top right - smaller on mobile */}
          <div className="flex items-center flex-shrink-0 ml-2">
            <MobileWalletHandler 
              showBalance={false}
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
  );
}
