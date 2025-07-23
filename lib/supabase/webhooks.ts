import { supabaseAdmin } from './config';
import { WebhookEvent, WebhookEventInsert, WebhookEventUpdate } from './types';

export class WebhookService {
  
  /**
   * Store webhook event
   */
  static async storeWebhookEvent(eventData: WebhookEventInsert): Promise<WebhookEvent> {
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .insert(eventData)
      .select()
      .single();

    if (error) {
      console.error('Error storing webhook event:', error);
      throw new Error(`Failed to store webhook event: ${error.message}`);
    }

    console.log('Webhook event stored successfully:', {
      id: data.id,
      event_type: data.event_type,
      paycrest_order_id: data.paycrest_order_id,
      processed: data.processed
    });

    return data;
  }

  /**
   * Mark webhook event as processed
   */
  static async markWebhookProcessed(
    webhookId: string,
    success: boolean,
    error?: string
  ): Promise<WebhookEvent> {
    const updates: WebhookEventUpdate = {
      processed: success,
      processed_at: new Date().toISOString(),
      ...(error && { processing_error: error })
    };

    const { data, error: updateError } = await supabaseAdmin
      .from('webhook_events')
      .update(updates)
      .eq('id', webhookId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating webhook event:', updateError);
      throw new Error(`Failed to update webhook event: ${updateError.message}`);
    }

    console.log('Webhook event marked as processed:', {
      id: data.id,
      processed: data.processed,
      success
    });

    return data;
  }

  /**
   * Get webhook events by order ID
   */
  static async getWebhookEventsByOrderId(paycrestOrderId: string): Promise<WebhookEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .select('*')
      .eq('paycrest_order_id', paycrestOrderId)
      .order('received_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhook events:', error);
      throw new Error(`Failed to fetch webhook events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get unprocessed webhook events
   */
  static async getUnprocessedWebhooks(limit: number = 50): Promise<WebhookEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .select('*')
      .eq('processed', false)
      .order('received_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching unprocessed webhooks:', error);
      throw new Error(`Failed to fetch unprocessed webhooks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get recent webhook events
   */
  static async getRecentWebhooks(limit: number = 100): Promise<WebhookEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent webhooks:', error);
      throw new Error(`Failed to fetch recent webhooks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get webhook events by type
   */
  static async getWebhookEventsByType(
    eventType: string,
    limit: number = 50
  ): Promise<WebhookEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .select('*')
      .eq('event_type', eventType)
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching webhook events by type:', error);
      throw new Error(`Failed to fetch webhook events by type: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get webhook statistics
   */
  static async getWebhookStats() {
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .select('event_type, processed, received_at');

    if (error) {
      console.error('Error fetching webhook stats:', error);
      throw new Error(`Failed to fetch webhook stats: ${error.message}`);
    }

    const events = data || [];
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      total_webhooks: events.length,
      processed_webhooks: events.filter(e => e.processed).length,
      unprocessed_webhooks: events.filter(e => !e.processed).length,
      webhooks_last_24h: events.filter(e => new Date(e.received_at) > dayAgo).length,
      webhooks_last_week: events.filter(e => new Date(e.received_at) > weekAgo).length,
      event_type_breakdown: events.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      processing_success_rate: events.length > 0 
        ? events.filter(e => e.processed).length / events.length 
        : 0
    };
  }

  /**
   * Retry failed webhook processing
   */
  static async retryFailedWebhook(webhookId: string): Promise<WebhookEvent> {
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .update({
        processed: false,
        processed_at: null,
        processing_error: null
      })
      .eq('id', webhookId)
      .select()
      .single();

    if (error) {
      console.error('Error retrying webhook:', error);
      throw new Error(`Failed to retry webhook: ${error.message}`);
    }

    console.log('Webhook marked for retry:', {
      id: data.id,
      event_type: data.event_type
    });

    return data;
  }

  /**
   * Clean up old webhook events (admin function)
   */
  static async cleanupOldWebhooks(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .delete()
      .lt('received_at', cutoffDate.toISOString())
      .eq('processed', true)
      .select('id');

    if (error) {
      console.error('Error cleaning up webhooks:', error);
      throw new Error(`Failed to cleanup webhooks: ${error.message}`);
    }

    const deletedCount = data?.length || 0;
    console.log(`Cleaned up ${deletedCount} old webhook events`);
    
    return deletedCount;
  }

  /**
   * Find duplicate webhook events
   */
  static async findDuplicateWebhooks(): Promise<WebhookEvent[]> {
    // This is a simplified approach - in practice you might want more sophisticated duplicate detection
    const { data, error } = await supabaseAdmin
      .rpc('find_duplicate_webhooks'); // You'd need to create this function in Supabase

    if (error) {
      console.error('Error finding duplicate webhooks:', error);
      // Return empty array if function doesn't exist
      return [];
    }

    return data || [];
  }

  /**
   * Delete webhook event (admin only)
   */
  static async deleteWebhookEvent(webhookId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('webhook_events')
      .delete()
      .eq('id', webhookId);

    if (error) {
      console.error('Error deleting webhook event:', error);
      throw new Error(`Failed to delete webhook event: ${error.message}`);
    }

    console.log('Webhook event deleted successfully:', webhookId);
  }
}