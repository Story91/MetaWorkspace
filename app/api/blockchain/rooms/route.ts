import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { METAWORKSPACE_NFT_ABI } from '../../../constants/contractABI';



// Get the appropriate chain and RPC URL
const getChainConfig = () => {
  const isMainnet = process.env.NODE_ENV === 'production';
  return {
    chain: isMainnet ? base : baseSepolia,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || (isMainnet ? 'https://mainnet.base.org' : 'https://sepolia.base.org')
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userFarcaster = searchParams.get('user');
    const roomId = searchParams.get('roomId');

    const contractAddress = process.env.NEXT_PUBLIC_METAWORKSPACE_NFT_ADDRESS as Address;
    
    if (!contractAddress) {
      return NextResponse.json(
        { error: 'MetaWorkspace NFT contract not deployed' },
        { status: 500 }
      );
    }

    const { chain, rpcUrl } = getChainConfig();

    // Create public client for reading from blockchain
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl)
    });

    console.log('Querying rooms from blockchain:', { contractAddress, chain: chain.name });

    if (roomId) {
      // Check if room exists first
      const exists = await publicClient.readContract({
        address: contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'roomExists',
        args: [roomId]
      }) as boolean;

      if (!exists) {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        );
      }

      // Get room stats
      const roomStats = await publicClient.readContract({
        address: contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'getRoomStats',
        args: [roomId]
      }) as unknown as readonly [bigint, bigint, bigint];

      // Check user access - simplified for now
      const hasAccess = true; // All users have access for now
      // TODO: Implement proper room access control

      const room = {
        roomId,
        name: roomId, // Use roomId as name for now
        creator: '', // TODO: Get from events or store separately
        exists: true,
        stats: {
          totalNFTs: Number(roomStats[0]),
          voiceNFTs: Number(roomStats[1]),
          videoNFTs: Number(roomStats[2])
        },
        hasAccess
      };

      return NextResponse.json({
        success: true,
        room
      });
    }

    // Get all rooms - for now return demo rooms
    // TODO: Implement proper room enumeration when available
    const demoRooms = [
      'metaworkspace-main',
      'dev-team-standup',
      'marketing-brainstorm',
      'public-demo'
    ];

    const roomsData = await Promise.allSettled(
      demoRooms.map(async (roomId) => {
        try {
          // Check if room exists
          const exists = await publicClient.readContract({
            address: contractAddress,
            abi: METAWORKSPACE_NFT_ABI,
            functionName: 'roomExists',
            args: [roomId]
          }) as boolean;

          if (!exists) {
            return null;
          }

          // Get room stats
          const roomStats = await publicClient.readContract({
            address: contractAddress,
            abi: METAWORKSPACE_NFT_ABI,
            functionName: 'getRoomStats',
            args: [roomId]
          }) as unknown as readonly [bigint, bigint, bigint];

          const hasAccess = true; // All users have access for now
          // TODO: Implement proper room access control

          return {
            roomId,
            name: roomId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            creator: '',
            exists: true,
            stats: {
              totalNFTs: Number(roomStats[0]),
              voiceNFTs: Number(roomStats[1]),
              videoNFTs: Number(roomStats[2])
            },
            hasAccess,
            isPublic: roomId === 'public-demo'
          };
        } catch (error) {
          console.error(`Error fetching room ${roomId}:`, error);
          return null;
        }
      })
    );

    interface RoomDataResult {
      roomId: string;
      name: string;
      creator: string;
      exists: boolean;
      stats: {
        totalNFTs: number;
        voiceNFTs: number;
        videoNFTs: number;
      };
      hasAccess: boolean;
      isPublic: boolean;
    }
    
    const rooms = roomsData
      .filter((result): result is PromiseFulfilledResult<RoomDataResult> => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);

    const filteredRooms = userFarcaster 
      ? rooms.filter(room => room.hasAccess || room.isPublic)
      : rooms;

    return NextResponse.json({
      success: true,
      rooms: filteredRooms,
      totalRooms: filteredRooms.length,
      userFilter: userFarcaster || null,
      contractAddress,
      chainId: chain.id
    });

  } catch (error) {
    console.error('Blockchain Rooms API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch rooms from blockchain',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, name, farcasterWhitelist, isPublic, settings, walletAddress } = body;

    if (!roomId || !name || !walletAddress) {
      return NextResponse.json(
        { error: 'roomId, name, and walletAddress are required' },
        { status: 400 }
      );
    }

    const contractAddress = process.env.NEXT_PUBLIC_METAWORKSPACE_NFT_ADDRESS as Address;
    
    if (!contractAddress) {
      return NextResponse.json(
        { error: 'MetaWorkspace NFT contract not deployed' },
        { status: 500 }
      );
    }

    // Return transaction data for frontend to execute
    // The actual transaction needs to be signed by the user's wallet
    return NextResponse.json({
      success: true,
      transactionData: {
        to: contractAddress,
        functionName: 'createRoom',
        args: [
          roomId,
          name,
          farcasterWhitelist || [],
          isPublic || false,
          settings || {
            maxRecordingDuration: 30,
            allowVoiceNFTs: true,
            allowVideoNFTs: true,
            requireWhitelist: !isPublic
          }
        ],
        abi: METAWORKSPACE_NFT_ABI
      }
    });

  } catch (error) {
    console.error('Create Room API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to prepare room creation transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
