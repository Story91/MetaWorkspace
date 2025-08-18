/**
 * Basescan API Service for transaction verification
 * Monitors AI access purchase transactions with throttling
 */

export interface TransactionReceipt {
  blockHash: string;
  blockNumber: string;
  confirmations: string;
  contractAddress: string;
  from: string;
  gasUsed: string;
  status: '0' | '1'; // 0 = failed, 1 = success
  to: string;
  transactionHash: string;
  transactionIndex: string;
}

export interface BasescanResponse {
  status: '0' | '1';
  message: string;
  result: TransactionReceipt | string;
}

export class BasescanService {
  private apiKey: string;
  private baseUrl: string;
  private configured: boolean;
  private cache = new Map<string, { receipt: TransactionReceipt | null; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds cache
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private lastRequestTime = 0;

  constructor() {
    // Use Etherscan API for Base network with network parameter
    this.apiKey = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || '';
    this.baseUrl = 'https://api.etherscan.io/api';
    this.configured = !!this.apiKey;

    if (!this.configured) {
      console.warn('Basescan Service: API key not configured, falling back to mock mode');
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
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [hash, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(hash);
      }
    }
  }

  /**
   * Get transaction receipt with caching and rate limiting
   */
  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    if (!this.configured) {
      console.log('Basescan API not configured, development mode - transaction verification disabled');
      // In development mode, don't auto-approve transactions
      return null;
    }

    this.cleanCache();

    // Check cache first
    const cached = this.cache.get(txHash);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      console.log(`Cache hit for transaction ${txHash}`);
      return cached.receipt;
    }

    try {
      // Rate limiting
      await this.throttle();

      const url = `${this.baseUrl}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&network=base&apikey=${this.apiKey}`;
      
      console.log(`Fetching transaction receipt for ${txHash}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'MetaWorkspace/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BasescanResponse = await response.json();

      if (data.status === '0') {
        console.log(`Basescan API error: ${data.message}`);
        return null;
      }

      const receipt = data.result as TransactionReceipt;
      
      // Cache the result
      this.cache.set(txHash, {
        receipt,
        timestamp: Date.now()
      });

      console.log(`Transaction ${txHash} status: ${receipt.status === '1' ? 'SUCCESS' : 'FAILED'}`);
      
      return receipt;

    } catch (error) {
      console.error('Error fetching transaction receipt:', error);
      
      // Cache null result to avoid repeated failed requests
      this.cache.set(txHash, {
        receipt: null,
        timestamp: Date.now()
      });
      
      return null;
    }
  }

  /**
   * Check if transaction is confirmed and successful
   */
  async isTransactionConfirmed(txHash: string, minConfirmations = 1): Promise<boolean> {
    const receipt = await this.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return false;
    }

    // Check if transaction was successful
    if (receipt.status !== '1') {
      console.log(`Transaction ${txHash} failed`);
      return false;
    }

    // Check confirmations
    const confirmations = parseInt(receipt.confirmations);
    const isConfirmed = confirmations >= minConfirmations;
    
    console.log(`Transaction ${txHash}: ${confirmations} confirmations (required: ${minConfirmations})`);
    
    return isConfirmed;
  }

  /**
   * Check if transaction is a successful AI access purchase
   */
  async isAIAccessPurchase(txHash: string, contractAddress: string, userAddress: string): Promise<boolean> {
    const receipt = await this.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return false;
    }

    // Verify transaction details
    const isToContract = receipt.to.toLowerCase() === contractAddress.toLowerCase();
    const isFromUser = receipt.from.toLowerCase() === userAddress.toLowerCase();
    const isSuccessful = receipt.status === '1';

    console.log(`AI Access verification for ${txHash}:`, {
      isToContract,
      isFromUser,
      isSuccessful,
      to: receipt.to,
      from: receipt.from,
      expectedContract: contractAddress,
      expectedUser: userAddress
    });

    return isToContract && isFromUser && isSuccessful;
  }

  /**
   * Clear cache for specific transaction
   */
  clearTransactionCache(txHash: string): void {
    this.cache.delete(txHash);
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const basescanService = new BasescanService();
