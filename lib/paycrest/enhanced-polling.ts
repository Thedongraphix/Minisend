import { getPaycrestService } from './config';
import { PaycrestOrder } from './index';

export interface EnhancedPollingOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeoutMs?: number;
  onStatusUpdate?: (order: PaycrestOrder) => void;
  onError?: (error: Error) => void;
}

export interface PollingResult {
  success: boolean;
  completed: boolean;
  order?: PaycrestOrder;
  error?: string;
  message?: string;
  timeoutReached?: boolean;
  attempts?: number;
}

/**
 * Enhanced polling service with exponential backoff and intelligent retry logic
 * Based on PayCrest API documentation and best practices
 */
export class EnhancedPollingService {
  private paycrestService: unknown;

  constructor(paycrestService: unknown) {
    this.paycrestService = paycrestService;
  }

  /**
   * Poll order status with intelligent backoff
   */
  async pollOrderStatus(
    orderId: string,
    options: EnhancedPollingOptions = {}
  ): Promise<PollingResult> {
    const {
      maxAttempts = 40,
      baseDelay = 3000,
      maxDelay = 15000,
      timeoutMs = 300000, // 5 minutes
      onStatusUpdate,
      onError,
    } = options;

    console.log('🚀 Starting enhanced polling for order:', orderId, {
      maxAttempts,
      baseDelay,
      maxDelay,
      timeoutMs,
    });

    const startTime = Date.now();
    let attempts = 0;
    let currentDelay = baseDelay;
    let lastStatus = '';

    while (attempts < maxAttempts) {
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        console.log('⏰ Polling timeout reached');
        return {
          success: false,
          completed: true,
          error: 'Polling timeout reached',
          message: 'Payment monitoring timed out - please check status manually',
          timeoutReached: true,
          attempts,
        };
      }

      attempts++;
      console.log(`📊 Polling attempt ${attempts}/${maxAttempts} for order ${orderId}`);

      try {
        const order = await (this.paycrestService as { getOrderStatus: (id: string) => Promise<PaycrestOrder> }).getOrderStatus(orderId);
        
        console.log(`📋 Order status: ${order.status}`, {
          orderId: order.id,
          status: order.status,
          amountPaid: order.amountPaid,
          txHash: order.txHash,
          attempt: attempts,
        });

        // Call status update callback if status changed
        if (order.status !== lastStatus) {
          lastStatus = order.status;
          onStatusUpdate?.(order);
        }

        // Check for terminal states based on PayCrest specification
        if (this.isSettled(order)) {
          console.log('✅ Payment settled successfully via polling');
          return {
            success: true,
            completed: true,
            order,
            message: 'Payment completed successfully',
            attempts,
          };
        }

        if (this.isFailed(order)) {
          console.log('❌ Payment failed via polling');
          return {
            success: false,
            completed: true,
            order,
            error: `Payment ${order.status}`,
            message: this.getFailureMessage(order.status),
            attempts,
          };
        }

        // Calculate next delay with exponential backoff
        if (attempts < maxAttempts) {
          const nextDelay = Math.min(currentDelay * 1.5, maxDelay);
          console.log(`⏱️ Next poll in ${nextDelay}ms (attempt ${attempts + 1})`);
          
          await this.delay(nextDelay);
          currentDelay = nextDelay;
        }

      } catch (error) {
        console.error(`❌ Polling attempt ${attempts} failed:`, error);
        onError?.(error instanceof Error ? error : new Error('Unknown polling error'));
        
        // For API errors, wait longer before retrying
        if (attempts < maxAttempts) {
          const errorDelay = Math.min(currentDelay * 2, maxDelay);
          console.log(`⏱️ Error recovery delay: ${errorDelay}ms`);
          await this.delay(errorDelay);
          currentDelay = errorDelay;
        }
      }
    }

    // Max attempts reached
    console.log('🔄 Max polling attempts reached');
    return {
      success: false,
      completed: true,
      error: 'Max polling attempts reached',
      message: 'Payment monitoring completed - status may still be processing',
      attempts,
    };
  }

  /**
   * Check if payment is settled (successful)
   * Based on official PayCrest specification
   */
  private isSettled(order: PaycrestOrder): boolean {
    // 'validated' means funds sent to recipient (transaction successful)
    if (order.status === 'validated') {
      return true;
    }

    // 'settled' means blockchain completion (also successful)
    if (order.status === 'settled') {
      return true;
    }

    // Check for transaction logs indicating success
    if (order.transactionLogs && order.transactionLogs.length > 0) {
      const hasValidatedLog = order.transactionLogs.some((log: { status: string }) => 
        log.status === 'validated' || log.status === 'settled'
      );
      const hasAmountPaid = order.amountPaid && parseFloat(order.amountPaid.toString()) > 0;
      
      return hasValidatedLog && Boolean(hasAmountPaid);
    }

    return false;
  }

  /**
   * Check if payment has failed
   */
  private isFailed(order: PaycrestOrder): boolean {
    const failedStatuses = ['failed', 'cancelled', 'expired', 'refunded'];
    return failedStatuses.includes(order.status);
  }

  /**
   * Get user-friendly failure message
   */
  private getFailureMessage(status: string): string {
    switch (status) {
      case 'expired':
        return 'Payment expired - no crypto transaction received in time';
      case 'refunded':
        return 'Payment was refunded due to processing issues';
      case 'cancelled':
        return 'Payment was cancelled';
      case 'failed':
        return 'Payment processing failed';
      default:
        return `Payment ${status}`;
    }
  }

  /**
   * Promise-based delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get single status check (non-polling)
   */
  async getOrderStatus(orderId: string): Promise<PaycrestOrder> {
    return await (this.paycrestService as { getOrderStatus: (id: string) => Promise<PaycrestOrder> }).getOrderStatus(orderId);
  }
}

/**
 * Factory function to create enhanced polling service
 */
export async function createEnhancedPollingService(): Promise<EnhancedPollingService> {
  const paycrestService = await getPaycrestService();
  return new EnhancedPollingService(paycrestService);
}

/**
 * Standalone polling function for simple use cases
 */
export async function pollPaymentStatus(
  orderId: string,
  options?: EnhancedPollingOptions
): Promise<PollingResult> {
  const service = await createEnhancedPollingService();
  return service.pollOrderStatus(orderId, options);
}