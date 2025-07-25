import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class WebhookService {
  // Store a webhook event
  static async storeWebhookEvent({ event_type, paycrest_order_id, payload, signature, headers, user_agent }: {
    event_type: string;
    paycrest_order_id: string;
    payload: Record<string, unknown>;
    signature?: string;
    headers?: Record<string, string>;
    user_agent?: string | null;
  }) {
    const { data, error } = await supabase
      .from('webhook_events')
      .insert({
        event_type,
        paycrest_order_id,
        payload,
        signature,
        headers,
        user_agent
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Mark a webhook event as processed
  static async markWebhookProcessed(id: string, processed: boolean, error_message?: string) {
    const { data, error } = await supabase
      .from('webhook_events')
      .update({
        processed,
        processed_at: new Date().toISOString(),
        error_message
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Get webhook events (for admin/analytics)
  static async getWebhookEvents(limit: number = 50) {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }
}