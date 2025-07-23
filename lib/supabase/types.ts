// Supabase TypeScript types for MiniSend

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          wallet_address: string;
          farcaster_fid: number | null;
          farcaster_username: string | null;
          created_at: string;
          updated_at: string;
          preferred_currency: string;
          notification_preferences: Record<string, unknown>;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          farcaster_fid?: number | null;
          farcaster_username?: string | null;
          created_at?: string;
          updated_at?: string;
          preferred_currency?: string;
          notification_preferences?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          farcaster_fid?: number | null;
          farcaster_username?: string | null;
          created_at?: string;
          updated_at?: string;
          preferred_currency?: string;
          notification_preferences?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        };
      };
      payment_orders: {
        Row: {
          id: string;
          paycrest_order_id: string;
          paycrest_reference: string;
          user_id: string | null;
          wallet_address: string;
          amount: number;
          token: string;
          network: string;
          currency: string;
          exchange_rate: number;
          local_amount: number;
          sender_fee: number;
          transaction_fee: number;
          total_amount: number;
          recipient_name: string;
          recipient_phone: string;
          recipient_institution: string;
          recipient_currency: string;
          receive_address: string;
          valid_until: string | null;
          status: string;
          transaction_hash: string | null;
          block_number: number | null;
          gas_used: number | null;
          created_at: string;
          updated_at: string;
          validated_at: string | null;
          settled_at: string | null;
          metadata: Record<string, unknown>;
          error_details: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          paycrest_order_id: string;
          paycrest_reference: string;
          user_id?: string | null;
          wallet_address: string;
          amount: number;
          token?: string;
          network?: string;
          currency: string;
          exchange_rate: number;
          local_amount: number;
          sender_fee?: number;
          transaction_fee?: number;
          total_amount: number;
          recipient_name: string;
          recipient_phone: string;
          recipient_institution: string;
          recipient_currency: string;
          receive_address: string;
          valid_until?: string | null;
          status?: string;
          transaction_hash?: string | null;
          block_number?: number | null;
          gas_used?: number | null;
          created_at?: string;
          updated_at?: string;
          validated_at?: string | null;
          settled_at?: string | null;
          metadata?: Record<string, unknown>;
          error_details?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          paycrest_order_id?: string;
          paycrest_reference?: string;
          user_id?: string | null;
          wallet_address?: string;
          amount?: number;
          token?: string;
          network?: string;
          currency?: string;
          exchange_rate?: number;
          local_amount?: number;
          sender_fee?: number;
          transaction_fee?: number;
          total_amount?: number;
          recipient_name?: string;
          recipient_phone?: string;
          recipient_institution?: string;
          recipient_currency?: string;
          receive_address?: string;
          valid_until?: string | null;
          status?: string;
          transaction_hash?: string | null;
          block_number?: number | null;
          gas_used?: number | null;
          created_at?: string;
          updated_at?: string;
          validated_at?: string | null;
          settled_at?: string | null;
          metadata?: Record<string, unknown>;
          error_details?: Record<string, unknown> | null;
        };
      };
      webhook_events: {
        Row: {
          id: string;
          event_type: string;
          order_id: string | null;
          paycrest_order_id: string;
          payload: Record<string, unknown>;
          signature: string;
          processed: boolean;
          processed_at: string | null;
          processing_error: string | null;
          received_at: string;
          headers: Record<string, unknown> | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          event_type: string;
          order_id?: string | null;
          paycrest_order_id: string;
          payload: Record<string, unknown>;
          signature: string;
          processed?: boolean;
          processed_at?: string | null;
          processing_error?: string | null;
          received_at?: string;
          headers?: Record<string, unknown> | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          event_type?: string;
          order_id?: string | null;
          paycrest_order_id?: string;
          payload?: Record<string, unknown>;
          signature?: string;
          processed?: boolean;
          processed_at?: string | null;
          processing_error?: string | null;
          received_at?: string;
          headers?: Record<string, unknown> | null;
          user_agent?: string | null;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          event_name: string;
          user_id: string | null;
          wallet_address: string | null;
          order_id: string | null;
          properties: Record<string, unknown>;
          user_agent: string | null;
          ip_address: string | null;
          referrer: string | null;
          farcaster_context: Record<string, unknown> | null;
          timestamp: string;
          session_id: string | null;
          experiment_groups: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          event_name: string;
          user_id?: string | null;
          wallet_address?: string | null;
          order_id?: string | null;
          properties?: Record<string, unknown>;
          user_agent?: string | null;
          ip_address?: string | null;
          referrer?: string | null;
          farcaster_context?: Record<string, unknown> | null;
          timestamp?: string;
          session_id?: string | null;
          experiment_groups?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          event_name?: string;
          user_id?: string | null;
          wallet_address?: string | null;
          order_id?: string | null;
          properties?: Record<string, unknown>;
          user_agent?: string | null;
          ip_address?: string | null;
          referrer?: string | null;
          farcaster_context?: Record<string, unknown> | null;
          timestamp?: string;
          session_id?: string | null;
          experiment_groups?: Record<string, unknown>;
        };
      };
      carrier_detection_logs: {
        Row: {
          id: string;
          phone_number: string;
          detected_carrier: string;
          paycrest_provider: string;
          confidence_score: number;
          order_id: string | null;
          user_id: string | null;
          is_correct: boolean | null;
          actual_carrier: string | null;
          detected_at: string;
        };
        Insert: {
          id?: string;
          phone_number: string;
          detected_carrier: string;
          paycrest_provider: string;
          confidence_score?: number;
          order_id?: string | null;
          user_id?: string | null;
          is_correct?: boolean | null;
          actual_carrier?: string | null;
          detected_at?: string;
        };
        Update: {
          id?: string;
          phone_number?: string;
          detected_carrier?: string;
          paycrest_provider?: string;
          confidence_score?: number;
          order_id?: string | null;
          user_id?: string | null;
          is_correct?: boolean | null;
          actual_carrier?: string | null;
          detected_at?: string;
        };
      };
    };
    Views: {
      user_transaction_summary: {
        Row: {
          wallet_address: string;
          farcaster_username: string | null;
          total_transactions: number;
          successful_transactions: number;
          pending_transactions: number;
          refunded_transactions: number;
          total_volume_usdc: number;
          total_volume_local: number;
          avg_exchange_rate: number;
          first_transaction: string;
          last_transaction: string;
        };
      };
      daily_analytics: {
        Row: {
          date: string;
          total_orders: number;
          successful_orders: number;
          total_volume_usdc: number;
          total_volume_local: number;
          avg_exchange_rate: number;
          unique_users: number;
          unique_recipients: number;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type PaymentOrder = Database['public']['Tables']['payment_orders']['Row'];
export type PaymentOrderInsert = Database['public']['Tables']['payment_orders']['Insert'];
export type PaymentOrderUpdate = Database['public']['Tables']['payment_orders']['Update'];

export type WebhookEvent = Database['public']['Tables']['webhook_events']['Row'];
export type WebhookEventInsert = Database['public']['Tables']['webhook_events']['Insert'];
export type WebhookEventUpdate = Database['public']['Tables']['webhook_events']['Update'];

export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row'];
export type AnalyticsEventInsert = Database['public']['Tables']['analytics_events']['Insert'];

export type CarrierDetectionLog = Database['public']['Tables']['carrier_detection_logs']['Row'];
export type CarrierDetectionLogInsert = Database['public']['Tables']['carrier_detection_logs']['Insert'];

export type UserTransactionSummary = Database['public']['Views']['user_transaction_summary']['Row'];
export type DailyAnalytics = Database['public']['Views']['daily_analytics']['Row'];