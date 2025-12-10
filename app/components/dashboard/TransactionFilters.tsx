'use client';

import { useState } from 'react';

interface FiltersState {
  search: string;
  status: string[];
  paymentType: string[];
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
    dateRange: '30d',
  });

  const updateFilters = (updates: Partial<FiltersState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const cleared = { search: '', status: [], paymentType: [], dateRange: '30d' };
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

  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Search transactions..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="w-full px-4 py-2 bg-[#111] border border-gray-800/50 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gray-600"
        />
        <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status Filter */}
        {['pending', 'processing', 'completed', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => toggleStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filters.status.includes(status)
                ? 'bg-white text-black'
                : 'bg-[#111] text-gray-400 hover:bg-gray-800 border border-gray-800/50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}

        <div className="h-6 w-px bg-gray-800/50" />

        {/* Payment Type Filter */}
        {['MOBILE', 'BUY_GOODS', 'PAYBILL'].map((type) => (
          <button
            key={type}
            onClick={() => togglePaymentType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filters.paymentType.includes(type)
                ? 'bg-white text-black'
                : 'bg-[#111] text-gray-400 hover:bg-gray-800 border border-gray-800/50'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}

        <div className="h-6 w-px bg-gray-800/50" />

        {/* Date Range */}
        <select
          value={filters.dateRange}
          onChange={(e) => updateFilters({ dateRange: e.target.value })}
          className="px-4 py-2 bg-[#111] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-gray-600 cursor-pointer"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>

        <div className="flex-1" />

        {/* Clear Filters */}
        {(filters.search || filters.status.length > 0 || filters.paymentType.length > 0) && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-[#111] hover:bg-gray-800 text-gray-400 rounded-lg text-sm font-medium transition-colors border border-gray-800/50"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
