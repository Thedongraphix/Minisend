// Farcaster Mini App Notification Types
// Based on Farcaster Frame Notifications specification

export interface NotificationDetails {
  url: string; // API endpoint for sending notifications
  token: string; // Authentication token
}

export interface UserNotification {
  id: string;
  fid: number;
  app_fid: number; // The FID of the client app (e.g., Base app is 309857)
  notification_url: string;
  notification_token: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_notification_sent_at?: string;
  miniapp_added_at?: string;
}

// Webhook event types from Farcaster
export type FarcasterWebhookEventType =
  | 'miniapp_added'
  | 'miniapp_removed'
  | 'notifications_enabled'
  | 'notifications_disabled';

export interface FarcasterWebhookEvent {
  event: FarcasterWebhookEventType;
  notificationDetails?: NotificationDetails;
}

export interface FarcasterWebhookPayload {
  fid: number;
  appFid: number; // The FID of the client app
  event: FarcasterWebhookEvent;
}

// Request/Response types for sending notifications
export interface SendNotificationRequest {
  notificationId: string; // UUID for idempotency
  title: string; // Max 32 characters
  body: string; // Max 128 characters
  targetUrl: string; // Max 1024 characters, must be same domain
  tokens: string[]; // Max 100 tokens
}

export interface SendNotificationResponse {
  result: {
    successfulTokens: string[];
    invalidTokens: string[];
    rateLimitedTokens: string[];
  };
}

export type NotificationStatus = 'success' | 'failed' | 'rate_limited' | 'invalid_token';

export interface NotificationHistory {
  id: string;
  fid: number;
  app_fid: number; // The FID of the client app
  notification_id: string;
  title: string;
  body: string;
  target_url: string;
  status: NotificationStatus;
  error_message?: string;
  sent_at: string;
}

// Notification templates for different events
export interface NotificationTemplate {
  title: string;
  body: string;
  targetUrl: string;
}

export type NotificationEvent =
  | 'transaction_completed'
  | 'transaction_failed'
  | 'transaction_validated'
  | 'welcome'
  | 'rate_update'
  | 'promotion';

export interface NotificationContext {
  fid: number;
  appFid: number; // The FID of the client app
  event: NotificationEvent;
  data?: Record<string, unknown>;
}
