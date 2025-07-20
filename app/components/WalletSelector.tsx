"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  onClick: () => void;
}

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}



// Utility functions for mobile detection and MetaMask handling
const isMobileDevice = () => /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const isMetaMaskMobileApp = () => {
  return typeof window !== 'undefined' && 
         window.ethereum?.isMetaMask && 
         isMobileDevice();
};

const handleMetaMaskConnection = (connect: any, connectors: any[], setShowModal: (show: boolean) => void) => {
  const metamaskConnector = connectors.find(c => c.name.toLowerCase().includes('metamask'));
  
  if (metamaskConnector) {
    // Wagmi connector found
    connect({ connector: metamaskConnector });
    setShowModal(false);
  } else if (window.ethereum?.isMetaMask) {
    // Direct MetaMask connection
    window.ethereum.request({ method: 'eth_requestAccounts' })
      .then(() => setShowModal(false))
      .catch((error: any) => console.error('MetaMask connection failed:', error));
  } else if (isMobileDevice()) {
    // Mobile: Open MetaMask app via deep link
    const currentUrl = encodeURIComponent(window.location.href);
    const metamaskDeepLink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}`;
    
    // For iOS, we need to handle the deep link differently
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS: Try universal link first, fallback to app store
      window.location.href = metamaskDeepLink;
      
      // Fallback to app store after a delay
      setTimeout(() => {
        if (document.hasFocus()) {
          window.open('https://apps.apple.com/app/metamask/id1438144202', '_blank');
        }
      }, 2000);
    } else {
      // Android: Direct deep link
      window.open(metamaskDeepLink, '_blank');
    }
    
    setShowModal(false);
  } else {
    // Desktop: Redirect to install page
    window.open('https://metamask.io/download/', '_blank');
  }
};

export function WalletSelector() {
  const [showModal, setShowModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const walletOptions: WalletOption[] = [
    {
      id: "metamask",
      name: isClient && isMetaMaskMobileApp() ? "MetaMask (In-App)" : "MetaMask",
      icon: "🦊",
      onClick: () => handleMetaMaskConnection(connect, connectors, setShowModal),
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      icon: "🔵",
      onClick: () => {
        const coinbaseConnector = connectors.find(c => c.name.toLowerCase().includes('coinbase'));
        if (coinbaseConnector) {
          connect({ connector: coinbaseConnector });
          setShowModal(false);
        }
      },
    },
    {
      id: "injected",
      name: "Browser Wallet",
      icon: "🌐",
      onClick: () => {
        const injectedConnector = connectors.find(c => c.name.toLowerCase().includes('injected'));
        if (injectedConnector) {
          connect({ connector: injectedConnector });
          setShowModal(false);
        }
      },
    },
  ];

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowModal(!showModal)}
          className="flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg backdrop-blur-sm border border-blue-500/20"
        >
          <Avatar className="h-6 w-6 rounded-lg" address={address} />
          <Name address={address} className="text-inherit font-semibold tracking-tight" />
        </button>
        
        {showModal && (
          <div className="absolute right-0 top-full mt-3 glass-effect rounded-2xl card-shadow p-6 min-w-[320px] z-50 border border-white/10">
            <div className="relative">
              <div className="absolute inset-0 gradient-mesh opacity-20 rounded-2xl"></div>
              <div className="relative">
                <Identity address={address} className="mb-6" hasCopyAddressOnClick>
                  <Avatar address={address} className="rounded-xl shadow-lg" />
                  <Name address={address} className="text-white font-bold text-lg" />
                  <Address address={address} className="text-gray-300 font-mono text-sm" />
                  <EthBalance address={address} className="text-blue-400 font-semibold" />
                </Identity>
                <button
                  onClick={() => {
                    disconnect();
                    setShowModal(false);
                  }}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
                >
                  Disconnect Wallet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg backdrop-blur-sm border border-blue-500/20 tracking-tight"
        disabled={isPending}
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-effect rounded-3xl p-8 max-w-md w-full mx-4 card-shadow-lg border border-white/10 relative">
            {/* Background mesh */}
            <div className="absolute inset-0 gradient-mesh opacity-30 rounded-3xl"></div>
            
            <div className="relative">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Connect Wallet
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {walletOptions.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={wallet.onClick}
                    disabled={isPending}
                    className="w-full flex items-center justify-between p-5 glass-effect rounded-2xl hover:bg-white/10 transition-all duration-300 disabled:opacity-50 border border-white/10 hover:border-white/20 transform hover:scale-[1.02]"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-3xl">{wallet.icon}</span>
                      <span className="font-semibold text-white text-lg tracking-tight">
                        {wallet.name}
                      </span>
                    </div>
                    {/* Show mobile indicator for MetaMask */}
                    {isClient && wallet.id === "metamask" && isMobileDevice() && !isMetaMaskMobileApp() && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg border border-blue-500/30">
                        Opens App
                      </span>
                    )}
                    {isClient && wallet.id === "metamask" && isMetaMaskMobileApp() && (
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-lg border border-green-500/30">
                        Detected
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-400 font-medium">
                  Choose your preferred wallet to connect securely
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}