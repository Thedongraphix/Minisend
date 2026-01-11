/**
 * Platform Detection Utilities
 * Detects whether the app is running in Farcaster miniapp, Base App, or Web
 */

export type Platform = 'farcaster' | 'baseapp' | 'web';

/**
 * Checks if the app is running in a Farcaster miniapp environment
 */
export function isFarcasterMiniApp(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for Farcaster SDK context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (window as any).sdk !== 'undefined' && !!(window as any).sdk?.context;
}

/**
 * Checks if the app is running in Base App environment
 */
export function isBaseApp(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for Base Wallet provider
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof window.ethereum !== 'undefined' && (window.ethereum as any)?.isBaseWallet === true;
}

/**
 * Checks if the app is running in a standard web browser
 * (not Farcaster miniapp or Base App)
 */
export function isWeb(): boolean {
  return !isFarcasterMiniApp() && !isBaseApp();
}

/**
 * Gets the current platform
 */
export function getPlatform(): Platform {
  if (isFarcasterMiniApp()) return 'farcaster';
  if (isBaseApp()) return 'baseapp';
  return 'web';
}

/**
 * Checks if auth UI should be shown
 * Auth UI should only be shown for web users, not for miniapps
 */
export function shouldShowAuthUI(): boolean {
  return isWeb();
}

/**
 * Checks if wallet should auto-connect
 * Auto-connect happens in Farcaster miniapp and Base App
 */
export function shouldAutoConnect(): boolean {
  return isFarcasterMiniApp() || isBaseApp();
}

/**
 * Gets a user-friendly platform name
 */
export function getPlatformDisplayName(platform?: Platform): string {
  const currentPlatform = platform || getPlatform();

  switch (currentPlatform) {
    case 'farcaster':
      return 'Farcaster';
    case 'baseapp':
      return 'Base App';
    case 'web':
      return 'Web';
    default:
      return 'Unknown';
  }
}

/**
 * Development helper to log current platform
 */
export function logPlatformInfo(): void {
  if (typeof window === 'undefined') return;

  const platform = getPlatform();
  console.log('🔍 Platform Detection:', {
    platform,
    isFarcaster: isFarcasterMiniApp(),
    isBase: isBaseApp(),
    isWeb: isWeb(),
    shouldShowAuth: shouldShowAuthUI(),
    shouldAutoConnect: shouldAutoConnect(),
  });
}
