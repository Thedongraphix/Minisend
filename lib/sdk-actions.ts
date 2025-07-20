import { useOpenUrl } from "@coinbase/onchainkit/minikit";

// Type definitions for Farcaster SDK
interface FarcasterActions {
  composeCast?: (args: { text: string; embeds?: string[] }) => Promise<void>;
  openProfile?: (args: { fid: number }) => Promise<void>;
}

interface FarcasterSDK {
  actions?: FarcasterActions;
}

interface WindowWithFarcaster extends Window {
  farcaster?: FarcasterSDK;
}

/**
 * SDK Actions utility for mini apps
 * Following Coinbase Wallet guide to use official SDK functions instead of deeplinks
 */

// Compose cast action for sharing
export function useShareCast() {
  const openUrl = useOpenUrl();

  const shareCast = async (text: string, embeds?: string[]) => {
    try {
      // Use composeCast SDK action if available, otherwise fallback to openUrl
      // The guide mentions composeCast function but it might not be available yet
      const farcasterWindow = window as WindowWithFarcaster;
      if (typeof window !== 'undefined' && farcasterWindow.farcaster?.actions?.composeCast) {
        await farcasterWindow.farcaster.actions.composeCast!({
          text,
          embeds,
        });
      } else {
        // Fallback to openUrl with proper share format
        const encodedText = encodeURIComponent(text);
        const url = `https://warpcast.com/~/compose?text=${encodedText}`;
        await openUrl(url);
      }
    } catch (error) {
      console.error("Error sharing cast:", error);
    }
  };

  return { shareCast };
}

// Navigation helper
export function useAppNavigation() {
  const openUrl = useOpenUrl();

  const openExternal = async (url: string) => {
    try {
      await openUrl(url);
    } catch (error) {
      console.error("Error opening URL:", error);
    }
  };

  const openProfile = async (fid: number) => {
    try {
      // Use SDK action if available
      const farcasterWindow = window as WindowWithFarcaster;
      if (typeof window !== 'undefined' && farcasterWindow.farcaster?.actions?.openProfile) {
        await farcasterWindow.farcaster.actions.openProfile!({ fid });
      } else {
        await openUrl(`https://warpcast.com/profile/${fid}`);
      }
    } catch (error) {
      console.error("Error opening profile:", error);
    }
  };

  return { openExternal, openProfile };
}

// Share helpers for Kenya USDC app
export function createShareMessages() {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://minitest-phi.vercel.app";
  
  return {
    // Share successful transaction
    shareTransaction: (amount: number, kshAmount: number) => ({
      text: `🇰🇪 Just converted ${amount} USDC to ${kshAmount.toLocaleString()} KSH via M-Pesa! 

Fast, secure, and affordable crypto off-ramp for Kenya 🚀

Try it: ${baseUrl}`,
      embeds: [baseUrl],
    }),

    // Share app discovery
    shareApp: () => ({
      text: `🔥 Found this amazing USDC to M-Pesa converter!

Perfect for Kenya's crypto users:
✅ Direct M-Pesa integration
✅ Real-time rates  
✅ Mobile-first design
✅ Built on Base

Try it: ${baseUrl}`,
      embeds: [baseUrl],
    }),

    // Share feature discovery
    shareFeature: (feature: string) => ({
      text: `💡 Love the ${feature} feature in this Kenya USDC off-ramp app!

Built specifically for Kenyan crypto users with M-Pesa integration 🇰🇪

Check it out: ${baseUrl}`,
      embeds: [baseUrl],
    }),

    // Share wallet connection success
    shareConnection: () => ({
      text: `🔗 Connected my wallet to this Kenya USDC off-ramp!

Finally a crypto app designed for African mobile money 🌍

Built with MiniKit on Base: ${baseUrl}`,
      embeds: [baseUrl],
    }),
  };
}

// Action helpers for common app functions
export function useAppActions() {
  const { shareCast } = useShareCast();
  const { openExternal } = useAppNavigation();
  const shareMessages = createShareMessages();

  const shareSuccess = async (amount: number, kshAmount: number) => {
    const message = shareMessages.shareTransaction(amount, kshAmount);
    await shareCast(message.text, message.embeds);
  };

  const shareApp = async () => {
    const message = shareMessages.shareApp();
    await shareCast(message.text, message.embeds);
  };

  const openDocs = async () => {
    await openExternal("https://docs.base.org/builderkits/onchainkit");
  };

  const openMPesaGuide = async () => {
    await openExternal("https://developer.safaricom.co.ke/");
  };

  const openBaseExplorer = async (txHash?: string) => {
    const baseUrl = "https://basescan.org";
    const url = txHash ? `${baseUrl}/tx/${txHash}` : baseUrl;
    await openExternal(url);
  };

  return {
    shareSuccess,
    shareApp,
    openDocs,
    openMPesaGuide,
    openBaseExplorer,
  };
}

// Client detection helper (Coinbase Wallet clientFid = 309857)
export function getClientInfo(context: { client?: { clientFid?: number; added?: boolean } }) {
  const clientFid = context?.client?.clientFid;
  
  return {
    isCoinbaseWallet: clientFid === 309857,
    isWarpcast: clientFid === 1,
    clientName: getClientName(clientFid || 0),
    isFrameAdded: context?.client?.added || false,
  };
}

function getClientName(clientFid: number): string {
  switch (clientFid) {
    case 309857:
      return "Coinbase Wallet";
    case 1:
      return "Warpcast";
    default:
      return "Unknown Client";
  }
} 