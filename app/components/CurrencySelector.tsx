"use client";

export type Currency = 'KES' | 'NGN';

interface CurrencySelectorProps {
  selectedCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  onContinue?: () => void;
}

const CURRENCIES = {
  KES: {
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    flag: '🇰🇪',
    country: 'Kenya',
    rate: 129.2, // Example rate
  },
  NGN: {
    name: 'Nigerian Naira',
    symbol: '₦',
    flag: '🇳🇬',
    country: 'Nigeria',
    rate: 1528.7, // From PayCrest API
  },
} as const;

export function CurrencySelector({ selectedCurrency, onCurrencyChange, onContinue }: CurrencySelectorProps) {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative rounded-3xl card-shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.01]">
        {/* Premium background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
          <div className="absolute inset-0 gradient-mesh opacity-40"></div>
          
          {/* Floating elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-10 h-10 border border-green-400 rounded-full animate-pulse"></div>
            <div className="absolute bottom-6 left-6 w-6 h-6 border border-blue-400 rounded-full"></div>
            <div className="absolute top-1/2 left-4 w-8 h-8 border border-white rounded-full"></div>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">💱</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Select Currency</h3>
          </div>
          
          {/* Currency Options */}
          <div className="space-y-4">
            {Object.entries(CURRENCIES).map(([code, currency]) => (
              <div 
                key={code}
                onClick={() => onCurrencyChange(code as Currency)}
                className={`relative cursor-pointer rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                  selectedCurrency === code 
                    ? 'border-green-400 bg-green-500/20' 
                    : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                {/* Currency background accent */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 opacity-50"></div>
                
                <div className="relative z-10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">{currency.flag}</span>
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-base">{code}</h4>
                        <p className="text-gray-300 text-sm">{currency.country} • {currency.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold text-sm">
                        1 USDC = {currency.rate.toLocaleString()} {code}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 transition-all duration-200 mt-2 ml-auto ${
                        selectedCurrency === code 
                          ? 'border-green-400 bg-green-400' 
                          : 'border-white/30'
                      }`}>
                        {selectedCurrency === code && (
                          <svg className="w-4 h-4 text-white m-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Currency Features */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs font-medium rounded-lg border border-green-400/30">
                      {code === 'KES' ? 'M-Pesa' : 'Bank Transfer'}
                    </span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-lg border border-blue-400/30">
                      Instant
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Continue Button */}
          <button
            onClick={onContinue}
            className="w-full mt-6 bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-6 rounded-xl font-bold text-base hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <span>Continue with {CURRENCIES[selectedCurrency].name}</span>
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

export { CURRENCIES };