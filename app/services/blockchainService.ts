/**
 * Blockchain Service for MetaWorkspace
 * Handles all blockchain interactions with deployed smart contract
 */

import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  http, 
  type Address,
  type Hash,

  type PublicClient,
  type WalletClient
} from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { METAWORKSPACE_NFT_ABI, METAWORKSPACE_NFT_ADDRESS } from '../constants/contractABI';

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
  private contractAddress: Address = METAWORKSPACE_NFT_ADDRESS;
  private chain = process.env.NODE_ENV === 'production' ? base : baseSepolia;
  
  constructor() {
    // Initialize public client for reading
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http()
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
   * Get Voice NFTs by room
   */
  async getVoiceNFTsByRoom(roomId: string): Promise<VoiceNFT[]> {
    try {
      const tokenIds = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'getVoiceNFTsByRoom',
        args: [roomId]
      }) as readonly bigint[];

      const nfts: VoiceNFT[] = [];
      
      for (const tokenId of tokenIds) {
        const data = await this.publicClient.readContract({
          address: this.contractAddress,
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'getVoiceNFT',
          args: [tokenId]
        }) as readonly [string, bigint, string, Address, bigint, boolean, readonly string[], string];

        nfts.push({
          tokenId: tokenId.toString(),
          ipfsHash: data[0],
          duration: Number(data[1]),
          roomId: data[2],
          creator: data[3],
          timestamp: Number(data[4]),
          isPrivate: data[5],
          whitelistedUsers: data[6],
          transcription: data[7]
        });
      }

      return nfts;
    } catch (error) {
      console.error('Error fetching voice NFTs:', error);
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
        functionName: 'getVideoNFTsByRoom',
        args: [roomId]
      }) as readonly bigint[];

      const nfts: VideoNFT[] = [];
      
      for (const tokenId of tokenIds) {
        const data = await this.publicClient.readContract({
          address: this.contractAddress,
          abi: METAWORKSPACE_NFT_ABI,
          functionName: 'getVideoNFT',
          args: [tokenId]
        }) as readonly [string, bigint, string, Address, readonly string[], string, bigint, boolean, readonly string[]];

        nfts.push({
          tokenId: tokenId.toString(),
          ipfsHash: data[0],
          duration: Number(data[1]),
          roomId: data[2],
          creator: data[3],
          participants: data[4],
          summary: data[5],
          timestamp: Number(data[6]),
          isPrivate: data[7],
          whitelistedUsers: data[8]
        });
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
      const stats = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'getRoomStats',
        args: [roomId]
      }) as unknown as readonly [bigint, bigint, bigint, bigint];

      return {
        totalContent: stats[0],
        voiceCount: stats[1],
        videoCount: stats[2],
        documentCount: stats[3]
      };
    } catch (error) {
      console.error('Error fetching room stats:', error);
      return null;
    }
  }

  /**
   * Create a new room
   */
  async createRoom(
    roomId: string,
    name: string,
    farcasterWhitelist: string[],
    isPublic: boolean
  ): Promise<TransactionResult> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'createRoom',
        args: [roomId, name, farcasterWhitelist, isPublic],
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
      const tokens = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: METAWORKSPACE_NFT_ABI,
        functionName: 'tokensOfOwner',
        args: [owner]
      });
      return tokens as readonly bigint[];
    } catch (error) {
      console.error('Error fetching tokens of owner:', error);
      return [];
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
