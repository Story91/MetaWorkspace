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
  baseSepolia: '0x1f6F0c63b25Eb3d29BDDc221C3048E0D6C889cb2' as const, // Old testnet
  base: '0x3e9747E50635bC453071504cf959CFbdD3F736e4' as const, // DEPLOYED TO MAINNET ✅
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

  // FORCE MAINNET: We've deployed to mainnet, always use Base Mainnet
  console.log('🚀 MetaWorkspace: Using Base Mainnet');
  return CHAIN_CONFIGS.base;
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
