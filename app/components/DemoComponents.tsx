"use client";

import { type ReactNode, useEffect, useState } from "react";

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outlined" | "ghost";
  size?: "medium" | "large";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  iconName?: "heart" | "star" | "check" | "plus" | "arrow-right" | "dollar-sign" | "sparkles" | "user";
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
    "transform hover:scale-[1.02] active:scale-[0.98]"
  ];

  const variantClasses = {
    primary: "!bg-gradient-to-r !from-blue-600 !to-blue-700 !text-white !border !border-blue-500/20 hover:!from-blue-700 hover:!to-blue-800 !shadow-lg hover:!shadow-xl",
    secondary: "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/30",
    outlined: "bg-transparent text-white border border-white/30 hover:bg-white/10 hover:border-white/50 backdrop-blur-sm",
    ghost: "hover:bg-white/10 text-gray-300 hover:text-white backdrop-blur-sm",
  };

  const sizeClasses = {
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
      className={`glass-effect rounded-3xl card-shadow overflow-hidden transition-all duration-300 hover:scale-[1.02] relative ${className} ${onClick ? "cursor-pointer hover:card-shadow-lg" : ""}`}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
    >
      {/* Subtle background mesh */}
      <div className="absolute inset-0 gradient-mesh opacity-20"></div>
      
      <div className="relative">
        {title && (
          <div className="px-8 py-6 border-b border-white/10">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {title}
            </h3>
          </div>
        )}
        <div className="p-8">{children}</div>
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
                  Send directly to bank accounts across Nigeria
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
                  Payments typically complete within 1-2 minutes
                </span>
              </div>
            </li>
          </ul>
          
          <div className="pt-4 border-t border-gray-700">
            <Button
              onClick={() => setActiveTab("offramp")}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 mb-3"
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

type HomeProps = {
  setActiveTab: (tab: string) => void;
};

export function Home({ setActiveTab }: HomeProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Prevent hydration mismatch by not rendering content on server
  if (!mounted) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <div className="space-y-4 text-center">
            <p className="text-gray-300 text-base leading-relaxed">
              Convert USDC to mobile money instantly. Send directly to M-Pesa and bank accounts in Kenya & Nigeria.
            </p>
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="animate-pulse bg-gray-700 h-12 w-32 rounded-lg"></div>
              </div>
            </div>
          </div>
        </Card>
        
        <div className="text-center">
          <div className="flex justify-center space-x-4 text-xs text-gray-500">
            <span>🇰🇪 Kenya</span>
            <span>🇳🇬 Nigeria</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <div className="space-y-4 text-center">
          <p className="text-gray-300 text-base leading-relaxed">
            Convert USDC to mobile money. Send to M-Pesa and banks in Kenya & Nigeria.
          </p>

          {/* Maintenance Notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-center space-x-2 text-amber-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Maintenance Notice</span>
            </div>
            <p className="text-amber-300 text-sm mt-2 text-center">
              We have a scheduled maintenance from today 8:00 am - 3:00 pm EAT. 
USDC→NGN/KES withdrawals and transaction processing temporarily unavailable.We apologize for any inconvenience.

           </p>
          </div>
          
            
          {/* Action Buttons - Show immediately */}
          <div className="space-y-3">
            <Button
              onClick={() => setActiveTab("offramp")}
              variant="primary"
              size="large"
              fullWidth
              roundedFull
            >
              Start Offramp
            </Button>
            <Button
              onClick={() => setActiveTab("swap")}
              variant="secondary"
              size="large"
              fullWidth
              roundedFull
            >
              Swap ETH to USDC
            </Button>
            <Button
              onClick={() => setActiveTab("spend")}
              variant="outlined"
              size="large"
              fullWidth
              roundedFull
            >
              Spend USDC
            </Button>
          </div>
        </div>
      </Card>
      
      <div className="text-center">
        <div className="flex justify-center space-x-4 text-xs text-gray-500">
          <span>🇰🇪 Kenya</span>
          <span>🇳🇬 Nigeria</span>
        </div>
      </div>
    </div>
  );
}

type IconProps = {
  name: "heart" | "star" | "check" | "plus" | "arrow-right" | "dollar-sign" | "sparkles" | "user";
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
  };

  return (
    <span className={`inline-block ${sizeClasses[size]} ${className}`}>
      {icons[name]}
    </span>
  );
}




