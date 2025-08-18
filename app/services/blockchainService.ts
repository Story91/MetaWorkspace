/**
 * Blockchain Service for MetaWorkspace
 * Handles all blockchain interactions with deployed smart contract
 */

import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  http, 
  parseEther,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient
} from 'viem';
import { METAWORKSPACE_NFT_ABI } from '../constants/contractABI';
import { getCurrentChainConfig } from '../config/chains';

// Types
export interface VoiceNFT {
  tokenId: string;
  ipfsHash: string;
  duration: number;
  roomId: string;
  creator: Address;
  timestamp: number;
  isPrivate: boolean;
  whitelistedUsers: readonly string[];
  transcription: string;
}

export interface VideoNFT {
  tokenId: string;
  ipfsHash: string;
  duration: number;
  roomId: string;
  creator: Address;
  participants: readonly string[];
  summary: string;
  timestamp: number;
  isPrivate: boolean;
  whitelistedUsers: readonly string[];
}

export interface RoomStats {
  totalContent: bigint;
  voiceCount: bigint;
  videoCount: bigint;
  documentCount: bigint;
}

export interface TransactionResult {
  hash: Hash;
  tokenId?: string;
  success: boolean;
  error?: string;
}

export class BlockchainService {
  private publicClient: PublicClient;
  private walletClient: WalletClient | null = null;
  private account: Address | null = null;
  private chainConfig = getCurrentChainConfig();
  private contractAddress: Address = this.chainConfig.contractAddress;
  private chain = this.chainConfig.chain;
  
  // Caching for rate limit protection
  private nftCache = new Map<string, { data: VoiceNFT[]; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds cache
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private lastRequestTime = 0;
  
  constructor() {
    console.log(`🔗 BlockchainService initialized with ${this.chainConfig.name}`);
    console.log(`📜 Contract address: ${this.contractAddress}`);
    
    // Initialize public client for reading
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(this.chainConfig.rpcUrl)
    }) as PublicClient;
  }

  /**
   * Connect wallet using browser provider
   */
  async connectWallet(): Promise<Address> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet provider found');
    }
    
    // Create wallet client
    this.walletClient = createWalletClient({
      chain: this.chain,
      transport: custom(window.ethereum)
    });

    // Request accounts
    const accounts = await this.walletClient.requestAddresses();
    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    this.account = accounts[0];
    return this.account;
  }

  /**
   * Get connected account
   */
  getAccount(): Address | null {
    return this.account;
  }

  /**
   * Mint Voice NFT
   */
  async mintVoiceNFT(
    ipfsHash: string,
    duration: number,
    roomId: string,
    whitelistedUsers: string[],
    transcription: string
  ): Promise<TransactionResult> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'mintVoiceNFT',
        args: [
          this.account,
          ipfsHash,
          BigInt(duration),
          roomId,
          whitelistedUsers,
          transcription
        ],
        account: this.account,
        chain: this.chain
      });

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      // Extract token ID from events
      const mintEvent = receipt.logs.find(log => 
        log.topics[0] === '0x...' // VoiceNFTCreated event signature
      );
      
      return {
        hash,
        success: receipt.status === 'success',
        tokenId: mintEvent ? mintEvent.topics[1] : undefined
      };
    } catch (error) {
      console.error('Error minting voice NFT:', error);
      return {
        hash: '0x' as Hash,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Mint Video NFT
   */
  async mintVideoNFT(
    ipfsHash: string,
    duration: number,
    roomId: string,
    participants: string[],
    summary: string,
    whitelistedUsers: string[]
  ): Promise<TransactionResult> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'mintVideoNFT',
        args: [
          this.account,
          ipfsHash,
          BigInt(duration),
          roomId,
          participants,
          summary,
          whitelistedUsers
        ],
        account: this.account,
        chain: this.chain
      });

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      return {
        hash,
        success: receipt.status === 'success'
      };
    } catch (error) {
      console.error('Error minting video NFT:', error);
      return {
        hash: '0x' as Hash,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Rate limiting helper
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.nftCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.nftCache.delete(key);
      }
    }
  }

  /**
   * Get Voice NFTs by room with caching and rate limiting
   */
  async getVoiceNFTsByRoom(roomId: string): Promise<VoiceNFT[]> {
    this.cleanCache();
    
    // Check cache first
    const cached = this.nftCache.get(roomId);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      console.log(`💾 Cache hit for room ${roomId}: ${cached.data.length} NFTs`);
      return cached.data;
    }

    try {
      // Rate limiting
      await this.throttle();
      
      console.log(`🔗 Fetching NFTs for room ${roomId} from blockchain...`);
      
      const tokenIds = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'getRoomContent', // getVoiceNFTsByRoom was removed
        args: [roomId]
      }) as readonly bigint[];

      console.log(`📋 Found ${tokenIds.length} tokens in room ${roomId}`);

      const nfts: VoiceNFT[] = [];
      
      // Add small delay between requests to avoid rate limiting
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i];
        
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay between token requests
        }
        
        try {
          const data = await this.publicClient.readContract({
            address: this.contractAddress,
            abi: METAWORKSPACE_NFT_ABI,
            functionName: 'getContent', // getVoiceNFT was removed, use getContent
            args: [tokenId]
          });

          // getContent returns NFTContent struct, filter for voice content only
          if (data && typeof data === 'object' && 'contentType' in data && data.contentType === 0) { // VOICE = 0
            nfts.push({
              tokenId: tokenId.toString(),
              ipfsHash: data.ipfsHash as string,
              duration: Number(data.duration),
              roomId: data.roomId as string,
              creator: data.creator as `0x${string}`,
              timestamp: Number(data.timestamp),
              isPrivate: data.isPrivate as boolean,
              whitelistedUsers: [...(data.whitelistedUsers as readonly string[])],
              transcription: data.metadata as string // metadata contains transcription for voice
            });
          }
        } catch (tokenError) {
          console.warn(`⚠️ Failed to fetch token ${tokenId}:`, tokenError);
          // Continue with other tokens
        }
      }

      // Cache the result
      this.nftCache.set(roomId, {
        data: nfts,
        timestamp: Date.now()
      });

      console.log(`✅ Successfully fetched and cached ${nfts.length} voice NFTs for room ${roomId}`);
      return nfts;
      
    } catch (error) {
      console.error('Error fetching voice NFTs:', error);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.log(`🔄 Returning expired cache for room ${roomId} due to error`);
        return cached.data;
      }
      
      // If it's a rate limit error, throw it to be handled by the UI
      if (error instanceof Error && error.message.includes('rate limit')) {
        throw new Error('Rate limited by RPC provider. Please wait and try again.');
      }
      
      return [];
    }
  }

  /**
   * Get Video NFTs by room
   */
  async getVideoNFTsByRoom(roomId: string): Promise<VideoNFT[]> {
    try {
      const tokenIds = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'getRoomContent', // getVideoNFTsByRoom was removed
        args: [roomId]
      }) as readonly bigint[];

      const nfts: VideoNFT[] = [];
      
      for (const tokenId of tokenIds) {
        const data = await this.publicClient.readContract({
          address: this.contractAddress,
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'getContent', // getVideoNFT was removed, use getContent
          args: [tokenId]
        });

        // getContent returns NFTContent struct, filter for video content only
        if (data && typeof data === 'object' && 'contentType' in data && data.contentType === 1) { // VIDEO = 1
          nfts.push({
            tokenId: tokenId.toString(),
            ipfsHash: data.ipfsHash as string,
            duration: Number(data.duration),
            roomId: data.roomId as string,
            creator: data.creator as `0x${string}`,
            participants: [...(data.participants as readonly string[])],
            summary: data.metadata as string, // metadata contains summary for video
            timestamp: Number(data.timestamp),
            isPrivate: data.isPrivate as boolean,
            whitelistedUsers: [...(data.whitelistedUsers as readonly string[])]
          });
        }
      }

      return nfts;
    } catch (error) {
      console.error('Error fetching video NFTs:', error);
      return [];
    }
  }

  /**
   * Get room statistics
   */
  async getRoomStats(roomId: string): Promise<RoomStats | null> {
    try {
      // getRoomStats was removed from contract for optimization
      // Calculate stats from room content instead
      const tokenIds = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'getRoomContent',
        args: [roomId]
      }) as readonly bigint[];

      let voiceCount = BigInt(0);
      let videoCount = BigInt(0);
      let documentCount = BigInt(0);

      // Count content types (simplified calculation)
      for (const tokenId of tokenIds) {
        try {
          const content = await this.publicClient.readContract({
            address: this.contractAddress,
            abi: METAWORKSPACE_NFT_ABI,
            functionName: 'getContent',
            args: [tokenId]
          });

          if (content && typeof content === 'object' && 'contentType' in content) {
            switch (content.contentType) {
              case 0: voiceCount++; break;    // VOICE
              case 1: videoCount++; break;    // VIDEO  
              case 2: documentCount++; break; // DOCUMENT
            }
          }
        } catch (error) {
          console.error(`Error reading content for token ${tokenId}:`, error);
        }
      }

      return {
        totalContent: BigInt(tokenIds.length),
        voiceCount,
        videoCount,
        documentCount
      };
    } catch (error) {
      console.error('Error calculating room stats:', error);
      return null;
    }
  }

  /**
   * Create a new room with join price
   */
  async createRoom(
    roomId: string,
    name: string,
    farcasterWhitelist: string[],
    isPublic: boolean,
    joinPriceEth: string = "0"
  ): Promise<TransactionResult> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      // Convert ETH price to wei
      const joinPriceWei = parseEther(joinPriceEth);
      
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'createRoom',
        args: [roomId, name, farcasterWhitelist, isPublic, joinPriceWei],
        account: this.account,
        chain: this.chain
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      return {
        hash,
        success: receipt.status === 'success'
      };
    } catch (error) {
      console.error('Error creating room:', error);
      return {
        hash: '0x' as Hash,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if room exists
   */
  async roomExists(roomId: string): Promise<boolean> {
    try {
      const exists = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'roomExists',
        args: [roomId]
      });
      return exists as boolean;
    } catch (error) {
      console.error('Error checking room existence:', error);
      return false;
    }
  }

  /**
   * Add user to room whitelist
   */
  async addToWhitelist(
    roomId: string,
    username: string
  ): Promise<TransactionResult> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'addToWhitelist',
        args: [roomId, username],
        account: this.account,
        chain: this.chain
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      return {
        hash,
        success: receipt.status === 'success'
      };
    } catch (error) {
      console.error('Error adding to whitelist:', error);
      return {
        hash: '0x' as Hash,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if user has access to NFT
   */
  async hasAccess(tokenId: string, username: string): Promise<boolean> {
    try {
      const hasAccess = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'hasAccess',
        args: [BigInt(tokenId), username]
      });
      return hasAccess as boolean;
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }

  /**
   * Get token URI for metadata
   */
  async getTokenURI(tokenId: string): Promise<string> {
    try {
      const uri = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'tokenURI',
        args: [BigInt(tokenId)]
      });
      return uri as string;
    } catch (error) {
      console.error('Error fetching token URI:', error);
      return '';
    }
  }

  /**
   * Get total supply of NFTs
   */
  async getTotalSupply(): Promise<bigint> {
    try {
      const supply = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'totalSupply',
        args: []
      });
      return supply as bigint;
    } catch (error) {
      console.error('Error fetching total supply:', error);
      return BigInt(0);
    }
  }

  /**
   * Get tokens owned by address
   */
  async getTokensOfOwner(owner: Address): Promise<readonly bigint[]> {
    try {
      // tokensOfOwner was removed from contract for gas optimization
      // This function now returns empty array - would need complex iteration to enumerate tokens
      console.warn('getTokensOfOwner: tokensOfOwner function was removed from contract for optimization');
      console.warn('Consider using balanceOf to get token count instead');
      
      // Return balance count as single-element array for backward compatibility
      const balance = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'balanceOf',
        args: [owner]
      }) as bigint;
      
      // Return empty array if no tokens, this maintains interface compatibility
      return balance > BigInt(0) ? [balance] : [];
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return [];
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
