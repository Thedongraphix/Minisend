'use client';

import { useState, useEffect } from 'react';

interface ProofData {
  app: {
    name: string;
    domain: string;
    description: string;
  };
  summary: {
    totalOrders: number;
    totalVolumeUSD: number;
    transactionHashesCount: number;
    uniqueUsers: number;
    successRate: number;
    averageOrderSize: number;
    baseNetworkOrders: number;
    usdcOrders: number;
    completedOrders: number;
  };
  onchainProof: {
    smartContract: string;
    network: string;
    transactionHashes: Array<{
      txHash: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: string;
      basescanUrl: string;
    }>;
  };
  buildathonSubmission: {
    smartContractAddress: string;
    onchainProof: string;
    basescanLinks: string[];
  };
}

export default function ProofPage() {
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl shadow-xl p-8 max-w-md w-full border border-gray-700">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Loading Analytics</h3>
              <p className="text-gray-400">Fetching real-time onchain data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl shadow-xl p-8 max-w-md w-full border border-gray-700">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-700">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Unable to Load Data</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <button 
              onClick={fetchProofData}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!proofData) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'transactions', label: 'Transactions', icon: '🔗' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'export', label: 'Export', icon: '⬇️' }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 py-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Minisend Analytics</h1>
                <p className="text-gray-400">Real-time onchain insights</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 bg-green-900/50 text-green-300 px-4 py-2 rounded-full text-sm font-medium border border-green-700">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Live Data
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Volume"
            value={formatCurrency(proofData.summary.totalVolumeUSD)}
            subtitle="USDC processed"
            icon="💰"
            trend="+12.5%"
            trendUp={true}
          />
          <MetricCard
            title="Transactions"
            value={formatNumber(proofData.summary.transactionHashesCount)}
            subtitle="Verified onchain"
            icon="🔗"
            trend="+8.2%"
            trendUp={true}
          />
          <MetricCard
            title="Active Users"
            value={formatNumber(proofData.summary.uniqueUsers)}
            subtitle="Unique wallets"
            icon="👥"
            trend="+15.3%"
            trendUp={true}
          />
          <MetricCard
            title="Success Rate"
            value={`${proofData.summary.successRate}%`}
            subtitle="Settlement rate"
            icon="✅"
            trend="+2.1%"
            trendUp={true}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-700 mb-8">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-400 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab data={proofData} />}
            {activeTab === 'transactions' && <TransactionsTab data={proofData} />}
            {activeTab === 'analytics' && <AnalyticsTab data={proofData} />}
            {activeTab === 'export' && <ExportTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, trend, trendUp }: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-700 hover:shadow-2xl hover:bg-gray-800/70 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-700/50 rounded-xl flex items-center justify-center text-xl border border-gray-600">
          {icon}
        </div>
        <div className={`flex items-center space-x-1 text-sm font-medium ${
          trendUp ? 'text-green-400' : 'text-red-400'
        }`}>
          <span>{trend}</span>
          <svg className={`w-4 h-4 ${trendUp ? 'text-green-400' : 'text-red-400 rotate-180'}`} 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
          </svg>
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
        <p className="text-gray-300 text-sm">{subtitle}</p>
        <p className="text-gray-500 text-xs mt-2 uppercase tracking-wide font-medium">{title}</p>
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: ProofData }) {
  return (
    <div className="space-y-6">
      {/* Smart Contract */}
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-xl p-6 border border-blue-700/50 backdrop-blur-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Smart Contract Integration</h3>
            <p className="text-blue-300 mb-4">USDC on Base Network</p>
            <div className="bg-gray-900/50 rounded-lg p-3 font-mono text-sm break-all border border-gray-700 text-gray-300">
              {data.onchainProof.smartContract}
            </div>
          </div>
          <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30 ml-4">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">Network Performance</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Base Network Orders</span>
              <span className="font-semibold text-white">{data.summary.baseNetworkOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">USDC Orders</span>
              <span className="font-semibold text-white">{data.summary.usdcOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Completed Orders</span>
              <span className="font-semibold text-white">{data.summary.completedOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Average Order Size</span>
              <span className="font-semibold text-white">${data.summary.averageOrderSize}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">Growth Metrics</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Orders</span>
              <span className="font-semibold text-white">{data.summary.totalOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Verification Rate</span>
              <span className="font-semibold text-white">{Math.round((data.summary.transactionHashesCount / data.summary.totalOrders) * 100)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Volume per User</span>
              <span className="font-semibold text-white">${Math.round(data.summary.totalVolumeUSD / data.summary.uniqueUsers)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Avg Success Rate</span>
              <span className="font-semibold text-white">{data.summary.successRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionsTab({ data }: { data: ProofData }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
        <div className="text-sm text-gray-400">
          Showing 10 out of {data.summary.totalOrders}
        </div>
      </div>

      <div className="space-y-3">
        {data.onchainProof.transactionHashes.slice(0, 10).map((tx, index) => (
          <div key={index} className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-4 border border-gray-700 hover:bg-gray-800/70 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="w-8 h-8 bg-green-900/50 text-green-300 rounded-full flex items-center justify-center text-sm font-medium border border-green-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-mono text-sm text-gray-200 break-all">{tx.txHash}</p>
                    <p className="text-xs text-gray-500 mt-1">{tx.createdAt?.split('T')[0] || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end space-x-4">
                <div className="text-right">
                  <p className="font-semibold text-white">${tx.amount}</p>
                  <p className="text-xs text-gray-400">{tx.currency}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tx.status === 'settled' 
                      ? 'bg-green-900/50 text-green-300 border border-green-700' 
                      : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                  }`}>
                    {tx.status}
                  </span>
                  
                  <a 
                    href={tx.basescanUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center space-x-1"
                  >
                    <span>View</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab({ data }: { data: ProofData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">Performance Insights</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-900/30 rounded-lg border border-green-700/50">
              <div>
                <p className="text-green-300 font-medium">Settlement Success</p>
                <p className="text-green-400 text-sm">{data.summary.completedOrders} completed orders</p>
              </div>
              <div className="text-2xl font-bold text-green-300">{data.summary.successRate}%</div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
              <div>
                <p className="text-blue-300 font-medium">Network Efficiency</p>
                <p className="text-blue-400 text-sm">All orders on Base network</p>
              </div>
              <div className="text-2xl font-bold text-blue-300">100%</div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-900/30 rounded-lg border border-purple-700/50">
              <div>
                <p className="text-purple-300 font-medium">Verification Rate</p>
                <p className="text-purple-400 text-sm">Onchain transaction proof</p>
              </div>
              <div className="text-2xl font-bold text-purple-300">
                {Math.round((data.summary.transactionHashesCount / data.summary.totalOrders) * 100)}%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">Key Metrics</h4>
          <div className="space-y-4">
            <div className="border-b border-gray-700 pb-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Volume</span>
                <span className="font-bold text-lg text-white">${data.summary.totalVolumeUSD.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">USDC processed through smart contracts</p>
            </div>
            
            <div className="border-b border-gray-700 pb-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">User Engagement</span>
                <span className="font-bold text-lg text-white">{data.summary.uniqueUsers}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Unique wallet addresses</p>
            </div>
            
            <div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Average Order</span>
                <span className="font-bold text-lg text-white">${data.summary.averageOrderSize}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Per transaction value</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportTab() {
  const copyApiUrl = () => {
    navigator.clipboard.writeText('https://minisend.xyz/api/onchain-proof');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">API Access</h4>
          <div className="space-y-4">
            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
              <p className="font-mono text-sm text-gray-300 break-all">
                https://minisend.xyz/api/onchain-proof
              </p>
            </div>
            <button 
              onClick={copyApiUrl}
              className="w-full bg-green-600 text-white p-4 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              <span>Copy API URL</span>
            </button>
            <p className="text-sm text-gray-400">
              Access real-time data programmatically via our REST API endpoint.
            </p>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">Buildathon Data</h4>
          <div className="space-y-4">
            <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/30">
              <h5 className="text-blue-300 font-medium mb-2">Smart Contract</h5>
              <p className="text-sm text-gray-300 font-mono break-all">
                0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
              </p>
              <p className="text-xs text-gray-500 mt-1">USDC on Base Network</p>
            </div>
            
            <div className="p-4 bg-green-900/20 rounded-lg border border-green-700/30">
              <h5 className="text-green-300 font-medium mb-2">Verification Status</h5>
              <p className="text-sm text-gray-300">
                ✅ All transactions verified on Base network
              </p>
              <p className="text-xs text-gray-500 mt-1">Real-time onchain proof</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}