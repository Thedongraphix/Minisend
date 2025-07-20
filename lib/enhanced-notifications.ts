import { sendFrameNotification } from "./notification-client";

// Enhanced notification types for Kenya USDC app
interface NotificationPayload {
  fid: number;
  title: string;
  body: string;
  targetUrl?: string;
  imageUrl?: string;
}

interface TransactionNotification {
  type: 'transaction_success' | 'transaction_failed' | 'transaction_pending';
  amount: number;
  currency: string;
  txHash?: string;
  error?: string;
}

interface UserEngagementNotification {
  type: 'welcome' | 'milestone' | 'feature_update' | 'reminder';
  userData?: Record<string, unknown>;
}

/**
 * Enhanced notification service for Kenya USDC off-ramp
 * Following Coinbase Wallet guide for mini app notifications
 */
export class EnhancedNotificationService {
  private appName: string;
  private baseUrl: string;

  constructor() {
    this.appName = process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Kenya USDC Off-Ramp';
    this.baseUrl = process.env.NEXT_PUBLIC_URL || 'https://minitest-phi.vercel.app';
  }

  /**
   * Send transaction-related notifications
   */
  async sendTransactionNotification(
    fid: number, 
    notification: TransactionNotification
  ): Promise<void> {
    let payload: NotificationPayload;

    switch (notification.type) {
      case 'transaction_success':
        payload = {
          fid,
          title: '🎉 Transaction Successful!',
          body: `Your ${notification.amount} USDC has been converted to KSH and sent to your M-Pesa account.`,
          targetUrl: notification.txHash ? `${this.baseUrl}?tx=${notification.txHash}` : this.baseUrl,
          imageUrl: `${this.baseUrl}/success-notification.png`,
        };
        break;

      case 'transaction_pending':
        payload = {
          fid,
          title: '⏳ Transaction Processing',
          body: `Your ${notification.amount} USDC conversion is being processed. You'll receive your KSH shortly.`,
          targetUrl: this.baseUrl,
          imageUrl: `${this.baseUrl}/pending-notification.png`,
        };
        break;

      case 'transaction_failed':
        payload = {
          fid,
          title: '❌ Transaction Failed',
          body: `Your ${notification.amount} USDC conversion failed. ${notification.error || 'Please try again.'}`,
          targetUrl: this.baseUrl,
          imageUrl: `${this.baseUrl}/error-notification.png`,
        };
        break;
    }

    await this.sendNotification(payload);
  }

  /**
   * Send user engagement notifications
   */
  async sendEngagementNotification(
    fid: number,
    notification: UserEngagementNotification
  ): Promise<void> {
    let payload: NotificationPayload;

    switch (notification.type) {
      case 'welcome':
        payload = {
          fid,
          title: `🇰🇪 Welcome to ${this.appName}!`,
          body: 'Convert USDC to KSH seamlessly via M-Pesa. Fast, secure, and built for Kenya.',
          targetUrl: this.baseUrl,
          imageUrl: `${this.baseUrl}/welcome-notification.png`,
        };
        break;

      case 'milestone':
        payload = {
          fid,
          title: '🎯 Milestone Reached!',
          body: 'You\'re becoming a crypto-to-fiat conversion pro! Thanks for using our Kenya USDC off-ramp.',
          targetUrl: this.baseUrl,
          imageUrl: `${this.baseUrl}/milestone-notification.png`,
        };
        break;

      case 'feature_update':
        payload = {
          fid,
          title: '✨ New Features Available!',
          body: 'We\'ve added new features to make your USDC to M-Pesa conversions even smoother.',
          targetUrl: this.baseUrl,
          imageUrl: `${this.baseUrl}/update-notification.png`,
        };
        break;

      case 'reminder':
        payload = {
          fid,
          title: '💰 Convert Your USDC Today',
          body: 'Great exchange rates available! Convert your USDC to KSH via M-Pesa.',
          targetUrl: this.baseUrl,
          imageUrl: `${this.baseUrl}/reminder-notification.png`,
        };
        break;
    }

    await this.sendNotification(payload);
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(
    fid: number,
    title: string,
    body: string,
    targetUrl?: string,
    imageUrl?: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      fid,
      title,
      body,
      targetUrl: targetUrl || this.baseUrl,
      imageUrl,
    };

    await this.sendNotification(payload);
  }

  /**
   * Send exchange rate alerts
   */
  async sendExchangeRateAlert(
    fid: number,
    currentRate: number,
    previousRate: number
  ): Promise<void> {
    const percentChange = ((currentRate - previousRate) / previousRate) * 100;
    const isPositive = percentChange > 0;
    const emoji = isPositive ? '📈' : '📉';
    
    const payload: NotificationPayload = {
      fid,
      title: `${emoji} Exchange Rate Update`,
      body: `USDC to KSH rate is now ${currentRate.toLocaleString()} (${isPositive ? '+' : ''}${percentChange.toFixed(2)}%). ${isPositive ? 'Great time to convert!' : 'Rate may improve soon.'}`,
      targetUrl: this.baseUrl,
      imageUrl: `${this.baseUrl}/rate-alert-notification.png`,
    };

    await this.sendNotification(payload);
  }

  /**
   * Send M-Pesa status notifications
   */
  async sendMPesaStatusNotification(
    fid: number,
    status: 'completed' | 'failed' | 'timeout',
    amount: number,
    reference?: string
  ): Promise<void> {
    let payload: NotificationPayload;

    switch (status) {
      case 'completed':
        payload = {
          fid,
          title: '✅ M-Pesa Transfer Complete',
          body: `${amount.toLocaleString()} KSH has been credited to your M-Pesa account. Reference: ${reference}`,
          targetUrl: this.baseUrl,
          imageUrl: `${this.baseUrl}/mpesa-success-notification.png`,
        };
        break;

      case 'failed':
        payload = {
          fid,
          title: '❌ M-Pesa Transfer Failed',
          body: `Your ${amount.toLocaleString()} KSH transfer failed. Please check your M-Pesa number and try again.`,
          targetUrl: this.baseUrl,
          imageUrl: `${this.baseUrl}/mpesa-error-notification.png`,
        };
        break;

      case 'timeout':
        payload = {
          fid,
          title: '⏰ M-Pesa Transfer Timeout',
          body: `Your ${amount.toLocaleString()} KSH transfer is taking longer than expected. Please check your M-Pesa account.`,
          targetUrl: this.baseUrl,
          imageUrl: `${this.baseUrl}/mpesa-timeout-notification.png`,
        };
        break;
    }

    await this.sendNotification(payload);
  }

  /**
   * Core notification sending method
   */
  private async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Use existing notification client
      await sendFrameNotification({
        fid: payload.fid,
        title: payload.title,
        body: payload.body,
        // Note: targetUrl and imageUrl not supported by current notification client
        // In production, enhance notification-client.ts to support these features
      });

      console.log(`Notification sent to FID ${payload.fid}: ${payload.title}`);
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Batch send notifications to multiple users
   */
  async sendBatchNotifications(
    fids: number[],
    title: string,
    body: string,
    targetUrl?: string,
    imageUrl?: string
  ): Promise<void> {
    const promises = fids.map(fid => 
      this.sendCustomNotification(fid, title, body, targetUrl, imageUrl)
    );

    try {
      await Promise.allSettled(promises);
      console.log(`Batch notifications sent to ${fids.length} users`);
    } catch (error) {
      console.error('Failed to send batch notifications:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new EnhancedNotificationService();

// Helper functions for common notification scenarios
export const sendWelcomeNotification = (fid: number) => 
  notificationService.sendEngagementNotification(fid, { type: 'welcome' });

export const sendTransactionSuccess = (fid: number, amount: number, txHash?: string) =>
  notificationService.sendTransactionNotification(fid, {
    type: 'transaction_success',
    amount,
    currency: 'USDC',
    txHash,
  });

export const sendTransactionFailed = (fid: number, amount: number, error: string) =>
  notificationService.sendTransactionNotification(fid, {
    type: 'transaction_failed',
    amount,
    currency: 'USDC',
    error,
  });

export const sendMPesaComplete = (fid: number, amount: number, reference: string) =>
  notificationService.sendMPesaStatusNotification(fid, 'completed', amount, reference);

export const sendExchangeRateAlert = (fid: number, currentRate: number, previousRate: number) =>
  notificationService.sendExchangeRateAlert(fid, currentRate, previousRate); 