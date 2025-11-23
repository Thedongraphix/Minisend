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
  const URL = process.env.NEXT_PUBLIC_URL || "https://app.minisend.xyz";
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
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || ogImage || (URL || "https://app.minisend.xyz") + "/hero-image.png",
        button: {
          title: process.env.NEXT_PUBLIC_BUTTON_TITLE || "Launch " + (process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Minisend"),
          action: {
            type: "launch_frame",
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Minisend",
            url: URL || "https://app.minisend.xyz",
            splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE || ogImage || (URL || "https://app.minisend.xyz") + "/minisend-logo.png",
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

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS PWA Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Minisend" />
        <link rel="apple-touch-icon" href="/minisend-logo.png" />

        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/minisend-logo.png" />

        {/* Windows Tile */}
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-TileImage" content="/minisend-logo.png" />

        {/* Android Theme */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Base Wallet Verification - Critical for preventing fraud warnings */}
        <meta name="wallet:safe" content="true" />
        <meta name="transaction:verification" content="enabled" />

        {/* Domain Verification Files */}
        <link rel="apple-app-site-association" href="/.well-known/apple-app-site-association" />
        <link rel="asset-links" href="/.well-known/assetlinks.json" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
