"use client";

import { type ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outlined" | "ghost";
  size?: "medium" | "large";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  iconName?: "heart" | "star" | "check" | "plus" | "arrow-right" | "dollar-sign" | "sparkles";
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
    primary: "bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/20 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl",
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
    roundedFull ? "rounded-full" : "rounded-xl",
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
    <div className="space-y-8 animate-fade-in">
      <Card title="Enterprise Features">
        <ul className="space-y-5 mb-8">
          
          
          <li className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Icon name="check" className="text-white" size="sm" />
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">OnchainKit Integration</h4>
              <span className="text-gray-300 leading-relaxed">
                Built with Coinbase&apos;s enterprise web3 toolkit
              </span>
            </div>
          </li>
          <li className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Icon name="check" className="text-white" size="sm" />
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">Multi-Wallet Support</h4>
              <span className="text-gray-300 leading-relaxed">
                MetaMask, Coinbase Wallet, Phantom, Rabby, Trust, Frame
              </span>
            </div>
          </li>
          <li className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Icon name="check" className="text-white" size="sm" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <img 
                  src="/Base_Network_Logo.svg" 
                  alt="Base Network" 
                  className="w-4 h-4"
                />
                <h4 className="text-white font-semibold">Base Network Ready</h4>
              </div>
              <span className="text-gray-300 leading-relaxed">
                Production and testnet environments supported
              </span>
            </div>
          </li>
        </ul>
        <Button variant="outlined" onClick={() => setActiveTab("home")} fullWidth>
          Back to Home
        </Button>
      </Card>
    </div>
  );
}

type HomeProps = {
  setActiveTab: (tab: string) => void;
};

export function Home({ setActiveTab }: HomeProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card title="Kenya USDC Off-Ramp">
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <img 
              src="/Base_Network_Logo.svg" 
              alt="Base Network" 
              className="w-4 h-4"
            />
            <span className="text-blue-300 text-xs font-medium">Built on Base</span>
          </div>
          <p className="text-gray-300 text-base leading-relaxed">
            Convert your USDC to Kenyan Shillings via M-Pesa seamlessly and securely. 
            Built for the African crypto economy.
          </p>
          
          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-xl mb-1">⚡</div>
              <h4 className="text-white font-semibold text-xs mb-0.5">Instant</h4>
              <p className="text-gray-400 text-xs">Direct to M-Pesa</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-xl mb-1">🔒</div>
              <h4 className="text-white font-semibold text-xs mb-0.5">Secure</h4>
              <p className="text-gray-400 text-xs">Enterprise grade</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-xl mb-1">💰</div>
              <h4 className="text-white font-semibold text-xs mb-0.5">Low Fees</h4>
              <p className="text-gray-400 text-xs">2-4% processing</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-xl mb-1">🇰🇪</div>
              <h4 className="text-white font-semibold text-xs mb-0.5">Local</h4>
              <p className="text-gray-400 text-xs">Built for Kenya</p>
            </div>
          </div>
          
          <Button
            onClick={() => setActiveTab("offramp")}
            iconName="arrow-right"
            fullWidth
            size="medium"
          >
            Convert USDC to M-Pesa
          </Button>
          
          <Button
            onClick={() => setActiveTab("features")}
            variant="outlined"
            fullWidth
            size="medium"
          >
            View Features
          </Button>
        </div>
      </Card>
    </div>
  );
}

type IconProps = {
  name: "heart" | "star" | "check" | "plus" | "arrow-right" | "dollar-sign" | "sparkles";
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
  };

  return (
    <span className={`inline-block ${sizeClasses[size]} ${className}`}>
      {icons[name]}
    </span>
  );
}




