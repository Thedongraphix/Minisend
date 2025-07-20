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
  const analyticsEvent: AnalyticsEvent = {
    event,
    timestamp: Date.now(),
    properties,
  };

  // Add user context if available
  if (properties?.userId && typeof properties.userId === 'string') {
    analyticsEvent.userId = properties.userId;
    analyticsEvent.clientId = typeof properties.clientId === 'number' ? properties.clientId : undefined;
    analyticsEvent.clientFid = typeof properties.userFid === 'number' ? properties.userFid : undefined;
  }

  analyticsEvents.push(analyticsEvent);
  
  // Log for debugging (in production, send to analytics service)
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
 * Export data for external analytics services
 */
export function exportAnalyticsData(): AnalyticsEvent[] {
  return analyticsEvents.slice(); // Return copy
} 