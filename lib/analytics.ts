import posthog from 'posthog-js';

// Initialize PostHog
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    person_profiles: 'identified_only',
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.debug();
    },
    capture_pageview: false, // We'll handle pageviews manually
    capture_pageleave: true,
    disable_session_recording: false,
  });
}

// Types for analytics events
interface AnalyticsEvent {
  event: string;
  userId?: string;
  clientId?: number;
  clientFid?: number;
  timestamp: number;
  properties?: Record<string, unknown>;
}

interface UserSession {
  userId: string;
  clientId: number;
  clientFid: number;
  clientName: string;
  sessionStart: number;
  lastActivity: number;
}

// Simple in-memory storage for demo (in production, use Redis or a database)
const analyticsEvents: AnalyticsEvent[] = [];
const userSessions = new Map<string, UserSession>();

/**
 * Initialize user session using MiniKit context data
 * According to the guide, context data can be used for authentication sessions
 */
export function initializeUserSession(context: { user?: { fid?: number }; client?: { clientFid?: number; added?: boolean } }): UserSession | null {
  if (!context?.user?.fid) {
    console.log("No user context available");
    return null;
  }

  const userId = `fid:${context.user.fid}`;
  const clientId = context.client?.clientFid || 0;
  const clientName = getClientName(clientId);
  
  const session: UserSession = {
    userId,
    clientId,
    clientFid: context.user.fid,
    clientName,
    sessionStart: Date.now(),
    lastActivity: Date.now(),
  };

  userSessions.set(userId, session);
  
  // Track session start
  trackEvent("session_start", {
    userId,
    clientId,
    clientName,
    userFid: context.user.fid,
    isFrameAdded: context.client?.added || false,
  });

  console.log(`User session initialized for ${userId} on ${clientName}`);
  return session;
}

/**
 * Get client name based on clientFid (Coinbase Wallet = 309857)
 */
function getClientName(clientFid: number): string {
  switch (clientFid) {
    case 309857:
      return "Coinbase Wallet";
    case 1:
      return "Warpcast";
    default:
      return `Unknown Client (FID: ${clientFid})`;
  }
}

/**
 * Track analytics event
 */
export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  // Don't track events without proper user context
  if (!properties?.userId) {
    console.log(`⚠️ Skipping analytics event '${event}' - no userId provided`);
    return;
  }

  const analyticsEvent: AnalyticsEvent = {
    event,
    timestamp: Date.now(),
    properties,
  };

  // Add user context if available
  if (properties?.userId && typeof properties.userId === 'string') {
    analyticsEvent.userId = properties.userId;
    
    // Ensure we have valid numeric values or undefined
    analyticsEvent.clientId = typeof properties.clientId === 'number' && properties.clientId > 0 
      ? properties.clientId 
      : undefined;
    
    analyticsEvent.clientFid = typeof properties.clientFid === 'number' && properties.clientFid > 0
      ? properties.clientFid 
      : typeof properties.userFid === 'number' && properties.userFid > 0
        ? properties.userFid 
        : undefined;
  }

  analyticsEvents.push(analyticsEvent);
  
  // Send to PostHog
  if (typeof window !== 'undefined' && posthog) {
    // Identify user if we have userId
    if (properties?.userId && typeof properties.userId === 'string') {
      posthog.identify(properties.userId, {
        clientId: analyticsEvent.clientId,
        clientFid: analyticsEvent.clientFid,
        clientName: properties.clientName,
        isFrameAdded: properties.isFrameAdded,
        isCoinbaseWallet: properties.isCoinbaseWallet,
      });
    }
    
    // Track the event
    posthog.capture(event, {
      ...properties,
      timestamp: analyticsEvent.timestamp,
      // Add additional context
      $current_url: window.location.href,
      $referrer: document.referrer,
      platform: 'farcaster_miniapp',
      app: 'minisend',
    });
  }
  
  // Log for debugging
  console.log("Analytics Event:", analyticsEvent);

  // Update user activity
  if (properties?.userId && typeof properties.userId === 'string') {
    const session = userSessions.get(properties.userId);
    if (session) {
      session.lastActivity = Date.now();
      userSessions.set(properties.userId, session);
    }
  }
}

/**
 * Track user interactions specific to Kenya USDC off-ramp
 */
export function trackOffRampEvent(event: string, data: {
  amount?: number;
  currency?: string;
  provider?: string;
  step?: number;
  error?: string;
  success?: boolean;
  transactionHash?: string;
  orderId?: string;
  phoneNumber?: string;
  accountNumber?: string;
  bankCode?: string;
  rate?: number;
  usdcAmount?: number;
}, context?: { user?: { fid?: number }; client?: { clientFid?: number; added?: boolean } }): void {
  let userId: string | undefined;
  let clientId: number | undefined;
  let userFid: number | undefined;

  if (context?.user?.fid) {
    userId = `fid:${context.user.fid}`;
    clientId = context.client?.clientFid;
    userFid = context.user.fid;
  }

  trackEvent(`offramp_${event}`, {
    ...data,
    userId,
    clientId,
    userFid,
    isKenyaApp: true,
    // Sanitize sensitive data
    phoneNumber: data.phoneNumber ? data.phoneNumber.substring(0, 4) + '****' + data.phoneNumber.substring(data.phoneNumber.length - 4) : undefined,
    accountNumber: data.accountNumber ? '****' + data.accountNumber.substring(data.accountNumber.length - 4) : undefined,
  });
}

/**
 * Get user session for authentication purposes
 */
export function getUserSession(userId: string): UserSession | null {
  return userSessions.get(userId) || null;
}

/**
 * Create a simple JWT-like session token using context data
 * Note: This is for demo purposes. In production, use proper JWT with secrets
 */
export function createSessionToken(context: { user?: { fid?: number }; client?: { clientFid?: number; added?: boolean } }): string | null {
  if (!context?.user?.fid) {
    return null;
  }

  const sessionData = {
    fid: context.user.fid,
    clientFid: context.client?.clientFid || 0,
    isFrameAdded: context.client?.added || false,
    timestamp: Date.now(),
  };

  // In production, use proper JWT signing
  return btoa(JSON.stringify(sessionData));
}

/**
 * Verify session token
 */
export function verifySessionToken(token: string): { fid: number; clientFid: number; isFrameAdded: boolean; timestamp: number } | null {
  try {
    const sessionData = JSON.parse(atob(token));
    
    // Check if token is recent (24 hours)
    const isExpired = Date.now() - sessionData.timestamp > 24 * 60 * 60 * 1000;
    if (isExpired) {
      return null;
    }

    return sessionData;
  } catch {
    return null;
  }
}

/**
 * Get analytics summary (useful for debugging)
 */
export function getAnalyticsSummary() {
  return {
    totalEvents: analyticsEvents.length,
    activeSessions: userSessions.size,
    recentEvents: analyticsEvents.slice(-10),
    sessions: Array.from(userSessions.values()),
  };
}

/**
 * Track swap-related events
 */
export function trackSwapEvent(event: string, data: {
  fromToken?: string;
  toToken?: string;
  fromAmount?: string;
  toAmount?: string;
  error?: string;
  success?: boolean;
  transactionHash?: string;
}, context?: { user?: { fid?: number }; client?: { clientFid?: number; added?: boolean } }): void {
  let userId: string | undefined;
  let clientId: number | undefined;
  let userFid: number | undefined;

  if (context?.user?.fid) {
    userId = `fid:${context.user.fid}`;
    clientId = context.client?.clientFid;
    userFid = context.user.fid;
  }

  trackEvent(`swap_${event}`, {
    ...data,
    userId,
    clientId,
    userFid,
    platform: 'base_network',
  });
}

/**
 * Track wallet connection events
 */
export function trackWalletEvent(event: string, data: {
  walletType?: string;
  address?: string;
  error?: string;
  success?: boolean;
}, context?: { user?: { fid?: number }; client?: { clientFid?: number; added?: boolean } }): void {
  let userId: string | undefined;
  let clientId: number | undefined;
  let userFid: number | undefined;

  if (context?.user?.fid) {
    userId = `fid:${context.user.fid}`;
    clientId = context.client?.clientFid;
    userFid = context.user.fid;
  }

  trackEvent(`wallet_${event}`, {
    ...data,
    userId,
    clientId,
    userFid,
    // Sanitize address to first 6 and last 4 chars
    address: data.address ? `${data.address.substring(0, 6)}...${data.address.substring(data.address.length - 4)}` : undefined,
  });
}

/**
 * Track API performance events
 */
export function trackAPIEvent(event: string, data: {
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  success?: boolean;
}, context?: { user?: { fid?: number }; client?: { clientFid?: number; added?: boolean } }): void {
  let userId: string | undefined;
  let clientId: number | undefined;
  let userFid: number | undefined;

  if (context?.user?.fid) {
    userId = `fid:${context.user.fid}`;
    clientId = context.client?.clientFid;
    userFid = context.user.fid;
  }

  trackEvent(`api_${event}`, {
    ...data,
    userId,
    clientId,
    userFid,
  });
}

/**
 * Track page views manually
 */
export function trackPageView(page: string, properties?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && posthog) {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      page,
      ...properties,
    });
  }
}

/**
 * Export PostHog instance for advanced usage
 */
export { posthog };

/**
 * Export data for external analytics services
 */
export function exportAnalyticsData(): AnalyticsEvent[] {
  return analyticsEvents.slice(); // Return copy
} 