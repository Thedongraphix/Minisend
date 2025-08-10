'use client';

import { useState, useEffect } from 'react';

interface Transaction {
  orderId: string;
  txHash?: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  basescanUrl?: string;
  network: string;
  userId: string;
}

interface ProofData {
  summary: {
    totalOrders: number;
    totalVolumeUSD: number;
    transactionHashesCount: number;
    uniqueUsers: number;
    successRate: number;
    averageOrderSize: number;
    completedOrders: number;
    growthMetrics: {
      volumeGrowth: number;
      transactionsGrowth: number;
      usersGrowth: number;
      successRateGrowth: number;
    };
  };
  onchainProof: {
    smartContract: string;
    network: string;
    allOrders: Transaction[];
    transactionHashes: Transaction[];
  };
}

export default function ProofPage() {
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  
  const transactionsPerPage = 20; // Reduced for better admin navigation

  useEffect(() => {
    fetchProofData();
  }, []);

  const fetchProofData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/onchain-proof');
      if (!response.ok) {
        throw new Error('Failed to fetch proof data');
      }
      const data = await response.json();
      setProofData(data.proof);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Loading onchain data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 className="text-white font-medium mb-2">Unable to load data</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button 
            onClick={fetchProofData}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!proofData) return null;

  // Filter ALL orders (not just those with txHash)
  const filteredTransactions = proofData.onchainProof.allOrders.filter(tx => 
    (tx.txHash && tx.txHash.toLowerCase().includes(searchTerm.toLowerCase())) ||
    tx.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginate filtered transactions
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + transactionsPerPage);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="text-xl font-medium text-white">Minisend</h1>
                <p className="text-sm text-gray-500">Onchain Activity Proof</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm border border-green-500/20">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <MetricCard
            label="Total Volume"
            value={`$${proofData.summary.totalVolumeUSD.toLocaleString()}`}
            sublabel="USDC processed"
            growth={proofData.summary.growthMetrics.volumeGrowth}
          />
          <MetricCard
            label="Transactions"
            value={proofData.summary.transactionHashesCount.toString()}
            sublabel="Onchain verified"
            growth={proofData.summary.growthMetrics.transactionsGrowth}
          />
          <MetricCard
            label="Success Rate"
            value={`${proofData.summary.successRate}%`}
            sublabel="Settlement rate"
            growth={proofData.summary.growthMetrics.successRateGrowth}
          />
          <MetricCard
            label="Unique Users"
            value={proofData.summary.uniqueUsers.toString()}
            sublabel="Wallet addresses"
            growth={proofData.summary.growthMetrics.usersGrowth}
          />
        </div>

        {/* Smart Contract Info */}
        <div className="mb-8">
          <div className="border border-gray-800/50 rounded-2xl p-6 bg-[#111]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white mb-2">Smart Contract</h3>
                <p className="text-gray-400 text-sm mb-4">USDC on Base Network</p>
                <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-lg p-3">
                  <code className="text-gray-300 text-sm break-all font-mono">
                    {proofData.onchainProof.smartContract}
                  </code>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center ml-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-medium text-white">Transaction History</h2>
              <p className="text-sm text-gray-400">
                {filteredTransactions.length} of {proofData.summary.totalOrders} total orders
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 bg-[#111] border border-gray-800/50 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gray-600"
                />
                <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400 whitespace-nowrap">Page:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-16 px-2 py-1 bg-[#111] border border-gray-800/50 rounded text-white text-sm text-center focus:outline-none focus:border-gray-600"
                />
                <span className="text-sm text-gray-500">of {totalPages}</span>
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="border border-gray-800/50 rounded-2xl overflow-hidden bg-[#111]">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800/50">
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Transaction</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">User ID</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Amount</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Date</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">View</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((tx, index) => (
                    <tr key={tx.txHash} className="border-b border-gray-800/30 hover:bg-[#0a0a0a] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-800/50 rounded-full flex items-center justify-center text-xs text-gray-400 font-medium">
                            {startIndex + index + 1}
                          </div>
                          <div>
                            <p className="font-mono text-sm text-white break-all">
                              {tx.txHash ? `${tx.txHash.slice(0, 12)}...${tx.txHash.slice(-8)}` : 'No TX Hash'}
                            </p>
                            <p className="text-xs text-gray-500">ID: {tx.orderId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-mono text-sm text-gray-300 break-all">
                            {tx.userId === 'Unknown' ? 'Unknown' : `${tx.userId.slice(0, 8)}...${tx.userId.slice(-6)}`}
                          </p>
                          <p className="text-xs text-gray-500">Wallet Address</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-white font-medium">${tx.amount} USDC</p>
                          <p className="text-xs text-gray-500">→ {tx.currency}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'settled' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-gray-300">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        {tx.basescanUrl ? (
                          <a 
                            href={tx.basescanUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <span>View</span>
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">No TX</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-800/50">
              {paginatedTransactions.map((tx, index) => (
                <div key={tx.txHash} className="p-4 space-y-3">
                  {/* Header with number and status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-800/50 rounded-full flex items-center justify-center text-xs text-gray-400 font-medium">
                        {startIndex + index + 1}
                      </div>
                      <span className="text-sm font-medium text-white">Transaction {startIndex + index + 1}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      tx.status === 'settled' 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {tx.status}
                    </span>
                  </div>

                  {/* Transaction Hash */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Transaction Hash</p>
                    <p className="font-mono text-sm text-white break-all">
                      {tx.txHash || 'No transaction hash yet'}
                    </p>
                  </div>

                  {/* User and Amount Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">User Wallet</p>
                      <p className="font-mono text-sm text-gray-300">
                        {tx.userId === 'Unknown' ? 'Unknown' : `${tx.userId.slice(0, 6)}...${tx.userId.slice(-4)}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Amount</p>
                      <p className="text-sm font-medium text-white">${tx.amount} USDC</p>
                      <p className="text-xs text-gray-500">→ {tx.currency}</p>
                    </div>
                  </div>

                  {/* Date and View Row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Date</p>
                      <p className="text-sm text-gray-300">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    {tx.basescanUrl ? (
                      <a 
                        href={tx.basescanUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                      >
                        <span>View on BaseScan</span>
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                      </a>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 bg-gray-500/10 text-gray-400 rounded-lg text-sm border border-gray-500/20">
                        <span>Pending TX</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-800/50 px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Page Info */}
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-gray-400">
                      Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Showing {startIndex + 1}-{Math.min(startIndex + transactionsPerPage, filteredTransactions.length)} of {filteredTransactions.length} orders
                    </p>
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-900/50 disabled:cursor-not-allowed border border-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                      </svg>
                      <span>Previous</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {/* First page */}
                      {currentPage > 3 && (
                        <>
                          <button
                            onClick={() => setCurrentPage(1)}
                            className="px-2 py-1 text-sm rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                          >
                            1
                          </button>
                          {currentPage > 4 && <span className="px-1 text-gray-500 text-sm">...</span>}
                        </>
                      )}

                      {/* Page numbers around current page */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                        const pageNumber = startPage + i;
                        if (pageNumber > totalPages || pageNumber < 1) return null;
                        
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`px-2 py-1 text-sm rounded transition-colors ${
                              currentPage === pageNumber
                                ? 'bg-white text-black font-medium'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}

                      {/* Last page */}
                      {currentPage < totalPages - 2 && totalPages > 5 && (
                        <>
                          {currentPage < totalPages - 3 && <span className="px-1 text-gray-500 text-sm">...</span>}
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            className="px-2 py-1 text-sm rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-900/50 disabled:cursor-not-allowed border border-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors text-sm"
                    >
                      <span>Next</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </button>
                  </div>

                  {/* Jump to Page Input */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Jump to:</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= totalPages) {
                          setCurrentPage(page);
                        }
                      }}
                      className="w-16 px-2 py-1 bg-gray-900 border border-gray-800 rounded text-white text-sm text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API Access */}
        <div className="mt-12">
          <div className="border border-gray-800/50 rounded-2xl p-6 bg-[#111]">
            <h3 className="text-lg font-medium text-white mb-4">API Access</h3>
            <div className="space-y-4">
              <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-lg p-3">
                <code className="text-gray-300 text-sm break-all font-mono">
                  https://minisend.xyz/api/onchain-proof
                </code>
              </div>
              <button 
                onClick={async () => {
                  await navigator.clipboard.writeText('https://minisend.xyz/api/onchain-proof');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium min-w-[120px]"
              >
                {copied ? 'Copied!' : 'Copy API URL'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sublabel, growth }: { 
  label: string; 
  value: string; 
  sublabel: string; 
  growth?: number;
}) {
  const formatGrowth = (growth: number) => {
    if (growth === 0) return '0.0%';
    return growth > 0 ? `+${growth}%` : `${growth}%`;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-400';
    if (growth < 0) return 'text-red-400';
    return 'text-gray-500';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) {
      return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
        </svg>
      );
    }
    if (growth < 0) {
      return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </svg>
      );
    }
    return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
      </svg>
    );
  };

  return (
    <div className="border border-gray-800/50 rounded-2xl p-6 bg-[#111]">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">{label}</p>
          {growth !== undefined && (
            <div className={`flex items-center gap-1 text-xs ${getGrowthColor(growth)}`}>
              {getGrowthIcon(growth)}
              <span>{formatGrowth(growth)}</span>
            </div>
          )}
        </div>
        <p className="text-2xl font-medium text-white">{value}</p>
        <p className="text-xs text-gray-500">{sublabel}</p>
      </div>
    </div>
  );
}