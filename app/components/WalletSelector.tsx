"use client";

import { useState } from "react";
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



export function WalletSelector() {
  const [showModal, setShowModal] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const walletOptions: WalletOption[] = [
    {
      id: "metamask",
      name: "MetaMask",
      icon: "🦊",
      onClick: () => {
        const metamaskConnector = connectors.find(c => c.name.toLowerCase().includes('metamask'));
        if (metamaskConnector) {
          connect({ connector: metamaskConnector });
          setShowModal(false);
        } else if (window.ethereum?.isMetaMask) {
          // Direct connection fallback
          window.ethereum.request({ method: 'eth_requestAccounts' });
          setShowModal(false);
        } else {
          alert('MetaMask not detected. Please install MetaMask.');
        }
      },
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
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Avatar className="h-6 w-6" address={address} />
          <Name address={address} className="text-inherit" />
        </button>
        
        {showModal && (
          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 min-w-[280px] z-50">
            <Identity address={address} className="mb-4" hasCopyAddressOnClick>
              <Avatar address={address} />
              <Name address={address} />
              <Address address={address} />
              <EthBalance address={address} />
            </Identity>
            <button
              onClick={() => {
                disconnect();
                setShowModal(false);
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        disabled={isPending}
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Connect Wallet
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {walletOptions.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={wallet.onClick}
                  disabled={isPending}
                  className="w-full flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <span className="text-2xl">{wallet.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {wallet.name}
                  </span>
                </button>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred wallet to connect
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}