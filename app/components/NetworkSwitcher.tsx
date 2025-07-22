"use client";

import { useState } from 'react'
import { useChainId, useSwitchChain } from 'wagmi'
import { base } from 'wagmi/chains'

export function NetworkSwitcher() {
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const networks = [
    {
      id: base.id,
      name: 'Base Mainnet',
      icon: '🟢',
      description: 'Real USDC transactions'
    }
  ]

  const currentNetwork = networks.find(n => n.id === chainId) || networks[0]

  const handleNetworkSwitch = (networkId: number) => {
    switchChain({ chainId: networkId })
    setIsDropdownOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200 text-sm"
      >
        <span>{currentNetwork.icon}</span>
        <span className="text-gray-300 font-medium">{currentNetwork.name}</span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 bg-black/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl p-2 min-w-[200px] z-20">
            {networks.map((network) => (
              <button
                key={network.id}
                onClick={() => handleNetworkSwitch(network.id)}
                className={`w-full flex items-start space-x-3 p-3 rounded-lg hover:bg-white/10 transition-all duration-200 text-left ${
                  network.id === chainId ? 'bg-blue-500/20 border border-blue-500/30' : ''
                }`}
              >
                <span className="text-lg">{network.icon}</span>
                <div>
                  <div className={`font-medium ${network.id === chainId ? 'text-blue-300' : 'text-white'}`}>
                    {network.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {network.description}
                  </div>
                </div>
                {network.id === chainId && (
                  <svg className="w-4 h-4 text-blue-400 ml-auto mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}