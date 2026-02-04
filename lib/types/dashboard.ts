import { PretiumOrder, Order } from '@/lib/supabase/config';

export interface UnifiedOrder {
  id: string;
  provider: 'pretium' | 'paycrest';
  orderId: string;
  walletAddress: string;
  transactionHash?: string;
  status: string;
  normalizedStatus: 'completed' | 'failed' | 'pending' | 'processing';
  amountInUsdc: number;
  amountInLocal: number;
  localCurrency: string;
  exchangeRate?: number;
  senderFee: number;
  paymentType: string;
  destination: string;
  accountName?: string;
  receiptNumber?: string;
  fid?: number;
  createdAt: string;
  completedAt?: string;
  raw: PretiumOrder | Order;
}

export interface ProviderStats {
  total: number;
  completed: number;
  failed: number;
  volume: number;
  successRate: number;
}

export interface CurrencyStats {
  orders: number;
  volume: number;
  localVolume: number;
}

export interface MonthlyTrend {
  month: string;
  pretiumVolume: number;
  paycrestVolume: number;
  totalVolume: number;
  orderCount: number;
}

export interface UnifiedDashboardStats {
  totalOrders: number;
  successRate: number;
  failedOrders: number;
  pendingOrders: number;
  totalUSDCVolume: number;
  uniqueWallets: number;
  newUsers: number;
  totalRevenue: number;
  stuckOrders: number;
  avgCompletionTime: number;

  providers: {
    pretium: ProviderStats;
    paycrest: ProviderStats;
  };

  currencies: Record<string, CurrencyStats>;

  monthlyTrends: MonthlyTrend[];
}

export interface UnifiedFilters {
  search?: string;
  status?: string[];
  paymentType?: string[];
  provider?: 'all' | 'pretium' | 'paycrest';
  currency?: string[];
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
