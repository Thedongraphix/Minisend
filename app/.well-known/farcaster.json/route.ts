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
  const screenshots: string[] = []; 
  if (process.env.NEXT_PUBLIC_APP_SCREENSHOT_1) screenshots.push(process.env.NEXT_PUBLIC_APP_SCREENSHOT_1);
  if (process.env.NEXT_PUBLIC_APP_SCREENSHOT_2) screenshots.push(process.env.NEXT_PUBLIC_APP_SCREENSHOT_2);
  if (process.env.NEXT_PUBLIC_APP_SCREENSHOT_3) screenshots.push(process.env.NEXT_PUBLIC_APP_SCREENSHOT_3);

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
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE,
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
      
      // Visual Assets
      iconUrl: process.env.NEXT_PUBLIC_APP_ICON,
      splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
      splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
      heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
      
      // Screenshots (up to 3, portrait 1284x2778)
      screenshotUrls: screenshots,
      
      // App Store Listing
      primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY,
      tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
      tags: tags,
      
      // Social Sharing (Open Graph)
      ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE,
      ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
      ogImageUrl: process.env.NEXT_PUBLIC_APP_OG_IMAGE,
      
      // Technical URLs
      homeUrl: URL,
      webhookUrl: `${URL}/api/webhook`,
    }),
  });
}
