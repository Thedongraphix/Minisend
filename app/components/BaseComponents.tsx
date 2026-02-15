"use client";

import { type ReactNode, useEffect, useState, useRef, useCallback } from "react";
import { useMinisendAuth } from '@/lib/hooks/useMinisendAuth';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import Image from 'next/image';
import QRCodeStyling from 'qr-code-styling';

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outlined" | "ghost";
  size?: "small" | "medium" | "large";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  iconName?: "heart" | "star" | "check" | "plus" | "arrow-right" | "dollar-sign" | "sparkles" | "user" | "bell" | "arrow-up-right" | "credit-card" | "arrows-swap" | "arrow-down" | "refresh";
  roundedFull?: boolean;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "medium",
  className = "",
  onClick,
  disabled = false,
  type = "button",
  iconName,
  roundedFull = false,
  fullWidth = false,
}: ButtonProps) {
  const baseClasses = [
    "whitespace-nowrap",
    "flex items-center justify-center",
    "disabled:opacity-40 disabled:pointer-events-none",
    "transition-all duration-300",
    "font-semibold",
    "tracking-tight",
    "transform active:scale-[0.98]"
  ];

  const variantClasses = {
    primary: "!bg-blue-600 hover:!bg-blue-700 !text-white !border !border-blue-500 hover:!border-blue-400",
    secondary: "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/30",
    outlined: "bg-transparent text-white border border-white/30 hover:bg-white/10 hover:border-white/50 backdrop-blur-sm",
    ghost: "hover:bg-white/10 text-gray-300 hover:text-white backdrop-blur-sm",
  };

  const sizeClasses = {
    small: "text-xs px-4 py-2 gap-2",
    medium: "text-sm px-5 py-2.5 gap-3",
    large: "text-lg px-8 py-4 gap-4",
  };

  const classes = [
    ...baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    roundedFull ? "rounded-full" : "rounded-2xl",
    fullWidth ? "w-full" : "w-auto",
    className
  ];

  const buttonClasses = classes.filter(Boolean).join(" ");

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
      {iconName && (
        <Icon 
          name={iconName} 
          size={size === "large" ? "lg" : "md"} 
          className="text-current"
        />
      )}
    </button>
  );
}

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

function Card({
  title,
  children,
  className = "",
  onClick,
}: CardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden transition-all duration-300 relative ${className} ${onClick ? "cursor-pointer hover:bg-white/[0.04]" : ""}`}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
    >
      <div className="relative">
        {title && (
          <div className="px-6 py-5 border-b border-white/[0.06]">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {title}
            </h3>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

type FeaturesProps = {
  setActiveTab: (tab: string) => void;
};

export function Features({ setActiveTab }: FeaturesProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-white font-bold text-lg mb-2">What We Offer</h3>
            <p className="text-gray-400 text-sm">Simple, reliable USDC to mobile money conversion</p>
          </div>
          
          <ul className="space-y-4">
            <li className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name="check" className="text-white" size="sm" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">M-Pesa Integration</h4>
                <span className="text-gray-300 text-sm">
                  Direct transfers to Kenyan mobile money accounts
                </span>
              </div>
            </li>
            
            <li className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name="check" className="text-white" size="sm" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Nigerian Banks</h4>
                <span className="text-gray-300 text-sm">
                  Send directly to 15 plus bank accounts across Nigeria
                </span>
              </div>
            </li>
            
            <li className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name="check" className="text-white" size="sm" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Base Network</h4>
                <span className="text-gray-300 text-sm">
                  Fast, low-cost transactions on Coinbase&apos;s L2
                </span>
              </div>
            </li>
            
            <li className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name="check" className="text-white" size="sm" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Live Exchange Rates</h4>
                <span className="text-gray-300 text-sm">
                  Real-time USD to KES/NGN conversion rates
                </span>
              </div>
            </li>
            
            <li className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name="check" className="text-white" size="sm" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Instant Processing</h4>
                <span className="text-gray-300 text-sm">
                  Payments typically complete within 60seconds
                </span>
              </div>
            </li>
          </ul>
          
          <div className="pt-4 border-t border-gray-700">
            <Button
              onClick={() => setActiveTab("offramp")}
              variant="primary"
              fullWidth
              size="medium"
            >
              Try It Now
            </Button>
            <Button variant="outlined" onClick={() => setActiveTab("home")} fullWidth size="medium">
              Back to Home
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ActionCircle component for wallet-style action buttons
type ActionCircleProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
};

export function ActionCircle({ icon, label, onClick }: ActionCircleProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group"
    >
      <div className="w-14 h-14 rounded-full bg-[#1d1e22] border border-white/[0.08] flex items-center justify-center transition-all duration-200 hover:bg-[#252629] active:scale-95">
        {icon}
      </div>
      <span className="text-[11px] text-gray-400 font-medium group-hover:text-gray-300 transition-colors">{label}</span>
    </button>
  );
}

// Live exchange rates marquee ticker
function RatesTicker() {
  const [rates, setRates] = useState<{ currency: string; flag: string; symbol: string; rate: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const currencies = [
      { code: 'KES', flag: '🇰🇪', symbol: 'KES' },
      { code: 'GHS', flag: '🇬🇭', symbol: 'GHS' },
      { code: 'UGX', flag: '🇺🇬', symbol: 'UGX' },
      { code: 'NGN', flag: '🇳🇬', symbol: 'NGN' },
    ];

    const fetchRates = async () => {
      try {
        const pretiumCurrencies = currencies.filter(c => c.code !== 'NGN');
        const ngnCurrency = currencies.find(c => c.code === 'NGN');

        const pretiumResults = await Promise.all(
          pretiumCurrencies.map(async (c) => {
            try {
              const res = await fetch(`/api/pretium/rates?currency=${c.code}`);
              const data = await res.json();
              if (data.success && data.rates?.buying_rate) {
                return {
                  currency: c.code,
                  flag: c.flag,
                  symbol: c.symbol,
                  rate: parseFloat(data.rates.buying_rate).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                };
              }
            } catch {
              // skip failed currency
            }
            return null;
          })
        );

        // Fetch NGN from Paycrest
        let ngnResult = null;
        if (ngnCurrency) {
          try {
            const res = await fetch('/api/paycrest/rates/USDC/1/NGN');
            const data = await res.json();
            if (data.success && data.rate) {
              ngnResult = {
                currency: ngnCurrency.code,
                flag: ngnCurrency.flag,
                symbol: ngnCurrency.symbol,
                rate: parseFloat(data.rate).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
              };
            }
          } catch {
            // skip NGN
          }
        }

        const allResults = [...pretiumResults, ngnResult];
        const valid = allResults.filter(Boolean) as { currency: string; flag: string; symbol: string; rate: string }[];
        if (valid.length > 0) {
          setRates(valid);
          setLoaded(true);
        }
      } catch {
        // silently fail
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!loaded || rates.length === 0) return null;

  // Duplicate items for seamless loop
  const tickerItems = [...rates, ...rates];

  return (
    <div className="relative overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.04] py-2.5">
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

      <div className="flex animate-ticker whitespace-nowrap">
        {tickerItems.map((r, i) => (
          <div key={`${r.currency}-${i}`} className="flex items-center gap-4 mx-5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{r.flag}</span>
              <span className="text-white/40 text-[11px] font-medium">{r.symbol}</span>
            </div>
            <span className="text-white text-[13px] font-semibold tabular-nums">{r.rate}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Rich promotional banners carousel
function InfoBanners({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const bannerCount = 3;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % bannerCount);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {/* Banner 1: Send — USDC to M-Pesa & Banks */}
        <div className="w-full flex-shrink-0">
          <button
            onClick={() => setActiveTab("offramp")}
            className="w-full text-left group"
          >
            <div className="relative overflow-hidden rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 60%, #8b53ff 100%)' }}
            >
              {/* Subtle decorative — pushed to edges, low opacity */}
              <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full border border-[#8b53ff]/[0.10]" />
              <div className="absolute -right-4 bottom-0 w-16 h-16 rounded-full border border-[#8b53ff]/[0.06]" />

              <div className="relative p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 z-10">
                  <p className="text-[#c4a0ff] text-[10px] font-semibold uppercase tracking-widest mb-1.5">Send Money</p>
                  <h3 className="text-white text-lg font-bold leading-tight mb-1">USDC to M-Pesa</h3>
                  <p className="text-white/70 text-xs leading-relaxed">
                    Convert USDC to KES, NGN,<br />UGX & GHS instantly.
                  </p>
                </div>
                <div className="flex-shrink-0 z-10">
                  <div className="px-4 py-2 rounded-xl bg-[#8b53ff]/20 group-hover:bg-[#8b53ff]/30 transition-colors">
                    <span className="text-white text-xs font-semibold whitespace-nowrap flex items-center gap-1.5">
                      Send Now
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Banner 2: Pay — Till Numbers & Paybills */}
        <div className="w-full flex-shrink-0">
          <button
            onClick={() => setActiveTab("spend")}
            className="w-full text-left group"
          >
            <div className="relative overflow-hidden rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 60%, #8b53ff 100%)' }}
            >
              {/* Subtle decorative — pushed to corners */}
              <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full border border-[#8b53ff]/[0.12]" />
              <div className="absolute right-4 -top-8 w-20 h-20 rounded-full border border-[#8b53ff]/[0.08]" />

              <div className="relative p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 z-10">
                  <p className="text-[#c4a0ff] text-[10px] font-semibold uppercase tracking-widest mb-1.5">Pay Bills</p>
                  <h3 className="text-white text-lg font-bold leading-tight mb-1">Pay with USDC</h3>
                  <p className="text-white/70 text-xs leading-relaxed">
                    Pay till numbers and paybills<br />directly with USDC.
                  </p>
                </div>
                <div className="flex-shrink-0 z-10">
                  <div className="px-4 py-2 rounded-xl bg-[#8b53ff]/20 group-hover:bg-[#8b53ff]/30 transition-colors">
                    <span className="text-white text-xs font-semibold whitespace-nowrap flex items-center gap-1.5">
                      Pay Now
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Banner 3: Deposit — Any chain, cashout instantly */}
        <div className="w-full flex-shrink-0">
          <button
            onClick={() => setActiveTab("profile")}
            className="w-full text-left group"
          >
            <div className="relative overflow-hidden rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1035 50%, #2d1b69 100%)' }}
            >
              {/* Subtle decorative — thin rings far from text */}
              <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-[#8b53ff]/[0.10]" />
              <div className="absolute -left-6 -top-6 w-16 h-16 rounded-full border border-[#8b53ff]/[0.06]" />

              <div className="relative p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 z-10">
                  <p className="text-[#8b53ff] text-[10px] font-semibold uppercase tracking-widest mb-1.5">Deposit</p>
                  <h3 className="text-white text-lg font-bold leading-tight mb-1">Fund Your Wallet</h3>
                  <p className="text-white/60 text-xs leading-relaxed">
                    Deposit stablecoins on any<br />chain. Cash out instantly.
                  </p>
                </div>
                <div className="flex-shrink-0 z-10">
                  <div className="px-4 py-2 rounded-xl bg-[#8b53ff]/15 group-hover:bg-[#8b53ff]/25 transition-colors">
                    <span className="text-white text-xs font-semibold whitespace-nowrap flex items-center gap-1.5">
                      Deposit
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex
                ? 'w-5 h-1.5 bg-[#8b53ff]'
                : 'w-1.5 h-1.5 bg-white/15 hover:bg-white/25'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

type HomeProps = {
  setActiveTab: (tab: string) => void;
};

export function Home({ setActiveTab }: HomeProps) {
  const [mounted, setMounted] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, login, minisendWallet } = useMinisendAuth();
  const {
    balance,
    isRefreshing: isBalanceRefreshing,
    fetchBalance: refetchBalance,
  } = useUSDCBalance();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate styled QR code when deposit modal opens
  useEffect(() => {
    if (showDeposit && minisendWallet && qrContainerRef.current) {
      qrContainerRef.current.innerHTML = '';
      const qrCode = new QRCodeStyling({
        width: 188,
        height: 190,
        type: 'canvas',
        data: minisendWallet,
        margin: 0,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'H',
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.3,
          margin: 4,
        },
        dotsOptions: {
          color: '#8b53ff',
          type: 'rounded',
        },
        cornersSquareOptions: {
          color: '#8b53ff',
          type: 'extra-rounded',
        },
        cornersDotOptions: {
          color: '#8b53ff',
          type: 'dot',
        },
        backgroundOptions: {
          color: '#FFFFFF',
        },
      });
      qrCode.append(qrContainerRef.current);
    }
  }, [showDeposit, minisendWallet]);

  const displayBalance = `$${balance}`;

  const handleDeposit = () => {
    if (isAuthenticated && minisendWallet) {
      setShowDeposit(true);
    } else {
      login();
    }
  };

  const handleCopyAddress = useCallback(async () => {
    if (!minisendWallet) return;
    try {
      await navigator.clipboard.writeText(minisendWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [minisendWallet]);

  // Prevent hydration mismatch by not rendering content on server
  if (!mounted) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Balance skeleton */}
        <div className="flex flex-col items-center pt-4">
          <div className="animate-pulse bg-gray-800 h-3 w-20 rounded mb-3"></div>
          <div className="animate-pulse bg-gray-700 h-12 w-36 rounded-lg mb-3"></div>
          <div className="flex gap-2">
            <div className="animate-pulse bg-gray-800 h-7 w-7 rounded-full"></div>
            <div className="animate-pulse bg-gray-800 h-7 w-7 rounded-full"></div>
          </div>
        </div>
        {/* Action circles skeleton */}
        <div className="flex justify-center gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="animate-pulse bg-gray-800 h-14 w-14 rounded-full"></div>
              <div className="animate-pulse bg-gray-800 h-2.5 w-10 rounded"></div>
            </div>
          ))}
        </div>
        {/* Banner skeleton */}
        <div className="animate-pulse bg-gray-800/30 h-24 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Balance Hero */}
      <div className="flex flex-col items-center pt-4">
        <span className="text-gray-500 text-xs uppercase tracking-widest mb-2">USDC Balance</span>
        <span className="text-white text-5xl font-bold tracking-tight mb-3">
          {isBalanceVisible ? displayBalance : '••••'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBalanceVisible(!isBalanceVisible)}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/[0.08] transition-colors"
            title={isBalanceVisible ? "Hide balance" : "Show balance"}
          >
            {isBalanceVisible ? (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            )}
          </button>
          <button
            onClick={refetchBalance}
            disabled={isBalanceRefreshing}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            title="Refresh balance"
          >
            {isBalanceRefreshing ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Action Button Row */}
      <div className="flex justify-center gap-6">
        <ActionCircle
          icon={<Icon name="arrow-up-right" size="md" className="text-white" />}
          label="Send"
          onClick={() => setActiveTab("offramp")}
        />
        <ActionCircle
          icon={<Icon name="credit-card" size="md" className="text-white" />}
          label="Pay"
          onClick={() => setActiveTab("spend")}
        />
        <ActionCircle
          icon={<Icon name="arrow-down" size="md" className="text-white" />}
          label="Deposit"
          onClick={handleDeposit}
        />
      </div>

     

      {/* Info Banners */}
      <InfoBanners setActiveTab={setActiveTab} />

       {/* Live Rates Ticker */}
       <RatesTicker />

      {/* Deposit Modal Overlay */}
      {showDeposit && minisendWallet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowDeposit(false)}
          />
          {/* Modal Sheet */}
          <div className="relative w-full max-w-md bg-[#111113] border-t border-white/[0.08] rounded-t-3xl p-6 pb-10 animate-deposit-slide-up">
            {/* Drag handle */}
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowDeposit(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.10] flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col items-center gap-5">
              <div className="text-center">
                <h3 className="text-white text-lg font-semibold mb-1">Deposit USDC</h3>
                <p className="text-gray-400 text-xs">Scan or copy your wallet address to deposit</p>
              </div>

              {/* QR Code */}
              <div className="relative">
                <div ref={qrContainerRef} className="rounded-xl overflow-hidden" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1.5 pointer-events-none shadow-sm">
                  <Image
                    src="/logo.svg"
                    alt="Minisend"
                    width={20}
                    height={20}
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Full address with copy */}
              <button
                onClick={handleCopyAddress}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
              >
                <span className="text-gray-300 text-xs font-mono truncate">
                  {minisendWallet}
                </span>
                {copied ? (
                  <span className="text-green-400 text-xs font-medium flex-shrink-0">Copied!</span>
                ) : (
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>

              {/* Supported Networks */}
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-[10px] uppercase tracking-wider">Networks</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-white/10 p-0.5 flex items-center justify-center" title="Base">
                    <Image src="/Base_Network_Logo.svg" alt="Base" width={12} height={12} />
                  </div>
                  <div className="w-5 h-5 rounded-full bg-white/10 p-0.5 flex items-center justify-center" title="Polygon">
                    <Image src="/polygon-logo.svg" alt="Polygon" width={12} height={12} />
                  </div>
                  <div className="w-5 h-5 rounded-full bg-white/10 p-0.5 flex items-center justify-center" title="Celo">
                    <Image src="/celo-logo.svg" alt="Celo" width={12} height={12} />
                  </div>
                  <div className="w-5 h-5 rounded-full bg-white p-0.5 flex items-center justify-center" title="Lisk">
                    <Image src="/lisk-logo.svg" alt="Lisk" width={12} height={12} className="invert-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type IconProps = {
  name: "heart" | "star" | "check" | "plus" | "arrow-right" | "dollar-sign" | "sparkles" | "user" | "bell" | "arrow-up-right" | "credit-card" | "arrows-swap" | "arrow-down" | "refresh";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Icon({ name, size = "md", className = "" }: IconProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const icons = {
    heart: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Heart</title>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    star: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Star</title>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    check: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Check</title>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    plus: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Plus</title>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    "arrow-right": (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Arrow Right</title>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    ),
    "dollar-sign": (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Dollar Sign</title>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    sparkles: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Sparkles</title>
        <path d="M12 3l1.09 3.26L16.35 8 13.09 9.74 12 13l-1.09-3.26L7.65 8l3.26-1.74L12 3z" />
        <path d="M5 3l.5 1.5L7 5l-1.5.5L5 7l-.5-1.5L3 5l1.5-.5L5 3z" />
        <path d="M19 17l.5 1.5L21 19l-1.5.5L19 21l-.5-1.5L17 19l1.5-.5L19 17z" />
      </svg>
    ),
    user: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>User</title>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    bell: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Bell</title>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    "arrow-up-right": (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <title>Arrow Up Right</title>
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    ),
    "credit-card": (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <title>Credit Card</title>
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    "arrows-swap": (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <title>Swap</title>
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
    "arrow-down": (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <title>Arrow Down</title>
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    ),
    refresh: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <title>Refresh</title>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
  };

  return (
    <span className={`inline-block ${sizeClasses[size]} ${className}`}>
      {icons[name]}
    </span>
  );
}




