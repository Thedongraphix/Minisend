import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    accountAssociation: {
      header: process.env.FARCASTER_HEADER!,
      payload: process.env.FARCASTER_PAYLOAD!,
      signature: process.env.FARCASTER_SIGNATURE!,
    },
    frame: {
      version: "1",
      name: process.env.NEXT_PUBLIC_APP_NAME || "Minisend",
      iconUrl: process.env.NEXT_PUBLIC_ICON_URL || "https://app.minisend.xyz/icon.png",
      homeUrl: process.env.NEXT_PUBLIC_APP_URL || "https://app.minisend.xyz",
      imageUrl: process.env.NEXT_PUBLIC_IMAGE_URL || process.env.NEXT_PUBLIC_ICON_URL || "https://app.minisend.xyz/icon.png",
      buttonTitle: process.env.NEXT_PUBLIC_BUTTON_TITLE || "Open Minisend",
      splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE || process.env.NEXT_PUBLIC_ICON_URL || "https://app.minisend.xyz/icon.png",
      splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || "#1D4ED8",
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.minisend.xyz"}/api/webhooks`,
      subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE || "USDC to KES and NGN",
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Convert USDC to KES or NGN instantly",
      screenshotUrls: process.env.NEXT_PUBLIC_SCREENSHOT_URLS
        ? process.env.NEXT_PUBLIC_SCREENSHOT_URLS.split(',')
        : [
            `${process.env.NEXT_PUBLIC_APP_URL || "https://app.minisend.xyz"}/swap.jpeg`,
            `${process.env.NEXT_PUBLIC_APP_URL || "https://app.minisend.xyz"}/rates.jpeg`,
            `${process.env.NEXT_PUBLIC_APP_URL || "https://app.minisend.xyz"}/confirmation.jpeg`
          ],
      primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY || "finance",
      tags: process.env.NEXT_PUBLIC_APP_KEYWORDS?.split(',').map(tag => tag.trim()) || ["usdc", "mpesa", "kenya", "crypto", "finance"],
      heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || process.env.NEXT_PUBLIC_ICON_URL || "https://app.minisend.xyz/icon.png",
      tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || "Cash out crypto instantly",
      ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE || "Minisend - USDC to KES and NGN",
      ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION || "Convert USDC to local currency instantly",
      ogImageUrl: process.env.NEXT_PUBLIC_APP_OG_IMAGE || process.env.NEXT_PUBLIC_ICON_URL || "https://app.minisend.xyz/icon.png",
      castShareUrl: process.env.NEXT_PUBLIC_CAST_SHARE_URL || `${process.env.NEXT_PUBLIC_APP_URL || "https://app.minisend.xyz"}/share`
    }
  };

  return NextResponse.json(manifest);
}