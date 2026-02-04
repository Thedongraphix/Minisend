'use client';

import { useState } from 'react';

interface FiltersState {
  search: string;
  status: string[];
  paymentType: string[];
  provider: string;
  currency: string[];
  dateRange: string;
}

interface TransactionFiltersProps {
  onFiltersChange: (filters: FiltersState) => void;
}

export function TransactionFilters({ onFiltersChange }: TransactionFiltersProps) {
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    status: [],
    paymentType: [],
    provider: 'all',
    currency: [],
    dateRange: '30d',
  });

  const updateFilters = (updates: Partial<FiltersState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const cleared: FiltersState = { search: '', status: [], paymentType: [], provider: 'all', currency: [], dateRange: '30d' };
    setFilters(cleared);
    onFiltersChange(cleared);
  };

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatus });
  };

  const togglePaymentType = (type: string) => {
    const newTypes = filters.paymentType.includes(type)
      ? filters.paymentType.filter((t) => t !== type)
      : [...filters.paymentType, type];
    updateFilters({ paymentType: newTypes });
  };

  const toggleCurrency = (cur: string) => {
    const newCurrency = filters.currency.includes(cur)
      ? filters.currency.filter((c) => c !== cur)
      : [...filters.currency, cur];
    updateFilters({ currency: newCurrency });
  };

  const hasActiveFilters = filters.search || filters.status.length > 0 || filters.paymentType.length > 0 || filters.provider !== 'all' || filters.currency.length > 0;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-[18px] h-[18px] text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search by tx hash, order ID, wallet, phone, receipt..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="w-full h-12 pl-11 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[15px] text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Provider Segmented Control */}
        <div className="flex items-center bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
          {[
            { value: 'all', label: 'All' },
            { value: 'pretium', label: 'Pretium' },
            { value: 'paycrest', label: 'Paycrest' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilters({ provider: opt.value })}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                filters.provider === opt.value
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-white/[0.06]" />

        {/* Status Segmented Control */}
        <div className="flex items-center bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
          {['pending', 'processing', 'completed', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                filters.status.includes(status)
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-white/[0.06]" />

        {/* Payment Type Segmented Control */}
        <div className="flex items-center bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
          {['MOBILE', 'BUY_GOODS', 'PAYBILL', 'BANK_TRANSFER'].map((type) => (
            <button
              key={type}
              onClick={() => togglePaymentType(type)}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                filters.paymentType.includes(type)
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {type === 'BUY_GOODS' ? 'Buy Goods' : type === 'PAYBILL' ? 'Paybill' : type === 'BANK_TRANSFER' ? 'Bank' : 'Mobile'}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-white/[0.06]" />

        {/* Currency Segmented Control */}
        <div className="flex items-center bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
          {['KES', 'NGN', 'UGX'].map((cur) => (
            <button
              key={cur}
              onClick={() => toggleCurrency(cur)}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                filters.currency.includes(cur)
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {cur}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-white/[0.06]" />

        {/* Date Range Dropdown */}
        <select
          value={filters.dateRange}
          onChange={(e) => updateFilters({ dateRange: e.target.value })}
          className="h-9 px-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white/70 focus:outline-none focus:border-white/20 cursor-pointer appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff40' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px', paddingRight: '32px' }}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="h-9 px-4 text-[13px] font-medium text-white/50 hover:text-white transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
