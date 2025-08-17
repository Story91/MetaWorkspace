import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// MetaWorkspace NFT unified contract ABI
const METAWORKSPACE_NFT_ABI = [
  {
    name: 'mintVoiceNFT',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'ipfsHash', type: 'string' },
      { name: 'duration', type: 'uint256' },
      { name: 'roomId', type: 'string' },
      { name: 'whitelistedUsers', type: 'string[]' },
      { name: 'transcription', type: 'string' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'mintVideoNFT',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'ipfsHash', type: 'string' },
      { name: 'duration', type: 'uint256' },
      { name: 'roomId', type: 'string' },
      { name: 'participants', type: 'string[]' },
      { name: 'summary', type: 'string' },
      { name: 'whitelistedUsers', type: 'string[]' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'getVoiceNFTsByRoom',
    type: 'function',
    inputs: [{ name: 'roomId', type: 'string' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view'
  },
  {
    name: 'getVideoNFTsByRoom',
    type: 'function',
    inputs: [{ name: 'roomId', type: 'string' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view'
  },
  {
    name: 'getVoiceNFT',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'ipfsHash', type: 'string' },
      { name: 'duration', type: 'uint256' },
      { name: 'roomId', type: 'string' },
      { name: 'creator', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'isPrivate', type: 'bool' },
      { name: 'whitelistedUsers', type: 'string[]' },
      { name: 'transcription', type: 'string' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'getVideoNFT',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'ipfsHash', type: 'string' },
      { name: 'duration', type: 'uint256' },
      { name: 'roomId', type: 'string' },
      { name: 'creator', type: 'address' },
      { name: 'participants', type: 'string[]' },
      { name: 'summary', type: 'string' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'isPrivate', type: 'bool' },
      { name: 'whitelistedUsers', type: 'string[]' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'hasAccess',
    type: 'function',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'username', type: 'string' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    name: 'ownerOf',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },
  {
    name: 'getContentType',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
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
    const roomId = searchParams.get('roomId');
    const type = searchParams.get('type') as 'voice' | 'video' | 'all';
    const userFarcaster = searchParams.get('user');
    const tokenId = searchParams.get('tokenId');

    if (!roomId && !tokenId) {
      return NextResponse.json(
        { error: 'Either roomId or tokenId is required' },
        { status: 400 }
      );
    }

    // Using single unified NFT contract
    const nftAddress = process.env.NEXT_PUBLIC_METAWORKSPACE_NFT_ADDRESS as Address;
    
    if (!nftAddress) {
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

    console.log('Querying NFTs from blockchain:', { 
      roomId, 
      type, 
      tokenId,
      nftAddress 
    });

    // Get specific NFT by token ID
    if (tokenId) {
      const tokenIdNum = BigInt(tokenId);
      
      try {
        // Get content type first
        const contentType = await publicClient.readContract({
          address: nftAddress,
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'getContentType',
          args: [tokenIdNum]
        });

        const owner = await publicClient.readContract({
          address: nftAddress,
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'ownerOf',
          args: [tokenIdNum]
        });

        let hasAccess = true;
        if (userFarcaster) {
          hasAccess = await publicClient.readContract({
            address: nftAddress,
            abi: METAWORKSPACE_NFT_ABI,
            functionName: 'hasAccess',
            args: [tokenIdNum, userFarcaster]
          });
        }

        // 0 = VOICE, 1 = VIDEO, 2 = DOCUMENT
        if (contentType === 0) {
          const voiceData = await publicClient.readContract({
            address: nftAddress,
            abi: METAWORKSPACE_NFT_ABI,
            functionName: 'getVoiceNFT',
            args: [tokenIdNum]
          });

          return NextResponse.json({
            success: true,
            nft: {
              tokenId,
              type: 'voice',
              ipfsHash: voiceData[0],
              duration: Number(voiceData[1]),
              roomId: voiceData[2],
              creator: voiceData[3],
              timestamp: Number(voiceData[4]),
              isPrivate: voiceData[5],
              whitelistedUsers: voiceData[6],
              transcription: voiceData[7],
              owner,
              hasAccess
            },
            type: 'voice'
          });
        } else if (contentType === 1) {
          const videoData = await publicClient.readContract({
            address: nftAddress,
            abi: METAWORKSPACE_NFT_ABI,
            functionName: 'getVideoNFT',
            args: [tokenIdNum]
          });

          return NextResponse.json({
            success: true,
            nft: {
              tokenId,
              type: 'video',
              ipfsHash: videoData[0],
              duration: Number(videoData[1]),
              roomId: videoData[2],
              creator: videoData[3],
              participants: videoData[4],
              summary: videoData[5],
              timestamp: Number(videoData[6]),
              isPrivate: videoData[7],
              whitelistedUsers: videoData[8],
              owner,
              hasAccess
            },
            type: 'video'
          });
        }
      } catch {
        return NextResponse.json(
          { error: 'NFT not found' },
          { status: 404 }
        );
      }
    }

    // Get NFTs by room
    interface NFTResult {
      tokenId: string;
      type: 'voice' | 'video';
      ipfsHash: string;
      duration: number;
      roomId: string;
      creator: Address;
      timestamp: number;
      isPrivate: boolean;
      whitelistedUsers: readonly string[];
      transcription: string;
      participants: readonly string[];
      summary: string;
      owner: Address;
      hasAccess: boolean;
    }
    
    const results: NFTResult[] = [];

    if (type === 'all' || type === 'voice') {
      try {
        const voiceTokenIds = await publicClient.readContract({
          address: nftAddress,
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'getVoiceNFTsByRoom',
          args: [roomId!]
        });

        console.log(`Found ${voiceTokenIds.length} voice NFTs for room ${roomId}`);

        const voiceNFTs: NFTResult[] = [];
        
        for (const tokenId of voiceTokenIds) {
          try {
            const voiceData = await publicClient.readContract({
              address: nftAddress,
              abi: METAWORKSPACE_NFT_ABI,
              functionName: 'getVoiceNFT',
              args: [tokenId]
            });

            const owner = await publicClient.readContract({
              address: nftAddress,
              abi: METAWORKSPACE_NFT_ABI,
              functionName: 'ownerOf',
              args: [tokenId]
            });

            let hasAccess = true;
            if (userFarcaster && voiceData[5]) { // isPrivate
              hasAccess = await publicClient.readContract({
                address: nftAddress,
                abi: METAWORKSPACE_NFT_ABI,
                functionName: 'hasAccess',
                args: [tokenId, userFarcaster]
              });
            }

            if (!userFarcaster || hasAccess) {
              voiceNFTs.push({
                tokenId: tokenId.toString(),
                type: 'voice',
                ipfsHash: voiceData[0],
                duration: Number(voiceData[1]),
                roomId: voiceData[2],
                creator: voiceData[3],
                timestamp: Number(voiceData[4]),
                isPrivate: voiceData[5],
                whitelistedUsers: voiceData[6],
                transcription: voiceData[7] || '',
                participants: [],
                summary: '',
                owner,
                hasAccess
              });
            }
          } catch (error) {
            console.error(`Error fetching voice NFT ${tokenId}:`, error);
          }
        }

        results.push(...voiceNFTs);
      } catch (error) {
        console.error('Error fetching voice NFTs:', error);
      }
    }

    if (type === 'all' || type === 'video') {
      try {
        const videoTokenIds = await publicClient.readContract({
          address: nftAddress,
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'getVideoNFTsByRoom',
          args: [roomId!]
        });

        console.log(`Found ${videoTokenIds.length} video NFTs for room ${roomId}`);

        const videoNFTs: NFTResult[] = [];
        
        for (const tokenId of videoTokenIds) {
          try {
            const videoData = await publicClient.readContract({
              address: nftAddress,
              abi: METAWORKSPACE_NFT_ABI,
              functionName: 'getVideoNFT',
              args: [tokenId]
            });

            const owner = await publicClient.readContract({
              address: nftAddress,
              abi: METAWORKSPACE_NFT_ABI,
              functionName: 'ownerOf',
              args: [tokenId]
            });

            let hasAccess = true;
            if (userFarcaster && videoData[7]) { // isPrivate
              hasAccess = await publicClient.readContract({
                address: nftAddress,
                abi: METAWORKSPACE_NFT_ABI,
                functionName: 'hasAccess',
                args: [tokenId, userFarcaster]
              });
            }

            if (!userFarcaster || hasAccess) {
              videoNFTs.push({
                tokenId: tokenId.toString(),
                type: 'video',
                ipfsHash: videoData[0],
                duration: Number(videoData[1]),
                roomId: videoData[2],
                creator: videoData[3],
                participants: videoData[4] || [],
                summary: videoData[5] || '',
                timestamp: Number(videoData[6]),
                isPrivate: videoData[7],
                whitelistedUsers: videoData[8],
                transcription: '',
                owner,
                hasAccess
              });
            }
          } catch (error) {
            console.error(`Error fetching video NFT ${tokenId}:`, error);
          }
        }

        results.push(...videoNFTs);
      } catch (error) {
        console.error('Error fetching video NFTs:', error);
      }
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      success: true,
      nfts: results,
      totalCount: results.length,
      voiceCount: results.filter(nft => nft.type === 'voice').length,
      videoCount: results.filter(nft => nft.type === 'video').length,
      roomId,
      userFilter: userFarcaster || null,
      chainId: chain.id
    });

  } catch (error) {
    console.error('Blockchain NFTs API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch NFTs from blockchain',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, 
      ipfsHash, 
      duration, 
      roomId, 
      transcription, 
      participants, 
      summary, 
      whitelistedUsers, 
      walletAddress 
    } = body;

    if (!type || !ipfsHash || !duration || !roomId || !walletAddress) {
      return NextResponse.json(
        { error: 'type, ipfsHash, duration, roomId, and walletAddress are required' },
        { status: 400 }
      );
    }

    // Using single unified NFT contract
    const contractAddress = process.env.NEXT_PUBLIC_METAWORKSPACE_NFT_ADDRESS as Address;
    
    if (!contractAddress) {
      return NextResponse.json(
        { error: 'MetaWorkspace NFT contract not deployed' },
        { status: 500 }
      );
    }

    // Return transaction data for frontend to execute
    const transactionData = {
      to: contractAddress,
      functionName: type === 'voice' ? 'mintVoiceNFT' : 'mintVideoNFT',
      args: type === 'voice' 
        ? [
            walletAddress,
            ipfsHash,
            duration,
            roomId,
            whitelistedUsers || [],
            transcription || ''
          ]
        : [
            walletAddress,
            ipfsHash,
            duration,
            roomId,
            participants || [],
            summary || '',
            whitelistedUsers || []
          ],
      abi: METAWORKSPACE_NFT_ABI
    };

    return NextResponse.json({
      success: true,
      transactionData
    });

  } catch (error) {
    console.error('Create NFT API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to prepare NFT creation transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}