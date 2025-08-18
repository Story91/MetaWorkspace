/**
 * API endpoint for real blockchain statistics
 * Fetches live data from MetaWorkspace NFT contract
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, type Address } from 'viem';
import { METAWORKSPACE_NFT_ABI } from '../../../constants/contractABI';
import { getCurrentChainConfig } from '../../../config/chains';
import { databaseService } from '../../../services/databaseService';

interface ContractStatistics {
  totalSupply: number;
  userBalance: number;
  userHasAIAccess: boolean;
  contractAddress: string;
  chainName: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get('user') as Address;

  try {
    // Initialize Viem client with current chain config
    const chainConfig = getCurrentChainConfig();
    const publicClient = createPublicClient({
      chain: chainConfig.chain,
      transport: http(chainConfig.rpcUrl)
    });

    console.log(`🔗 Statistics API using ${chainConfig.name}`);
    console.log(`📜 Contract: ${chainConfig.contractAddress}`);

    // Fetch total supply (total NFTs minted)
    const totalSupply = await publicClient.readContract({
      address: chainConfig.contractAddress,
      abi: METAWORKSPACE_NFT_ABI,
      functionName: 'totalSupply',
      args: []
    }) as bigint;

    let userBalance = 0;
    let userHasAIAccess = false;

    // If user address provided, get user-specific data
    if (userAddress) {
      try {
        // Get user's NFT balance
        const balance = await publicClient.readContract({
          address: chainConfig.contractAddress,
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'balanceOf',
          args: [userAddress]
        }) as bigint;

        // Check if user has AI access
        const hasAccess = await publicClient.readContract({
          address: chainConfig.contractAddress,
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'checkAIAccess',
          args: [userAddress]
        }) as boolean;

        userBalance = Number(balance);
        userHasAIAccess = hasAccess;

        console.log(`User ${userAddress}: ${userBalance} NFTs, AI Access: ${userHasAIAccess}`);
      } catch (userError) {
        console.error('Error fetching user data:', userError);
        // Continue with default values
      }
    }

    // Calculate hours and tasks from NFT count
    const hoursLogged = userBalance * 1.2; // 1.2 hours per NFT
    const tasksCompleted = userBalance;

    // Save/update user stats in database
    if (userAddress) {
      await databaseService.updateUserStats(
        userAddress,
        userBalance,
        hoursLogged,
        tasksCompleted,
        userHasAIAccess
      );
    }

    // Update global stats in database
    await databaseService.updateGlobalStats(
      Number(totalSupply),
      0, // We'll calculate unique users separately
      Number(totalSupply) * 1.2, // Total hours estimate
      0  // We'll calculate AI users separately
    );

    const statistics: ContractStatistics = {
      totalSupply: Number(totalSupply),
      userBalance,
      userHasAIAccess,
      contractAddress: chainConfig.contractAddress,
      chainName: chainConfig.name
    };

    console.log('Contract statistics:', statistics);

    return NextResponse.json(statistics);

  } catch (error) {
    console.error('Error fetching contract statistics:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch contract statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
