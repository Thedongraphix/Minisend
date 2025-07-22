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
    title: "Minisend - USDC to M-Pesa",
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Convert USDC to Kenyan Shillings seamlessly via M-Pesa. The easiest way to cash out your crypto in Kenya.",
    keywords: process.env.NEXT_PUBLIC_APP_KEYWORDS || "minisend, usdc, ksh, mpesa, farcaster, crypto, offramp, kenya",
    
    // Open Graph
    openGraph: {
      title: process.env.NEXT_PUBLIC_APP_OG_TITLE || "Minisend - USDC to M-Pesa",
      description: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION || "Convert USDC to Kenyan Shillings seamlessly via M-Pesa",
      url: URL,
      siteName: "Minisend",
      images: [{
        url: process.env.NEXT_PUBLIC_APP_OG_IMAGE || '/minisend-logo.svg',
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
      title: "Minisend - USDC to M-Pesa",
      description: "Convert USDC to Kenyan Shillings seamlessly via M-Pesa",
      images: [process.env.NEXT_PUBLIC_APP_OG_IMAGE || '/minisend-logo.svg'],
    },

    // Icons
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/minisend-icon.svg', type: 'image/svg+xml', sizes: '32x32' },
      ],
      apple: '/minisend-icon.svg',
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
      <body className="bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
