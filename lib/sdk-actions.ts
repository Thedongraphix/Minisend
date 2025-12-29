import { useOpenUrl, useComposeCast } from "@coinbase/onchainkit/minikit";

/**
 * SDK Actions utility for mini apps
 * Following Base documentation for proper share implementation
 * @see https://docs.base.org/mini-apps/core-concepts/sharing-and-social-graph
 */

// Compose cast action for sharing - uses official OnchainKit hook
export function useShareCast() {
  const { composeCast } = useComposeCast();

  const shareCast = async (text: string, embeds?: string[]) => {
    try {
      // Use official composeCast hook from OnchainKit
      await composeCast({ text, embeds });
    } catch (error) {
      console.error("Error sharing cast:", error);
      throw error;
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

// Share helpers for multi-currency USDC off-ramp app
export function createShareMessages() {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://app.minisend.xyz";

  return {
    // Share successful transaction - contextual based on currency
    shareTransaction: (amount: number, localAmount: number, currency: 'KES' | 'NGN' | 'GHS') => {
      const currencyData = {
        KES: { symbol: 'KSh', flag: '🇰🇪', country: 'Kenya', service: 'M-Pesa' },
        NGN: { symbol: '₦', flag: '🇳🇬', country: 'Nigeria', service: 'bank transfer' },
        GHS: { symbol: '₵', flag: '🇬🇭', country: 'Ghana', service: 'mobile money' }
      };
      const { symbol, flag, country, service } = currencyData[currency];

      return {
        text: `${flag} Just converted ${amount} USDC to ${symbol}${localAmount.toLocaleString()} via ${service}!

Fast, secure crypto off-ramp for ${country} 🚀

Try Minisend: ${baseUrl}`,
        embeds: [baseUrl],
      };
    },

    // Share app discovery
    shareApp: () => ({
      text: `🔥 Found Minisend - convert USDC to local currency instantly!

🇰🇪 Kenya (M-Pesa)
🇳🇬 Nigeria (Bank)
🇬🇭 Ghana (Mobile Money)

Try it: ${baseUrl}`,
      embeds: [baseUrl],
    }),
  };
}

// Action helpers for common app functions
export function useAppActions() {
  const { shareCast } = useShareCast();
  const { openExternal } = useAppNavigation();
  const shareMessages = createShareMessages();

  const shareSuccess = async (amount: number, localAmount: number, currency: 'KES' | 'NGN' | 'GHS') => {
    const message = shareMessages.shareTransaction(amount, localAmount, currency);
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