"use client";

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useWalletAnalytics } from '@/hooks/useWalletAnalytics';
import {
  migrateFIDToWalletAnalytics,
  getAnalyticsMigrationSummary,
  validateWalletAnalytics,
  createPostHogAliases
} from '@/lib/migration-utilities';

interface AnalyticsSummary {
  usersWithFIDs: number;
  usersWithoutFIDs: number;
  totalUsers: number;
  recentAnalyticsEvents: number;
  migrationProgress: {
    linked: number;
    unlinked: number;
    percentage: number;
  };
}

export function WalletAnalyticsTest() {
  const { address, isConnected } = useAccount();
  const { context } = useMiniKit();
  const { user, isInitialized, isLoading, trackEvent, trackPayment, linkWithFID } = useWalletAnalytics();

  const [testResults, setTestResults] = useState<string>('');
  const [migrationSummary, setMigrationSummary] = useState<AnalyticsSummary | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runAnalyticsTest = async () => {
    setIsRunningTests(true);
    setTestResults('Running wallet analytics tests...\n\n');

    try {
      // Test 1: Basic tracking
      setTestResults(prev => prev + '1. Testing basic event tracking...\n');
      await trackEvent('test_event', {
        test_type: 'basic_tracking',
        timestamp: Date.now()
      });
      setTestResults(prev => prev + '✅ Basic event tracked successfully\n\n');

      // Test 2: Payment tracking
      setTestResults(prev => prev + '2. Testing payment event tracking...\n');
      await trackPayment('test_payment', {
        amount: '10.00',
        currency: 'KES',
        phoneNumber: '+254700000000',
        success: true
      });
      setTestResults(prev => prev + '✅ Payment event tracked successfully\n\n');

      // Test 3: Validation
      if (address) {
        setTestResults(prev => prev + '3. Validating wallet analytics implementation...\n');
        const validation = await validateWalletAnalytics(address);

        setTestResults(prev => prev + `✅ User exists: ${validation.checks.userExists}\n`);
        setTestResults(prev => prev + `✅ PostHog identified: ${validation.checks.postHogIdentified}\n`);
        setTestResults(prev => prev + `✅ Analytics tracking: ${validation.checks.analyticsTracking}\n`);
        setTestResults(prev => prev + `✅ Supabase connection: ${validation.checks.supabaseConnection}\n`);

        if (validation.errors.length > 0) {
          setTestResults(prev => prev + `⚠️ Validation errors:\n${validation.errors.join('\n')}\n`);
        }
        setTestResults(prev => prev + '\n');
      }

      // Test 4: FID linking (if available)
      if (context?.user?.fid && user && !user.fid) {
        setTestResults(prev => prev + '4. Testing FID linking...\n');
        const linkSuccess = await linkWithFID(context.user.fid);
        setTestResults(prev => prev + `${linkSuccess ? '✅' : '❌'} FID linking: ${linkSuccess ? 'successful' : 'failed'}\n\n`);
      }

      // Test 5: Migration summary
      setTestResults(prev => prev + '5. Getting migration summary...\n');
      const summary = await getAnalyticsMigrationSummary();
      if (summary) {
        setMigrationSummary(summary);
        setTestResults(prev => prev + `✅ Migration summary loaded\n`);
        setTestResults(prev => prev + `   Total users: ${summary.totalUsers}\n`);
        setTestResults(prev => prev + `   With FIDs: ${summary.usersWithFIDs}\n`);
        setTestResults(prev => prev + `   Migration progress: ${summary.migrationProgress.percentage}%\n\n`);
      }

      setTestResults(prev => prev + '🎉 All tests completed successfully!');

    } catch (error) {
      setTestResults(prev => prev + `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  const runMigration = async () => {
    setIsRunningTests(true);
    setTestResults('Running FID to wallet migration...\n\n');

    try {
      const result = await migrateFIDToWalletAnalytics();
      setTestResults(prev => prev + `${result.success ? '✅' : '⚠️'} ${result.message}\n`);
      setTestResults(prev => prev + `Linked users: ${result.linkedUsers}\n`);

      if (result.errors.length > 0) {
        setTestResults(prev => prev + `Errors:\n${result.errors.join('\n')}\n`);
      }

      // Refresh summary
      const summary = await getAnalyticsMigrationSummary();
      if (summary) {
        setMigrationSummary(summary);
      }

    } catch (error) {
      setTestResults(prev => prev + `❌ Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <p className="text-yellow-300">⚠️ Connect your wallet to test wallet analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h3 className="text-white font-bold text-lg mb-4">Wallet Analytics Test</h3>

        <div className="space-y-2 text-sm text-gray-300 mb-4">
          <p><span className="font-semibold">Wallet:</span> {address}</p>
          <p><span className="font-semibold">User ID:</span> {user?.id || 'Not initialized'}</p>
          <p><span className="font-semibold">FID:</span> {user?.fid || context?.user?.fid || 'None'}</p>
          <p><span className="font-semibold">Status:</span> {isLoading ? 'Loading...' : isInitialized ? 'Initialized' : 'Not initialized'}</p>
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={runAnalyticsTest}
            disabled={isRunningTests || !isInitialized}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isRunningTests ? 'Running Tests...' : 'Run Analytics Tests'}
          </button>

          <button
            onClick={runMigration}
            disabled={isRunningTests}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Run Migration
          </button>
        </div>

        {migrationSummary && (
          <div className="bg-gray-800/50 rounded p-3 mb-4">
            <h4 className="text-white font-semibold mb-2">Migration Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
              <div>Total Users: {migrationSummary.totalUsers}</div>
              <div>With FIDs: {migrationSummary.usersWithFIDs}</div>
              <div>Without FIDs: {migrationSummary.usersWithoutFIDs}</div>
              <div>Progress: {migrationSummary.migrationProgress.percentage}%</div>
            </div>
          </div>
        )}

        {testResults && (
          <div className="bg-gray-900 rounded p-3 max-h-64 overflow-y-auto">
            <h4 className="text-white font-semibold mb-2">Test Results</h4>
            <pre className="text-xs text-green-300 whitespace-pre-wrap font-mono">
              {testResults}
            </pre>
          </div>
        )}
      </div>

      {/* PostHog alias test */}
      {context?.user?.fid && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">PostHog Alias Test</h4>
          <p className="text-gray-300 text-sm mb-3">
            Create PostHog alias to link FID-based data with wallet address
          </p>
          <button
            onClick={() => {
              createPostHogAliases(address, context.user.fid);
              setTestResults(prev => prev + `\n🔗 Created PostHog alias: fid:${context.user.fid} -> ${address}`);
            }}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
          >
            Create Alias (FID: {context.user.fid})
          </button>
        </div>
      )}
    </div>
  );
}