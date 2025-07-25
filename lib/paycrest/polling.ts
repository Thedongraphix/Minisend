// Research-Based PayCrest Polling Service
// Implements intelligent polling with exponential backoff based on research findings

import { PaycrestService, PaycrestOrder } from './index';
import { OrderService } from '@/lib/supabase/orders';
import { AnalyticsService } from '@/lib/supabase/analytics';

export interface PollingResult {
  success: boolean;
  completed: boolean;
  order?: PaycrestOrder;
  error?: string;
  message?: string;
  timeoutReached?: boolean;
}

export interface PollingOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeoutMs?: number;
  exponentialFactor?: number;
}

export class PaycrestPollingService {
  private paycrestService: PaycrestService;
  
  // Public getter for accessing the PayCrest service
  public getPaycrestService(): PaycrestService {
    return this.paycrestService;
  }
  private defaultOptions: Required<PollingOptions> = {
    maxAttempts: 20,
    baseDelay: 3000, // 3 seconds
    maxDelay: 30000, // 30 seconds max
    timeoutMs: 600000, // 10 minutes
    exponentialFactor: 1.4
  };

  constructor(paycrestService: PaycrestService) {
    this.paycrestService = paycrestService;
  }

  /**
   * RESEARCH-BASED: Intelligent polling with exponential backoff
   * Only stops when order.status === 'settled' as per research findings
   */
  async pollOrderStatus(
    orderId: string,
    options: PollingOptions = {}
  ): Promise<PollingResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    let attempts = 0;

    console.log('🔄 RESEARCH-BASED POLLING STARTED:', {
      orderId,
      maxAttempts: opts.maxAttempts,
      baseDelay: opts.baseDelay,
      timeoutMs: opts.timeoutMs,
      exponentialFactor: opts.exponentialFactor
    });

    while (attempts < opts.maxAttempts) {
      try {
        // Check timeout
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > opts.timeoutMs) {
          console.log('⏰ POLLING TIMEOUT REACHED:', {
            orderId,
            elapsedTimeMs: elapsedTime,
            timeoutMs: opts.timeoutMs,
            attempts
          });
          
          return {
            success: false,
            completed: true,
            timeoutReached: true,
            error: 'Payment monitoring timeout - manual verification required',
            message: 'Check order status manually or contact support'
          };
        }

        // Make PayCrest API call
        const startRequestTime = Date.now();
        const order = await this.paycrestService.getOrderStatus(orderId);
        const responseTime = Date.now() - startRequestTime;

        // Track polling attempt in analytics
        await this.trackPollingAttempt(orderId, attempts + 1, order.status, responseTime);

        console.log(`🔍 POLLING ATTEMPT ${attempts + 1}/${opts.maxAttempts}:`, {
          orderId,
          status: order.status,
          responseTimeMs: responseTime,
          elapsedTimeMinutes: Math.round(elapsedTime / 60000 * 10) / 10,
          txHash: order.txHash,
          amountPaid: order.amountPaid
        });

        // RESEARCH-BASED: Check for definitive completion - ONLY 'settled' is success
        if (order.status === 'settled') {
          const totalTime = Date.now() - startTime;
          console.log('🎉 SETTLEMENT DETECTED - POLLING COMPLETE:', {
            orderId,
            finalStatus: order.status,
            totalTimeMs: totalTime,
            totalTimeMinutes: Math.round(totalTime / 60000 * 10) / 10,
            attempts: attempts + 1,
            txHash: order.txHash,
            amountPaid: order.amountPaid
          });

          // Track successful settlement
          await this.trackSettlement(orderId, order, Math.floor(totalTime / 1000));

          return {
            success: true,
            completed: true,
            order,
            message: 'Payment successfully delivered to recipient'
          };
        }

        // RESEARCH-BASED: Check for failure states
        if (['failed', 'cancelled'].includes(order.status)) {
          const totalTime = Date.now() - startTime;
          const errorMessage = order.status === 'failed' 
            ? 'Payment processing failed' 
            : 'Payment was cancelled';

          console.log('❌ PAYMENT FAILED - POLLING COMPLETE:', {
            orderId,
            finalStatus: order.status,
            totalTimeMs: totalTime,
            attempts: attempts + 1,
            errorMessage
          });

          return {
            success: false,
            completed: true,
            order,
            error: errorMessage,
            message: errorMessage
          };
        }

        // RESEARCH-BASED: Continue polling for ongoing states
        attempts++;
        if (attempts < opts.maxAttempts) {
          // Exponential backoff calculation
          const delay = Math.min(
            opts.baseDelay * Math.pow(opts.exponentialFactor, attempts), 
            opts.maxDelay
          );
          
          console.log(`⏳ NEXT POLL in ${delay/1000}s (attempt ${attempts + 1}):`, {
            orderId,
            currentStatus: order.status,
            progressMessage: this.getProgressMessage(order.status, order.transactions),
            nextDelayMs: delay
          });

          await this.sleep(delay);
        }

      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown polling error';
        
        console.error(`❌ POLLING ERROR (attempt ${attempts}):`, {
          orderId,
          error: errorMessage,
          attempts,
          maxAttempts: opts.maxAttempts
        });

        // Track failed polling attempt
        await this.trackPollingAttempt(orderId, attempts, 'error', 0, errorMessage);

        if (attempts >= opts.maxAttempts) {
          return {
            success: false,
            completed: true,
            error: `Order monitoring failed after ${attempts} attempts: ${errorMessage}`,
            message: 'Failed to monitor payment status'
          };
        }

        // Wait before retrying on error
        const errorDelay = Math.min(opts.baseDelay * attempts, opts.maxDelay);
        await this.sleep(errorDelay);
      }
    }

    // Maximum attempts reached
    console.log('🔄 MAX ATTEMPTS REACHED:', {
      orderId,
      attempts,
      maxAttempts: opts.maxAttempts,
      totalTimeMs: Date.now() - startTime
    });

    return {
      success: false,
      completed: true,
      error: 'Payment monitoring timeout - manual verification required',
      message: 'Maximum polling attempts reached'
    };
  }

  /**
   * RESEARCH-BASED: Three-layer settlement verification
   */
  async verifySettlement(orderId: string): Promise<{
    verified: boolean;
    reason: string;
    order?: PaycrestOrder;
  }> {
    try {
      const order = await this.paycrestService.getOrderStatus(orderId);

      // Layer 1: API Status Check
      if (order.status !== 'settled') {
        return { 
          verified: false, 
          reason: `Order not settled (status: ${order.status})`,
          order
        };
      }

      // Layer 2: Transaction Hash Verification
      if (!order.txHash) {
        return { 
          verified: false, 
          reason: 'Missing transaction hash',
          order
        };
      }

      // Layer 3: Amount Confirmation
      if (order.amountPaid) {
        const originalAmount = parseFloat(order.amount);
        const paidAmount = parseFloat(order.amountPaid);
        const amountMatch = Math.abs(originalAmount - paidAmount) < 0.01;

        if (!amountMatch) {
          return {
            verified: false,
            reason: `Amount mismatch: expected ${originalAmount}, paid ${paidAmount}`,
            order
          };
        }
      }

      console.log('✅ THREE-LAYER SETTLEMENT VERIFIED:', {
        orderId,
        status: order.status,
        txHash: order.txHash,
        amount: order.amount,
        amountPaid: order.amountPaid
      });

      return { 
        verified: true, 
        reason: 'Settlement verified through three-layer check',
        order
      };

    } catch (error) {
      return {
        verified: false,
        reason: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * RESEARCH-BASED: Get progress message based on order status and transactions
   */
  private getProgressMessage(
    status: string, 
    transactions?: Array<{ id: string; status: string; type: string; amount: string; timestamp: string }>
  ): string {
    // Check for crypto deposit confirmation
    if (transactions?.some(tx => tx.status === 'crypto_deposited')) {
      return 'Crypto received, processing fiat transfer...';
    }

    // Status-based messages
    switch (status) {
      case 'initiated':
        return 'Waiting for crypto deposit...';
      case 'pending':
        return 'Processing payment through liquidity providers...';
      default:
        return 'Converting payment...';
    }
  }

  /**
   * Track polling attempt in database
   */
  private async trackPollingAttempt(
    orderId: string,
    attemptNumber: number,
    status: string,
    responseTimeMs: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Get order from database to get internal UUID
      const dbOrder = await OrderService.getOrderByPaycrestId(orderId);
      if (!dbOrder) {
        console.warn('Could not find database order for polling tracking:', orderId);
        return;
      }

      // Use the database client directly since we don't have a polling service in Supabase
      const supabase = (await import('@/lib/supabase/config')).supabase;
      
      await supabase
        .from('polling_attempts')
        .insert({
          order_id: dbOrder.id,
          attempt_number: attemptNumber,
          status,
          response_time_ms: responseTimeMs,
          error_message: errorMessage
        });

    } catch (error) {
      console.error('Failed to track polling attempt:', error);
      // Don't throw - this is just for analytics
    }
  }

  /**
   * Track successful settlement
   */
  private async trackSettlement(
    orderId: string,
    order: PaycrestOrder,
    settlementTimeSeconds: number
  ): Promise<void> {
    try {
      const dbOrder = await OrderService.getOrderByPaycrestId(orderId);
      if (!dbOrder) {
        console.warn('Could not find database order for settlement tracking:', orderId);
        return;
      }

      // Track settlement in settlements table
      const supabase = (await import('@/lib/supabase/config')).supabase;
      
      await supabase
        .from('settlements')
        .insert({
          order_id: dbOrder.id,
          status: order.status,
          settlement_time_seconds: settlementTimeSeconds,
          tx_hash: order.txHash,
          amount_paid: order.amountPaid ? parseFloat(order.amountPaid) : undefined,
          recipient_phone: order.recipient?.accountIdentifier,
          recipient_name: order.recipient?.accountName,
          currency: order.recipient?.currency
        });

      // Track analytics event
      await AnalyticsService.trackPaymentCompleted(
        dbOrder.wallet_address,
        dbOrder.id,
        Number(dbOrder.amount),
        dbOrder.currency,
        settlementTimeSeconds
      );

      // Update order with settlement information
      await OrderService.updateOrderWithSettlement(orderId, {
        status: 'settled',
        settled_at: new Date().toISOString(),
        settlement_time_seconds: settlementTimeSeconds,
        tx_hash: order.txHash,
        amount_paid: order.amountPaid ? parseFloat(order.amountPaid) : undefined
      });

      console.log('📊 Settlement tracking completed:', {
        orderId,
        dbOrderId: dbOrder.id,
        settlementTimeSeconds,
        txHash: order.txHash,
        amountPaid: order.amountPaid
      });

    } catch (error) {
      console.error('Failed to track settlement:', error);
      // Don't throw - the polling success should not fail due to analytics issues
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Monitor payment with timeout handling
   */
  async monitorPayCrestPayment(orderId: string): Promise<PollingResult> {
    const TIMEOUT_MS = 600000; // 10 minutes maximum

    try {
      const result = await Promise.race([
        this.pollOrderStatus(orderId),
        new Promise<PollingResult>((_, reject) =>
          setTimeout(() => reject(new Error('Payment monitoring timeout')), TIMEOUT_MS)
        )
      ]);

      return result;

    } catch (error) {
      // Implement fallback for timeout scenarios
      return {
        success: false,
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Check order status manually or contact support',
        timeoutReached: true
      };
    }
  }
}

/**
 * Factory function to create polling service
 */
export async function createPollingService(): Promise<PaycrestPollingService> {
  const { getPaycrestService } = await import('./config');
  const paycrestService = await getPaycrestService();
  return new PaycrestPollingService(paycrestService);
}