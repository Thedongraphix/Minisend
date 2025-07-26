/**
 * Real-time payment status updates using Server-Sent Events (SSE)
 * This provides real-time updates when webhooks are received
 */

export interface PaymentEvent {
  type: 'status_update' | 'settlement' | 'validation' | 'error';
  orderId: string;
  status: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export class PaymentStatusStream {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(event: PaymentEvent) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private baseUrl: string = '/api/paycrest') {}

  /**
   * Subscribe to real-time updates for a specific order
   */
  subscribe(orderId: string, callback: (event: PaymentEvent) => void): () => void {
    if (!this.listeners.has(orderId)) {
      this.listeners.set(orderId, new Set());
    }
    
    this.listeners.get(orderId)!.add(callback);
    
    // Start SSE connection if not already connected
    if (!this.eventSource) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      const orderListeners = this.listeners.get(orderId);
      if (orderListeners) {
        orderListeners.delete(callback);
        if (orderListeners.size === 0) {
          this.listeners.delete(orderId);
        }
      }

      // Close connection if no more listeners
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  /**
   * Connect to the SSE endpoint
   */
  private connect(): void {
    if (this.eventSource) {
      return;
    }

    console.log('🔌 Connecting to payment status stream...');
    
    try {
      this.eventSource = new EventSource(`${this.baseUrl}/stream`);
      
      this.eventSource.onopen = () => {
        console.log('✅ Payment status stream connected');
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const paymentEvent: PaymentEvent = JSON.parse(event.data);
          this.handlePaymentEvent(paymentEvent);
        } catch (error) {
          console.error('Failed to parse payment event:', error);
        }
      };

      this.eventSource.onerror = () => {
        console.warn('Payment status stream error, attempting to reconnect...');
        this.handleConnectionError();
      };

      // Handle specific event types
      this.eventSource.addEventListener('payment_validated', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handlePaymentEvent({
            type: 'validation',
            orderId: data.orderId,
            status: 'validated',
            message: 'Payment successfully sent to recipient!',
            timestamp: data.timestamp || new Date().toISOString(),
            data
          });
        } catch (error) {
          console.error('Failed to parse validation event:', error);
        }
      });

      this.eventSource.addEventListener('payment_settled', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handlePaymentEvent({
            type: 'settlement',
            orderId: data.orderId,
            status: 'settled',
            message: 'Payment fully completed on blockchain',
            timestamp: data.timestamp || new Date().toISOString(),
            data
          });
        } catch (error) {
          console.error('Failed to parse settlement event:', error);
        }
      });

    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Handle incoming payment events
   */
  private handlePaymentEvent(event: PaymentEvent): void {
    console.log('📢 Received payment event:', event);
    
    const orderListeners = this.listeners.get(event.orderId);
    if (orderListeners) {
      orderListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in payment event callback:', error);
        }
      });
    }
  }

  /**
   * Handle connection errors with exponential backoff
   */
  private handleConnectionError(): void {
    this.disconnect();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log(`⏰ Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        if (this.listeners.size > 0) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached, giving up on real-time updates');
    }
  }

  /**
   * Disconnect from the SSE endpoint
   */
  private disconnect(): void {
    if (this.eventSource) {
      console.log('🔌 Disconnecting from payment status stream');
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Manually trigger a status check for an order
   */
  async checkOrderStatus(orderId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${orderId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.order) {
          this.handlePaymentEvent({
            type: 'status_update',
            orderId: result.order.id,
            status: result.order.status,
            message: result.order.isSettled ? 'Payment completed!' : 'Status updated',
            timestamp: new Date().toISOString(),
            data: result.order
          });
        }
      }
    } catch (error) {
      console.error('Failed to check order status:', error);
    }
  }

  /**
   * Clean up all connections and listeners
   */
  destroy(): void {
    this.listeners.clear();
    this.disconnect();
  }
}

// Singleton instance for global use
let globalPaymentStream: PaymentStatusStream | null = null;

export function getPaymentStatusStream(): PaymentStatusStream {
  if (!globalPaymentStream) {
    globalPaymentStream = new PaymentStatusStream();
  }
  return globalPaymentStream;
}

/**
 * React hook for easy real-time payment status subscription
 */
export function useRealtimePaymentStatus(
  orderId: string | null,
  onEvent?: (event: PaymentEvent) => void
): {
  isConnected: boolean;
  lastEvent: PaymentEvent | null;
  checkStatus: () => Promise<void>;
} {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<PaymentEvent | null>(null);
  
  useEffect(() => {
    if (!orderId) return;

    const stream = getPaymentStatusStream();
    
    const unsubscribe = stream.subscribe(orderId, (event) => {
      console.log('🔔 Real-time payment event:', event);
      setLastEvent(event);
      setIsConnected(true);
      onEvent?.(event);
    });

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [orderId, onEvent]);

  const checkStatus = useCallback(async () => {
    if (!orderId) return;
    const stream = getPaymentStatusStream();
    await stream.checkOrderStatus(orderId);
  }, [orderId]);

  return {
    isConnected,
    lastEvent,
    checkStatus,
  };
}

// Import React hooks at the top of the file for the hook
import { useState, useEffect, useCallback } from 'react';