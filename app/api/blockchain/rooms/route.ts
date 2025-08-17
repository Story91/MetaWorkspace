import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// Smart contract ABI for RoomManager
const ROOM_MANAGER_ABI = [
  {
    name: 'getAllRoomIds',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string[]' }],
    stateMutability: 'view'
  },
  {
    name: 'getRoom',
    type: 'function',
    inputs: [{ name: 'roomId', type: 'string' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'name', type: 'string' },
        { name: 'creator', type: 'address' },
        { name: 'farcasterWhitelist', type: 'string[]' },
        { name: 'isPublic', type: 'bool' },
        { name: 'createdAt', type: 'uint256' },
        { 
          name: 'settings',
          type: 'tuple',
          components: [
            { name: 'maxRecordingDuration', type: 'uint256' },
            { name: 'allowVoiceNFTs', type: 'bool' },
            { name: 'allowVideoNFTs', type: 'bool' },
            { name: 'requireWhitelist', type: 'bool' }
          ]
        },
        { name: 'exists', type: 'bool' }
      ]
    }],
    stateMutability: 'view'
  },
  {
    name: 'isUserWhitelisted',
    type: 'function',
    inputs: [
      { name: 'roomId', type: 'string' },
      { name: 'farcasterUsername', type: 'string' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    name: 'getTotalRooms',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  }
] as const;

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

    const contractAddress = process.env.NEXT_PUBLIC_ROOM_MANAGER_ADDRESS as Address;
    
    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Room Manager contract not deployed' },
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
      // Get specific room

      
      const roomData = await publicClient.readContract({
        address: contractAddress,
        abi: ROOM_MANAGER_ABI,
        functionName: 'getRoom',
        args: [roomId]
      }) as unknown as readonly [string, Address, readonly string[], boolean, bigint, readonly [bigint, boolean, boolean, boolean], boolean];

      const exists = roomData[6];
      if (!exists) { // exists field
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        );
      }

      const settings = roomData[5];
      const room = {
        roomId,
        name: roomData[0],
        creator: roomData[1],
        farcasterWhitelist: roomData[2] as string[],
        isPublic: roomData[3],
        createdAt: Number(roomData[4]),
        settings: {
          maxRecordingDuration: Number(settings[0]),
          allowVoiceNFTs: settings[1],
          allowVideoNFTs: settings[2],
          requireWhitelist: settings[3]
        },
        exists: roomData[6]
      };

      // Check user access if username provided
      let hasAccess = false;
      if (userFarcaster) {
        hasAccess = await publicClient.readContract({
          address: contractAddress,
          abi: ROOM_MANAGER_ABI,
          functionName: 'isUserWhitelisted',
          args: [roomId, userFarcaster]
        }) as boolean;
      }

      return NextResponse.json({
        success: true,
        room: {
          ...room,
          hasAccess
        }
      });
    }

    // Get all rooms
    const [roomIds, totalRooms] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: ROOM_MANAGER_ABI,
        functionName: 'getAllRoomIds'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: ROOM_MANAGER_ABI,
        functionName: 'getTotalRooms'
      })
    ]);

    console.log(`Found ${roomIds.length} rooms on blockchain`);

    // Get details for each room
    const roomsData = await Promise.allSettled(
      roomIds.map(async (roomId) => {

        
        const roomData = await publicClient.readContract({
          address: contractAddress,
          abi: ROOM_MANAGER_ABI,
          functionName: 'getRoom',
          args: [roomId]
        }) as unknown as readonly [string, Address, readonly string[], boolean, bigint, readonly [bigint, boolean, boolean, boolean], boolean];

        const settings = roomData[5];
        const room = {
          roomId,
          name: roomData[0],
          creator: roomData[1],
          farcasterWhitelist: roomData[2] as string[],
          isPublic: roomData[3],
          createdAt: Number(roomData[4]),
          settings: {
            maxRecordingDuration: Number(settings[0]),
            allowVoiceNFTs: settings[1],
            allowVideoNFTs: settings[2],
            requireWhitelist: settings[3]
          },
          exists: roomData[6]
        };

        // Check user access if username provided
        let hasAccess = true; // Default to true for public listing
        if (userFarcaster && (!room.isPublic || room.settings.requireWhitelist)) {
          hasAccess = await publicClient.readContract({
            address: contractAddress,
            abi: ROOM_MANAGER_ABI,
            functionName: 'isUserWhitelisted',
            args: [roomId, userFarcaster]
          }) as boolean;
        }

        return {
          ...room,
          hasAccess
        };
      })
    );

    // Filter successful room queries
    interface RoomResult {
      roomId: string;
      name: string;
      creator: Address;
      farcasterWhitelist: string[];
      isPublic: boolean;
      createdAt: number;
      settings: {
        maxRecordingDuration: number;
        allowVoiceNFTs: boolean;
        allowVideoNFTs: boolean;
        requireWhitelist: boolean;
      };
      exists: boolean;
      hasAccess: boolean;
    }
    const rooms = roomsData
      .filter((result): result is PromiseFulfilledResult<RoomResult> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(room => room.exists);

    // Filter by user access if specified
    const filteredRooms = userFarcaster 
      ? rooms.filter(room => room.hasAccess || room.isPublic)
      : rooms;

    return NextResponse.json({
      success: true,
      rooms: filteredRooms,
      totalRooms: Number(totalRooms),
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

    const contractAddress = process.env.NEXT_PUBLIC_ROOM_MANAGER_ADDRESS as Address;
    
    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Room Manager contract not deployed' },
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
        abi: ROOM_MANAGER_ABI
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
