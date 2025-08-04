"use client";

import { useAccount, useChainId } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

export function WalletDebug() {
  const { address, isConnected, connector } = useAccount();
  const { context } = useMiniKit();
  const chainId = useChainId();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs max-w-xs z-50">
      <h4 className="font-bold mb-2">Debug Info</h4>
      <div className="space-y-1">
        <p>Connected: {isConnected ? '✅' : '❌'}</p>
        <p>Address: {address ? `${address.slice(0, 8)}...` : 'None'}</p>
        <p>Chain: {chainId}</p>
        <p>Connector: {connector?.name || 'None'}</p>
        <p>User FID: {context?.user?.fid || 'None'}</p>
        <p>Client: {context?.client?.clientFid || 'None'}</p>
        <p>Frame Added: {context?.client?.added ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}