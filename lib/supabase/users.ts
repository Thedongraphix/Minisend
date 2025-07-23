import { supabaseAdmin } from './config';
import { User, UserInsert, UserUpdate } from './types';

export class UserService {
  
  /**
   * Create or get user by wallet address
   */
  static async upsertUser(userData: UserInsert): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(userData, { 
        onConflict: 'wallet_address',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user:', error);
      throw new Error(`Failed to upsert user: ${error.message}`);
    }

    console.log('User upserted successfully:', {
      id: data.id,
      wallet_address: data.wallet_address,
      farcaster_username: data.farcaster_username
    });

    return data;
  }

  /**
   * Get user by wallet address
   */
  static async getUserByWallet(walletAddress: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('Error fetching user:', error);
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
  }

  /**
   * Get user by Farcaster FID
   */
  static async getUserByFarcasterFid(fid: number): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('farcaster_fid', fid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user by FID:', error);
      throw new Error(`Failed to fetch user by FID: ${error.message}`);
    }

    return data;
  }

  /**
   * Update user profile
   */
  static async updateUser(
    walletAddress: string, 
    updates: UserUpdate
  ): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('wallet_address', walletAddress)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }

    console.log('User updated successfully:', {
      wallet_address: data.wallet_address,
      updates: Object.keys(updates)
    });

    return data;
  }

  /**
   * Link Farcaster account to wallet
   */
  static async linkFarcasterAccount(
    walletAddress: string,
    farcasterFid: number,
    farcasterUsername: string
  ): Promise<User> {
    return this.updateUser(walletAddress, {
      farcaster_fid: farcasterFid,
      farcaster_username: farcasterUsername
    });
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    walletAddress: string,
    preferences: {
      currency?: string;
      notifications?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ): Promise<User> {
    const updates: UserUpdate = {};
    
    if (preferences.currency) {
      updates.preferred_currency = preferences.currency;
    }
    
    if (preferences.notifications) {
      updates.notification_preferences = preferences.notifications;
    }
    
    if (preferences.metadata) {
      updates.metadata = preferences.metadata;
    }

    return this.updateUser(walletAddress, updates);
  }

  /**
   * Get user transaction summary
   */
  static async getUserTransactionSummary(walletAddress: string) {
    const { data, error } = await supabaseAdmin
      .from('user_transaction_summary')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found, return empty summary
        return {
          wallet_address: walletAddress,
          farcaster_username: null,
          total_transactions: 0,
          successful_transactions: 0,
          pending_transactions: 0,
          refunded_transactions: 0,
          total_volume_usdc: 0,
          total_volume_local: 0,
          avg_exchange_rate: 0,
          first_transaction: null,
          last_transaction: null
        };
      }
      console.error('Error fetching user summary:', error);
      throw new Error(`Failed to fetch user summary: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all users (admin function)
   */
  static async getAllUsers(limit: number = 100, offset: number = 0): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching all users:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Search users by username
   */
  static async searchUsersByUsername(username: string): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .ilike('farcaster_username', `%${username}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching users:', error);
      throw new Error(`Failed to search users: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get user statistics
   */
  static async getUserStats() {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('created_at, farcaster_fid, preferred_currency');

    if (error) {
      console.error('Error fetching user stats:', error);
      throw new Error(`Failed to fetch user stats: ${error.message}`);
    }

    const users = data || [];
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total_users: users.length,
      farcaster_users: users.filter(u => u.farcaster_fid).length,
      users_last_24h: users.filter(u => new Date(u.created_at) > dayAgo).length,
      users_last_week: users.filter(u => new Date(u.created_at) > weekAgo).length,
      users_last_month: users.filter(u => new Date(u.created_at) > monthAgo).length,
      currency_breakdown: users.reduce((acc, user) => {
        acc[user.preferred_currency] = (acc[user.preferred_currency] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Delete user (admin only, for testing)
   */
  static async deleteUser(walletAddress: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('wallet_address', walletAddress);

    if (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    console.log('User deleted successfully:', walletAddress);
  }
}