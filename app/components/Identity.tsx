"use client";

import { base } from 'viem/chains';
import { Name, Avatar } from '@coinbase/onchainkit/identity';
import type { Address } from 'viem';

interface IdentityProps {
  address?: Address;
  showAvatar?: boolean;
  avatarSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Identity({
  address,
  showAvatar = false,
  avatarSize = 'sm',
  className = ''
}: IdentityProps) {
  if (!address) return null;

  const avatarClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showAvatar && (
        <Avatar className={avatarClasses[avatarSize]} />
      )}
      <Name 
        address={address} 
        chain={base}
        className="font-medium"
      />
    </div>
  );
}