import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// Smart contract ABIs
const VOICE_NFT_ABI = [
  {
    name: 'getVoiceNFTsByRoom',
    type: 'function',
    inputs: [{ name: 'roomId', type: 'string' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view'
  },
  {
    name: 'getVoiceNFT',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'ipfsHash', type: 'string' },
        { name: 'duration', type: 'uint256' },
        { name: 'roomId', type: 'string' },
        { name: 'creator', type: 'address' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'isPrivate', type: 'bool' },
        { name: 'whitelistedUsers', type: 'string[]' },
        { name: 'transcription', type: 'string' }
      ]
    }],
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
  }
] as const;

const VIDEO_NFT_ABI = [
  {
    name: 'getVideoNFTsByRoom',
    type: 'function',
    inputs: [{ name: 'roomId', type: 'string' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view'
  },
  {
    name: 'getVideoNFT',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'ipfsHash', type: 'string' },
        { name: 'duration', type: 'uint256' },
        { name: 'roomId', type: 'string' },
        { name: 'creator', type: 'address' },
        { name: 'participants', type: 'string[]' },
        { name: 'summary', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'isPrivate', type: 'bool' },
        { name: 'whitelistedUsers', type: 'string[]' }
      ]
    }],
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

    const voiceNFTAddress = process.env.NEXT_PUBLIC_VOICE_NFT_ADDRESS as Address;
    const videoNFTAddress = process.env.NEXT_PUBLIC_VIDEO_NFT_ADDRESS as Address;
    
    if (!voiceNFTAddress || !videoNFTAddress) {
      return NextResponse.json(
        { error: 'NFT contracts not deployed' },
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
      voiceNFTAddress, 
      videoNFTAddress 
    });

    // Get specific NFT by token ID
    if (tokenId) {
      const tokenIdNum = BigInt(tokenId);
      let nftData = null;
      let nftType = '';

      try {
        // Try voice NFT first
        const voiceData = await publicClient.readContract({
          address: voiceNFTAddress,
          abi: VOICE_NFT_ABI,
          functionName: 'getVoiceNFT',
          args: [tokenIdNum]
        });

        const owner = await publicClient.readContract({
          address: voiceNFTAddress,
          abi: VOICE_NFT_ABI,
          functionName: 'ownerOf',
          args: [tokenIdNum]
        });

        let hasAccess = true;
        if (userFarcaster && voiceData[5]) { // isPrivate
          hasAccess = await publicClient.readContract({
            address: voiceNFTAddress,
            abi: VOICE_NFT_ABI,
            functionName: 'hasAccess',
            args: [tokenIdNum, userFarcaster]
          });
        }

        nftData = {
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
        };
        nftType = 'voice';
      } catch {
        // Try video NFT
        try {
          const videoData = await publicClient.readContract({
            address: videoNFTAddress,
            abi: VIDEO_NFT_ABI,
            functionName: 'getVideoNFT',
            args: [tokenIdNum]
          });

          const owner = await publicClient.readContract({
            address: videoNFTAddress,
            abi: VIDEO_NFT_ABI,
            functionName: 'ownerOf',
            args: [tokenIdNum]
          });

          let hasAccess = true;
          if (userFarcaster && videoData[7]) { // isPrivate
            hasAccess = await publicClient.readContract({
              address: videoNFTAddress,
              abi: VIDEO_NFT_ABI,
              functionName: 'hasAccess',
              args: [tokenIdNum, userFarcaster]
            });
          }

          nftData = {
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
          };
          nftType = 'video';
        } catch {
          return NextResponse.json(
            { error: 'NFT not found' },
            { status: 404 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        nft: nftData,
        type: nftType
      });
    }

    // Get NFTs by room
    const results: any[] = [];

    if (type === 'all' || type === 'voice') {
      try {
        const voiceTokenIds = await publicClient.readContract({
          address: voiceNFTAddress,
          abi: VOICE_NFT_ABI,
          functionName: 'getVoiceNFTsByRoom',
          args: [roomId!]
        });

        console.log(`Found ${voiceTokenIds.length} voice NFTs for room ${roomId}`);

        const voiceNFTs = await Promise.allSettled(
          voiceTokenIds.map(async (tokenId) => {
            const voiceData = await publicClient.readContract({
              address: voiceNFTAddress,
              abi: VOICE_NFT_ABI,
              functionName: 'getVoiceNFT',
              args: [tokenId]
            });

            const owner = await publicClient.readContract({
              address: voiceNFTAddress,
              abi: VOICE_NFT_ABI,
              functionName: 'ownerOf',
              args: [tokenId]
            });

            let hasAccess = true;
            if (userFarcaster && voiceData[5]) { // isPrivate
              hasAccess = await publicClient.readContract({
                address: voiceNFTAddress,
                abi: VOICE_NFT_ABI,
                functionName: 'hasAccess',
                args: [tokenId, userFarcaster]
              });
            }

            return {
              tokenId: tokenId.toString(),
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
            };
          })
        );

        const successfulVoiceNFTs = voiceNFTs
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value)
          .filter(nft => !userFarcaster || nft.hasAccess);

        results.push(...successfulVoiceNFTs);
      } catch (error) {
        console.error('Error fetching voice NFTs:', error);
      }
    }

    if (type === 'all' || type === 'video') {
      try {
        const videoTokenIds = await publicClient.readContract({
          address: videoNFTAddress,
          abi: VIDEO_NFT_ABI,
          functionName: 'getVideoNFTsByRoom',
          args: [roomId!]
        });

        console.log(`Found ${videoTokenIds.length} video NFTs for room ${roomId}`);

        const videoNFTs = await Promise.allSettled(
          videoTokenIds.map(async (tokenId) => {
            const videoData = await publicClient.readContract({
              address: videoNFTAddress,
              abi: VIDEO_NFT_ABI,
              functionName: 'getVideoNFT',
              args: [tokenId]
            });

            const owner = await publicClient.readContract({
              address: videoNFTAddress,
              abi: VIDEO_NFT_ABI,
              functionName: 'ownerOf',
              args: [tokenId]
            });

            let hasAccess = true;
            if (userFarcaster && videoData[7]) { // isPrivate
              hasAccess = await publicClient.readContract({
                address: videoNFTAddress,
                abi: VIDEO_NFT_ABI,
                functionName: 'hasAccess',
                args: [tokenId, userFarcaster]
              });
            }

            return {
              tokenId: tokenId.toString(),
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
            };
          })
        );

        const successfulVideoNFTs = videoNFTs
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value)
          .filter(nft => !userFarcaster || nft.hasAccess);

        results.push(...successfulVideoNFTs);
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

    const contractAddress = type === 'voice' 
      ? process.env.NEXT_PUBLIC_VOICE_NFT_ADDRESS as Address
      : process.env.NEXT_PUBLIC_VIDEO_NFT_ADDRESS as Address;
    
    if (!contractAddress) {
      return NextResponse.json(
        { error: `${type} NFT contract not deployed` },
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
      abi: type === 'voice' ? VOICE_NFT_ABI : VIDEO_NFT_ABI
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
