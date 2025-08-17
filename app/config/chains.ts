/**
 * Chain configuration for MetaWorkspace
 * Supports both Base Sepolia (testnet) and Base Mainnet (production)
 */

import { base, baseSepolia } from 'viem/chains';

export interface ChainConfig {
  chain: typeof base | typeof baseSepolia;
  rpcUrl: string;
  explorerUrl: string;
  contractAddress: `0x${string}`;
  name: string;
}

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  baseSepolia: '0x7EA575edDe56F6A7d5D711937B23afd16F061601' as const,
  base: '0x0000000000000000000000000000000000000000' as const, // TODO: Deploy to mainnet
} as const;

// Chain configurations
export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  baseSepolia: {
    chain: baseSepolia,
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    contractAddress: CONTRACT_ADDRESSES.baseSepolia,
    name: 'Base Sepolia (Testnet)'
  },
  base: {
    chain: base,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    contractAddress: CONTRACT_ADDRESSES.base,
    name: 'Base Mainnet'
  }
} as const;

/**
 * Get current chain configuration based on environment
 */
export function getCurrentChainConfig(): ChainConfig {
  // Check environment variable first
  const targetNetwork = process.env.NEXT_PUBLIC_TARGET_NETWORK;
  
  if (targetNetwork && targetNetwork in CHAIN_CONFIGS) {
    console.log(`🔗 Using network from env: ${targetNetwork}`);
    return CHAIN_CONFIGS[targetNetwork];
  }

  // Fallback to environment-based detection
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isProduction) {
    console.log('🚀 Production mode: Using Base Mainnet');
    return CHAIN_CONFIGS.base;
  } else if (isDevelopment) {
    console.log('🧪 Development mode: Using Base Sepolia');
    return CHAIN_CONFIGS.baseSepolia;
  }
  
  // Default to testnet for safety
  console.log('⚠️ Unknown environment: Defaulting to Base Sepolia');
  return CHAIN_CONFIGS.baseSepolia;
}

/**
 * Get chain config by name
 */
export function getChainConfig(chainName: keyof typeof CHAIN_CONFIGS): ChainConfig {
  return CHAIN_CONFIGS[chainName];
}

/**
 * Check if contract is deployed on current network
 */
export function isContractDeployed(config: ChainConfig): boolean {
  return config.contractAddress !== '0x0000000000000000000000000000000000000000';
}

export default getCurrentChainConfig;
