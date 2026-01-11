/**
 * TypeScript type definitions for authentication system
 * Ensures type safety across the application
 */

export type Platform = 'farcaster' | 'baseapp' | 'web';

export interface MinisendUser {
  id: string;
  userId: string;
  platform: Platform;
  walletAddress?: string;
  minisendWallet?: string;
  blockradarAddressId?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

export interface AuthData {
  userId: string;
  platform: Platform;
  walletAddress?: string;
  token?: string;
  email?: string;
}

export interface WalletAssignmentResponse {
  minisendWallet: string;
  blockradarAddressId?: string;
  displayName?: string;
  avatarUrl?: string;
  existing: boolean;
}

export interface BaseAccountAuthResult {
  address: string;
  message: string;
  signature: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  sessionToken: string;
  platform: Platform;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

export interface AuthState {
  user: MinisendUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  platform: Platform;
  minisendWallet: string | null;
}

export interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}
