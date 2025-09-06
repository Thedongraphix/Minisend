import "./theme.css";
import "@coinbase/onchainkit/styles.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zoom during wallet connections
  viewportFit: "cover", // Better mobile frame handling
};

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL || "https://minisend.xyz";
  const ogImage = process.env.NEXT_PUBLIC_APP_OG_IMAGE || process.env.NEXT_PUBLIC_ICON_URL || `${URL}/minisend-logo.png`;
  const appTitle = process.env.NEXT_PUBLIC_APP_OG_TITLE || "Minisend - USDC to KES/NGN";
  const appDescription = process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION || "Convert USDC to local currency instantly";
  
  return {
    title: appTitle,
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "USDC to mobile money instantly. Send to M-Pesa and bank accounts in Kenya & Nigeria.",
    keywords: process.env.NEXT_PUBLIC_APP_KEYWORDS || "minisend, usdc, ksh, mpesa, farcaster, crypto, offramp, kenya",
    
    // Open Graph for Facebook/LinkedIn
    openGraph: {
      title: appTitle,
      description: appDescription,
      url: URL,
      siteName: "Minisend",
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Minisend - Convert USDC to KES/NGN instantly',
        type: 'image/png',
      }],
      locale: 'en_US',
      type: 'website',
    },

    // Twitter/X Card
    twitter: {
      card: 'summary_large_image',
      site: '@minisend', // Add your Twitter handle if you have one
      creator: '@minisend', // Add your Twitter handle if you have one  
      title: appTitle,
      description: appDescription,
      images: {
        url: ogImage,
        alt: 'Minisend - Convert USDC to KES/NGN instantly',
      },
    },

    // Icons
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/minisend-logo.png', type: 'image/png', sizes: '32x32' },
      ],
      apple: '/minisend-logo.png',
    },

    other: {
      // Farcaster Frame meta tag - correct format for Mini App embeds
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || ogImage || `${URL || "https://minisend.xyz"}/minisend-logo.png`,
        button: {
          title: process.env.NEXT_PUBLIC_BUTTON_TITLE || `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Minisend"}`,
          action: {
            type: "launch_frame",
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Minisend",
            url: URL || "https://minisend.xyz",
            splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE || ogImage || `${URL || "https://minisend.xyz"}/minisend-logo.png`,
            splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || "#FFFFFF",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Additional meta tags for better social sharing */}
        <meta property="og:image" content={`${process.env.NEXT_PUBLIC_URL || "https://minisend.xyz"}/minisend-logo.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`${process.env.NEXT_PUBLIC_URL || "https://minisend.xyz"}/minisend-logo.png`} />
        <meta name="twitter:domain" content="minisend.xyz" />
        <meta name="theme-color" content="#1D4ED8" />
        <link rel="canonical" href={process.env.NEXT_PUBLIC_URL || "https://minisend.xyz"} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
        
        {/* Farcaster specific meta tag - correct format for Mini App embeds */}
        <meta name="fc:frame" content={JSON.stringify({
          version: "next",
          imageUrl: `${process.env.NEXT_PUBLIC_URL || "https://minisend.xyz"}/minisend-logo.png`,
          button: {
            title: "Launch Minisend",
            action: {
              type: "launch_frame",
              name: "Minisend",
              url: process.env.NEXT_PUBLIC_URL || "https://minisend.xyz",
              splashImageUrl: `${process.env.NEXT_PUBLIC_URL || "https://minisend.xyz"}/minisend-logo.png`,
              splashBackgroundColor: "#FFFFFF"
            }
          }
        })} />
        
        {/* Mobile debugging support - only in development */}
        <script 
          src="https://cdn.jsdelivr.net/npm/eruda" 
          defer
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize console logger FIRST - before anything else logs
              (function() {
                const isDevelopment = "${process.env.NODE_ENV}" === "development";
                const hasSupabase = "${process.env.NEXT_PUBLIC_SUPABASE_URL}" !== "";
                
                if (hasSupabase && typeof window !== 'undefined') {
                  // Store original console methods before anything else
                  const originalConsole = {
                    log: console.log,
                    error: console.error,
                    warn: console.warn,
                    info: console.info,
                    debug: console.debug
                  };
                  
                  // Simple immediate override for production silence
                  if (!isDevelopment) {
                    console.log = function() { /* silent in production */ };
                    console.error = function() { /* silent in production */ };
                    console.warn = function() { /* silent in production */ };
                    console.info = function() { /* silent in production */ };
                    console.debug = function() { /* silent in production */ };
                    
                    // Keep original console available for critical errors
                    window.__originalConsole = originalConsole;
                  }
                  
                  console.log('🔇 Console override active - production silence enabled');
                }
              })();
              
              // Only enable Eruda for development and testing
              if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                if (hostname === 'localhost' || 
                    hostname.includes('ngrok') || 
                    hostname.includes('vercel') ||
                    window.location.search.includes('debug=true')) {
                  if (window.eruda) {
                    window.eruda.init();
                    console.log('Eruda mobile debugging enabled');
                  }
                }
              }
            `
          }}
        />
      </head>
      <body className="bg-background font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
