"use client";

import { useAccount, useChainId } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { base } from 'viem/chains';
import { Name } from '@coinbase/onchainkit/identity';

export function WalletDebug() {
  const { address, isConnected, connector } = useAccount();
  const { context } = useMiniKit();
  const chainId = useChainId();

  if (process.env.NODE_ENV !== 'development') return null;

  const isInFarcaster = !!context?.user?.fid;

  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs max-w-xs z-50">
      <h4 className="font-bold mb-2">Debug Info</h4>
      <div className="space-y-1">
        <p>Environment: {isInFarcaster ? '🟢 Farcaster' : '🌐 Web'}</p>
        <p>Connected: {isConnected ? '✅' : '❌'}</p>
        <p>User: {address ? <Name address={address} chain={base} className="text-blue-300" /> : 'None'}</p>
        <p>Address: {address ? `${address.slice(0, 8)}...` : 'None'}</p>
        <p>Chain: {chainId}</p>
        <p>Connector: {connector?.name || 'None'}</p>
        {isInFarcaster && (
          <>
            <p>User FID: {context.user.fid}</p>
            <p>Client: {context?.client?.clientFid || 'None'}</p>
            <p>Frame Added: {context?.client?.added ? 'Yes' : 'No'}</p>
          </>
        )}
      </div>
    </div>
  );
}