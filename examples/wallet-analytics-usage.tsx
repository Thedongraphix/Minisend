/**
 * Example: How to use wallet-based analytics in your components
 *
 * This example shows the transition from FID-based to wallet-based analytics
 * while maintaining compatibility with existing data.
 */

"use client";

import { useWalletAnalytics } from '@/hooks/useWalletAnalytics';
import { useAccount } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

// BEFORE: FID-based tracking
function OldAnalyticsExample() {
  const { context } = useMiniKit();

  const trackOldWay = () => {
    // Old way: Using FID as distinct_id
    const userId = context?.user?.fid ? `fid:${context.user.fid}` : undefined;

    // This worked but created user silos based on Farcaster identity
    console.log('Old tracking with FID:', userId);
  };

  return <button onClick={trackOldWay}>Track (Old Way)</button>;
}

// AFTER: Wallet-based tracking with FID linking
function NewAnalyticsExample() {
  const { address } = useAccount();
  const { context } = useMiniKit();
  const { user, trackEvent, trackPayment, linkWithFID } = useWalletAnalytics();

  const trackNewWay = async () => {
    // New way: Using wallet address as distinct_id
    await trackEvent('user_action', {
      action_type: 'button_click',
      component: 'NewAnalyticsExample'
    });

    console.log('New tracking with wallet:', address, 'User:', user);
  };

  const trackPaymentExample = async () => {
    // Track payment events with wallet context
    await trackPayment('payment_initiated', {
      amount: '50.00',
      currency: 'KES',
      phoneNumber: '+254700000000'
    });
  };

  const linkFIDExample = async () => {
    // Link wallet with FID to connect historical data
    if (context?.user?.fid) {
      const success = await linkWithFID(context.user.fid);
      console.log('FID linking result:', success);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={trackNewWay}
        className="block px-4 py-2 bg-blue-600 text-white rounded"
      >
        Track Event (New Way)
      </button>

      <button
        onClick={trackPaymentExample}
        className="block px-4 py-2 bg-green-600 text-white rounded"
      >
        Track Payment
      </button>

      {context?.user?.fid && !user?.fid && (
        <button
          onClick={linkFIDExample}
          className="block px-4 py-2 bg-purple-600 text-white rounded"
        >
          Link with FID {context.user.fid}
        </button>
      )}
    </div>
  );
}

// MIGRATION: Gradual transition approach
function HybridAnalyticsExample() {
  const { address } = useAccount();
  const { context } = useMiniKit();
  const { user, trackEvent } = useWalletAnalytics();

  const trackHybridWay = async () => {
    // Track with both methods during transition
    await trackEvent('hybrid_tracking', {
      // New wallet-based properties
      wallet_based: true,
      migration_phase: 'transition',

      // Legacy FID for linking
      legacy_fid: context?.user?.fid,

      // Additional context
      has_wallet: !!address,
      has_fid: !!context?.user?.fid,
      user_linked: !!user?.fid
    });
  };

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
      <h3 className="text-yellow-300 font-semibold mb-2">Migration Phase</h3>
      <p className="text-yellow-200 text-sm mb-3">
        During migration, both wallet and FID data are tracked for seamless transition.
      </p>
      <button
        onClick={trackHybridWay}
        className="px-4 py-2 bg-yellow-600 text-white rounded"
      >
        Track (Hybrid Mode)
      </button>
    </div>
  );
}

// COMPLETE EXAMPLE: Production usage
export function WalletAnalyticsUsageExample() {
  const { address, isConnected } = useAccount();
  const { context } = useMiniKit();
  const { user, isInitialized, trackEvent, trackPayment } = useWalletAnalytics();

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Connect your wallet to see analytics in action</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-white font-bold text-xl mb-4">Wallet Analytics Usage Examples</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700 rounded p-3">
            <h3 className="text-white font-semibold mb-2">Current User</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
              <p>User ID: {user?.id || 'Not created'}</p>
              <p>FID: {user?.fid || context?.user?.fid || 'None'}</p>
              <p>Status: {isInitialized ? 'Initialized' : 'Loading...'}</p>
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <h3 className="text-white font-semibold mb-2">Tracking Method</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Primary ID: {address}</p>
              <p>Method: Wallet-based</p>
              <p>Legacy Link: {user?.fid ? `fid:${user.fid}` : 'None'}</p>
              <p>PostHog: ✅ Identified</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <NewAnalyticsExample />
          <HybridAnalyticsExample />
        </div>
      </div>
    </div>
  );
}

/**
 * Key Benefits of Wallet-Based Analytics:
 *
 * 1. **Cross-Platform Tracking**: Same wallet, same user across all platforms
 * 2. **Persistent Identity**: Users keep their identity even if they change Farcaster clients
 * 3. **Payment Correlation**: Direct link between wallet transactions and user behavior
 * 4. **Privacy-First**: Users control their wallet, users control their data
 * 5. **Backward Compatibility**: FID linking preserves historical analytics data
 *
 * Implementation Steps:
 *
 * 1. Install new analytics: `import { useWalletAnalytics } from '@/hooks/useWalletAnalytics'`
 * 2. Replace FID calls: `trackEvent()` instead of manual PostHog calls
 * 3. Link historical data: `linkWithFID()` for existing users
 * 4. Monitor migration: Use analytics dashboard to track adoption
 * 5. Deprecate FID-only: Once migration is complete, remove old tracking code
 */