function withValidProperties(
  properties: Record<string, undefined | string | string[]>,
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return !!value;
    }),
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL;

  // Build screenshot URLs array
  const screenshots: string[] = process.env.NEXT_PUBLIC_SCREENSHOT_URLS
    ? process.env.NEXT_PUBLIC_SCREENSHOT_URLS.split(',')
    : [`${URL || "https://app.minisend.xyz"}/icon.png`];

  // Build tags array - default tags for Kenya USDC off-ramp
  const tags = ["usdc", "mpesa", "kenya", "crypto", "finance"];

  return Response.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD, 
      signature: process.env.FARCASTER_SIGNATURE,
    },
    frame: withValidProperties({
      version: "1",
      
      // Basic App Information
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Minisend",
      subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE || "USDC to KES and NGN",
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Convert USDC to KES or NGN instantly",
      
      // Critical fields for Farcaster preview
      imageUrl: process.env.NEXT_PUBLIC_IMAGE_URL || "https://app.minisend.xyz/hero-image.png",
      buttonTitle: process.env.NEXT_PUBLIC_BUTTON_TITLE || "Open Minisend",

      // Visual Assets
      iconUrl: process.env.NEXT_PUBLIC_ICON_URL || "https://app.minisend.xyz/icon.png",
      splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE || process.env.NEXT_PUBLIC_ICON_URL || "https://app.minisend.xyz/icon.png",
      splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || "#FFFFFF",
      heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "https://app.minisend.xyz/hero-image.png",
      
      // Screenshots (up to 3, portrait 1284x2778)
      screenshotUrls: screenshots,
      
      // App Store Listing
      primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY || "finance",
      tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || "Cash out crypto instantly",
      tags: tags,
      
      // Social Sharing (Open Graph)
      ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE || "Minisend - USDC to KES and NGN",
      ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION || "Convert USDC to local currency instantly",
      ogImageUrl: process.env.NEXT_PUBLIC_APP_OG_IMAGE || "https://app.minisend.xyz/hero-image.png",

      // Technical URLs
      homeUrl: URL || "https://app.minisend.xyz",
      // Neynar webhook URL for Farcaster miniapp events
      webhookUrl: "https://api.neynar.com/f/app/6169a7fa-658f-4d01-b6a5-ec7fb4bd802e/event",

      // Cast sharing
      castShareUrl: process.env.NEXT_PUBLIC_CAST_SHARE_URL || `${URL || "https://app.minisend.xyz"}/share`,
    }),
    baseBuilder: {
      allowedAddresses: ["0x7D6109a51781FB8dFCae01F5Cd5C70dF412a9CEc"]
    }
    
  });
}
