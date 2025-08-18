"use client";

import { useEffect, useState } from 'react';
import { getName } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

interface BasenameResolverProps {
  address: string;
  className?: string;
}

/**
 * Custom component that resolves and displays basenames for addresses
 * Falls back to showing truncated address if no basename is found
 */
export function BasenameResolver({ address, className = '' }: BasenameResolverProps) {
  const [displayName, setDisplayName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function resolveBasename() {
      if (!address) {
        setDisplayName('');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Try to get the basename for this address on Base chain
        const name = await getName({ address: address as `0x${string}`, chain: base });
        
        if (name) {
          setDisplayName(name);
        } else {
          // Fallback to truncated address
          setDisplayName(`${address.slice(0, 6)}...${address.slice(-4)}`);
        }
      } catch (error) {
        console.log('Error resolving basename:', error);
        // Fallback to truncated address
        setDisplayName(`${address.slice(0, 6)}...${address.slice(-4)}`);
      } finally {
        setIsLoading(false);
      }
    }

    resolveBasename();
  }, [address]);

  if (isLoading) {
    return (
      <span className={`inline-block ${className}`}>
        <span className="animate-pulse bg-gray-600 rounded h-4 w-20 inline-block"></span>
      </span>
    );
  }

  return (
    <span className={className} title={displayName !== `${address.slice(0, 6)}...${address.slice(-4)}` ? address : undefined}>
      {displayName}
    </span>
  );
}

/**
 * Hook for resolving basenames
 */
export function useBasenameResolver(address: string) {
  const [displayName, setDisplayName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function resolveBasename() {
      if (!address) {
        setDisplayName('');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Try to get the basename for this address on Base chain
        const name = await getName({ address: address as `0x${string}`, chain: base });
        
        if (name) {
          setDisplayName(name);
        } else {
          // Fallback to truncated address
          setDisplayName(`${address.slice(0, 6)}...${address.slice(-4)}`);
        }
      } catch (error) {
        console.log('Error resolving basename:', error);
        // Fallback to truncated address
        setDisplayName(`${address.slice(0, 6)}...${address.slice(-4)}`);
      } finally {
        setIsLoading(false);
      }
    }

    resolveBasename();
  }, [address]);

  return { displayName, isLoading };
}