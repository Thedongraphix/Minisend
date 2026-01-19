/**
 * Blockradar Module Exports
 * Central export point for all Blockradar-related utilities
 */

// Client
export { blockradarClient } from './client';

// Configuration
export { BLOCKRADAR_CONFIG, validateBlockradarConfig, getBlockradarHeaders } from './config';

// Types
export type {
  BlockradarApiError,
  BlockradarBlockchain,
  BlockradarAMLStatus,
  BlockradarConfigurations,
  BlockradarAddressData,
  BlockradarAddressResponse,
  BlockradarAssetDetails,
  BlockradarWalletAsset,
  BlockradarBalanceItem,
  BlockradarBalancesResponse,
  // Legacy types for backwards compatibility
  BlockradarAsset,
  BlockradarBalanceData,
  BlockradarBalanceResponse,
} from './types';

