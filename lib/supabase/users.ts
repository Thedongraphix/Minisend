import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class UserService {
  // Upsert user by wallet address
  static async upsertUser({ wallet_address, preferred_currency }: { wallet_address: string; preferred_currency?: string }) {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        wallet_address,
        preferred_currency: preferred_currency || 'KES',
        last_active_at: new Date().toISOString()
      }, { onConflict: 'wallet_address' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Get user by wallet address
  static async getUserByWallet(wallet_address: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet_address)
      .single();
    if (error) throw error;
    return data;
  }

  // Update user stats (total_orders, total_volume, last_active_at)
  static async updateUserStats(wallet_address: string) {
    // Get all orders for this wallet
    const { data: orders, error } = await supabase
      .from('orders')
      .select('amount')
      .eq('wallet_address', wallet_address);
    if (error) throw error;
    const total_orders = orders?.length || 0;
    const total_volume = orders?.reduce((sum, o) => sum + Number(o.amount), 0) || 0;
    const { error: updateError } = await supabase
      .from('users')
      .update({
        total_orders,
        total_volume,
        last_active_at: new Date().toISOString()
      })
      .eq('wallet_address', wallet_address);
    if (updateError) throw updateError;
  }

  // Get all users (for admin/analytics)
  static async getAllUsers(limit: number = 100) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }
}