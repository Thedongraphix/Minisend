"use client";

import { useState } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { getNetworkConfig, isTestnet, getExplorerLink } from '@/lib/contracts'
import { base } from 'wagmi/chains'
import Image from 'next/image'

export function NetworkTester() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [txHash, setTxHash] = useState('')

  const networkConfig = getNetworkConfig(chainId)
  const isTestnetNetwork = isTestnet(chainId)

  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      if (switchChain) {
        await switchChain({ chainId: targetChainId })
      }
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  const handleExploreTransaction = () => {
    if (txHash) {
      const explorerUrl = getExplorerLink(chainId, txHash, 'tx')
      window.open(explorerUrl, '_blank')
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start">
          <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-yellow-800 font-semibold">Wallet Required</h3>
            <p className="text-yellow-700 text-sm mt-1">Connect your wallet to access network testing tools</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Network Status */}
      <div className={`rounded-2xl p-6 shadow-lg border ${
        isTestnetNetwork 
          ? 'bg-orange-50 border-orange-200' 
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${
              isTestnetNetwork ? 'bg-orange-500' : 'bg-green-500'
            }`}></div>
            <h3 className={`text-xl font-bold ${
              isTestnetNetwork ? 'text-orange-800' : 'text-green-800'
            }`}>
              {networkConfig.name}
            </h3>
            {isTestnetNetwork && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full border border-orange-300">
                TESTNET
              </span>
            )}
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${
              isTestnetNetwork ? 'text-orange-700' : 'text-green-700'
            }`}>
              Chain ID: {chainId}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Connected Address:</span>
              <span className="font-mono text-gray-900 text-sm">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Network Switching */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Network Switching</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Base Mainnet */}
          <button
            onClick={() => handleSwitchNetwork(base.id)}
            disabled={chainId === base.id}
            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              chainId === base.id
                ? 'border-green-300 bg-green-50 cursor-not-allowed'
                : 'border-gray-200 bg-gray-50 hover:border-green-300 hover:bg-green-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Image 
                    src="/Base_Network_Logo.svg" 
                    alt="Base Network" 
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Base Mainnet</h4>
                  <p className="text-sm text-gray-600">Production network</p>
                </div>
              </div>
              {chainId === base.id && (
                <div className="text-green-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>

          {/* Base Sepolia */}
          <button
            onClick={() => handleSwitchNetwork(base.id)}
            disabled={chainId === base.id}
            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              chainId === base.id
                ? 'border-orange-300 bg-orange-50 cursor-not-allowed'
                : 'border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Image 
                    src="/Base_Network_Logo.svg" 
                    alt="Base Network" 
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Base Sepolia</h4>
                  <p className="text-sm text-gray-600">Testnet for development</p>
                </div>
              </div>
              {chainId === base.id && (
                <div className="text-orange-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Testnet Resources */}
      {isTestnetNetwork && (
        <div className="bg-blue-50 p-6 rounded-2xl shadow-lg border border-blue-200">
          <h3 className="text-xl font-bold text-blue-900 mb-4">🧪 Testnet Resources</h3>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-blue-100">
              <h4 className="font-semibold text-blue-800 mb-2">Get Test USDC</h4>
              <p className="text-blue-700 text-sm mb-3">
                Use these faucets to get testnet USDC for testing:
              </p>
              <div className="space-y-2">
                <a
                  href="https://faucet.circle.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <span>Circle USDC Faucet</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="https://coinbase.com/faucets/base-ethereum-sepolia-faucet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <span>Coinbase Base Sepolia Faucet</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-100">
              <h4 className="font-semibold text-blue-800 mb-2">M-Pesa Testing</h4>
              <p className="text-blue-700 text-sm mb-2">
                Use these test phone numbers for M-Pesa integration:
              </p>
              <div className="space-y-1 text-sm font-mono">
                <div className="text-gray-700">+254700000000 (Success)</div>
                <div className="text-gray-700">+254711222333 (Insufficient Balance)</div>
                <div className="text-gray-700">+254722333444 (Invalid PIN)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Explorer */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4">🔍 Transaction Explorer</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Hash
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x1234567890abcdef..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
              />
              <button
                onClick={handleExploreTransaction}
                disabled={!txHash}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                View
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Block Explorer:</span>
            <a
              href={networkConfig.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {networkConfig.explorerUrl.replace('https://', '')}
            </a>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4">⚡ Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigator.clipboard.writeText(address || '')}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-700 font-medium">Copy Address</span>
          </button>
          
          <a
            href={getExplorerLink(chainId, address || '', 'address')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="text-gray-700 font-medium">View on Explorer</span>
          </a>
        </div>
      </div>
    </div>
  )
} 