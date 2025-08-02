import "./theme.css";
import "@coinbase/onchainkit/styles.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL;
  return {
    title: "Minisend - USDC to Mobile Money",
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "USDC to mobile money instantly. Send to M-Pesa and bank accounts in Kenya & Nigeria.",
    keywords: process.env.NEXT_PUBLIC_APP_KEYWORDS || "minisend, usdc, ksh, mpesa, farcaster, crypto, offramp, kenya",
    
    // Open Graph
    openGraph: {
      title: process.env.NEXT_PUBLIC_APP_OG_TITLE || "Minisend - USDC to Mobile Money",
      description: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION || "USDC to mobile money instantly. Kenya & Nigeria.",
      url: URL,
      siteName: "Minisend",
      images: [{
        url: process.env.NEXT_PUBLIC_APP_OG_IMAGE || '/minisend-logo.png',
        width: 120,
        height: 40,
        alt: 'Minisend',
      }],
      locale: 'en_US',
      type: 'website',
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: "Minisend - USDC to Mobile Money",
      description: "USDC to mobile money instantly. Kenya & Nigeria.",
      images: [process.env.NEXT_PUBLIC_APP_OG_IMAGE || '/minisend-logo.png'],
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
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
        button: {
          title: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME}`,
          action: {
            type: "launch_frame",
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
            url: URL,
            splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_IMAGE,
            splashBackgroundColor:
              process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
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
        {/* Mobile debugging support - only in development */}
        <script 
          src="https://cdn.jsdelivr.net/npm/eruda" 
          defer
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
      <body className="bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
