"use client";

export type Provider = 'paycrest';

interface ProviderSelectorProps {
  selectedProvider: Provider;
  onProviderChange: (provider: Provider) => void;
}

export function ProviderSelector({ selectedProvider, onProviderChange }: ProviderSelectorProps) {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative rounded-3xl card-shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.01]">
        {/* Premium background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
          <div className="absolute inset-0 gradient-mesh opacity-40"></div>
          
          {/* Floating elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-10 h-10 border border-purple-400 rounded-full animate-pulse"></div>
            <div className="absolute bottom-6 left-6 w-6 h-6 border border-orange-400 rounded-full"></div>
            <div className="absolute top-1/2 left-4 w-8 h-8 border border-white rounded-full"></div>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">1</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Choose Payment Method</h3>
          </div>
          
          {/* Provider Options */}
          <div className="space-y-4">
            
            {/* PayCrest Option */}
            <div 
              onClick={() => onProviderChange('paycrest')}
              className={`relative cursor-pointer rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                selectedProvider === 'paycrest' 
                  ? 'border-blue-400 bg-blue-500/20' 
                  : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              {/* PayCrest background accent */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-50"></div>
              
              <div className="relative z-10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">⚡</span>
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-base">PayCrest</h4>
                      <p className="text-gray-300 text-sm">Lower fees • Manual send • More options</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                    selectedProvider === 'paycrest' 
                      ? 'border-blue-400 bg-blue-400' 
                      : 'border-white/30'
                  }`}>
                    {selectedProvider === 'paycrest' && (
                      <svg className="w-4 h-4 text-white m-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* PayCrest Features */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-lg border border-blue-400/30">
                    You send USDC
                  </span>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-medium rounded-lg border border-purple-400/30">
                    Better rates
                  </span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs font-medium rounded-lg border border-green-400/30">
                    Multiple providers
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Continue Button */}
          <button
            className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-xl font-bold text-base hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <span>Continue with PayCrest</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
        
        {/* Subtle border */}
        <div className="absolute inset-0 rounded-3xl border border-white/10"></div>
      </div>
    </div>
  );
}