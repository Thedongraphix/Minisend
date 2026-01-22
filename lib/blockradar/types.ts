/**
 * TypeScript type definitions for Blockradar API
 */

export interface BlockradarApiError {
  statusCode: number;
  message: string;
  data?: unknown;
}

export interface BlockradarBlockchain {
  createdAt: string;
  derivationPath: string;
  id: string;
  isActive: boolean;
  isEvmCompatible: boolean;
  logoUrl: string;
  name: string;
  slug: string;
  symbol: string;
  tokenStandard: string | null;
  updatedAt: string;
}

export interface BlockradarAMLStatus {
  message: string;
  provider: string;
  status: string;
}

export interface BlockradarConfigurations {
  aml: BlockradarAMLStatus;
  disableAutoSweep: boolean;
  enableGaslessWithdraw: boolean;
  showPrivateKey: boolean;
}

export interface BlockradarAddressData {
  address: string;
  blockchain: BlockradarBlockchain;
  configurations: BlockradarConfigurations;
  createdAt: string;
  derivationPath: string;
  id: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  name: string | null;
  network: 'mainnet' | 'testnet';
  privateKey?: string; // Only present if showPrivateKey=true
  type: 'INTERNAL' | 'EXTERNAL';
  updatedAt: string;
}

export interface BlockradarAddressResponse {
  data: BlockradarAddressData;
  message: string;
  statusCode: number;
}

export interface BlockradarAssetDetails {
  address: string;
  blockchain: BlockradarBlockchain;
  createdAt: string;
  decimals: number;
  id: string;
  isActive: boolean;
  logoUrl: string;
  name: string;
  network: 'mainnet' | 'testnet';
  standard: string | null;
  symbol: string;
  updatedAt: string;
}

export interface BlockradarWalletAsset {
  asset: BlockradarAssetDetails;
  createdAt: string;
  id: string;
  isActive: boolean;
  updatedAt: string;
}

export interface BlockradarBalanceItem {
  asset: BlockradarWalletAsset;
  balance: string;
  convertedBalance: string;
}

export interface BlockradarBalancesResponse {
  data: BlockradarBalanceItem[];
  message: string;
  statusCode: number;
}

// Legacy type for backwards compatibility
export interface BlockradarAsset {
  createdAt: string;
  currency: string;
  decimals: number;
  id: string;
  isActive: boolean;
  isNative: boolean;
  logoUrl: string;
  name: string;
  network: 'mainnet' | 'testnet';
  symbol: string;
  updatedAt: string;
}

export interface BlockradarBalanceData {
  asset: BlockradarAsset;
  balance: string;
  convertedBalance: string;
}

export interface BlockradarBalanceResponse {
  data: BlockradarBalanceData;
  message: string;
  statusCode: number;
}

// Withdraw types
export interface BlockradarWithdrawRequest {
  assetId: string;
  address: string;
  amount: string;
  reference?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface BlockradarWithdrawData {
  id: string;
  hash: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: string;
  recipientAddress: string;
  reference?: string;
  note?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface BlockradarWithdrawResponse {
  data: BlockradarWithdrawData;
  message: string;
  statusCode: number;
}

// Assets types
export interface BlockradarAssetInfo {
  id: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  network: 'mainnet' | 'testnet';
  logoUrl: string;
  blockchain: BlockradarBlockchain;
}

export interface BlockradarAssetsResponse {
  data: BlockradarAssetInfo[];
  message: string;
  statusCode: number;
}

