/**
 * Real IPFS Storage Service using Pinata
 * Replaces mock IPFS functionality in blockchainStorage.ts
 */

import axios from 'axios';

export interface IPFSUploadResult {
  hash: string;
  url: string;
  nativeUrl: string;
  size: number;
  timestamp: string;
  metadata?: any;
}

export interface IPFSMetadata {
  name?: string;
  description?: string;
  type: 'voice-recording' | 'video-meeting' | 'document' | 'other';
  roomId?: string;
  creator?: string;
  duration?: number;
  participants?: string[];
  transcription?: string;
  summary?: string;
  [key: string]: any;
}

export class IPFSStorageService {
  private apiKey: string;
  private secretKey: string;
  private gatewayUrl: string;
  private apiUrl = 'https://api.pinata.cloud';

  constructor() {
    this.apiKey = process.env.PINATA_API_KEY || '';
    this.secretKey = process.env.PINATA_SECRET_KEY || '';
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/';

    if (!this.apiKey || !this.secretKey) {
      console.warn('IPFS: Pinata credentials not configured, falling back to mock mode');
    }
  }

  /**
   * Upload file to IPFS via Pinata
   */
  async uploadFile(file: Blob | File, metadata: IPFSMetadata): Promise<IPFSUploadResult> {
    if (!this.apiKey || !this.secretKey) {
      return this.mockUpload(file, metadata);
    }

    try {
      const formData = new FormData();
      
      // Add file
      if (file instanceof File) {
        formData.append('file', file);
      } else {
        // Convert Blob to File
        const fileName = `${metadata.type}-${Date.now()}.${this.getFileExtension(metadata.type)}`;
        const convertedFile = new File([file], fileName, { type: file.type });
        formData.append('file', convertedFile);
      }

      // Prepare Pinata metadata
      const pinataMetadata = {
        name: metadata.name || `MetaWorkspace-${metadata.type}-${Date.now()}`,
        keyvalues: {
          app: 'MetaWorkspace',
          type: metadata.type,
          uploadedAt: new Date().toISOString(),
          roomId: metadata.roomId || '',
          creator: metadata.creator || '',
          duration: metadata.duration?.toString() || '',
          ...metadata
        }
      };

      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

      // Upload to Pinata
      const response = await axios.post(
        `${this.apiUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.secretKey,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 120000 // 2 minute timeout
        }
      );

      const result: IPFSUploadResult = {
        hash: response.data.IpfsHash,
        url: `${this.gatewayUrl}${response.data.IpfsHash}`,
        nativeUrl: `ipfs://${response.data.IpfsHash}`,
        size: response.data.PinSize,
        timestamp: response.data.Timestamp,
        metadata: pinataMetadata
      };

      console.log('✅ IPFS upload successful:', {
        hash: result.hash,
        size: `${(result.size / 1024 / 1024).toFixed(2)}MB`,
        type: metadata.type
      });

      return result;

    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.message;
        
        if (status === 401) {
          throw new Error('Invalid Pinata API credentials');
        }
        if (status === 429) {
          throw new Error('IPFS upload rate limit exceeded');
        }
        throw new Error(`IPFS upload failed: ${message}`);
      }
      
      throw new Error(`IPFS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file information from IPFS
   */
  async getFileInfo(hash: string): Promise<{ url: string; nativeUrl: string; metadata?: any }> {
    if (!this.apiKey || !this.secretKey) {
      return {
        url: `${this.gatewayUrl}${hash}`,
        nativeUrl: `ipfs://${hash}`,
        metadata: null
      };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/data/pinList?hashContains=${hash}`,
        {
          headers: {
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.secretKey
          }
        }
      );

      const files = response.data.rows;
      if (files.length === 0) {
        throw new Error('File not found in IPFS');
      }

      const file = files[0];
      
      return {
        url: `${this.gatewayUrl}${hash}`,
        nativeUrl: `ipfs://${hash}`,
        metadata: file.metadata
      };

    } catch (error) {
      console.error('IPFS file info retrieval failed:', error);
      
      // Return basic info even if Pinata query fails
      return {
        url: `${this.gatewayUrl}${hash}`,
        nativeUrl: `ipfs://${hash}`,
        metadata: null
      };
    }
  }

  /**
   * Pin existing IPFS hash to Pinata
   */
  async pinHash(hash: string, metadata: IPFSMetadata): Promise<boolean> {
    if (!this.apiKey || !this.secretKey) {
      console.log('Mock: Pinning hash', hash);
      return true;
    }

    try {
      await axios.post(
        `${this.apiUrl}/pinning/pinByHash`,
        {
          hashToPin: hash,
          pinataMetadata: {
            name: metadata.name || `MetaWorkspace-${metadata.type}`,
            keyvalues: {
              app: 'MetaWorkspace',
              type: metadata.type,
              pinnedAt: new Date().toISOString(),
              ...metadata
            }
          }
        },
        {
          headers: {
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.secretKey,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ IPFS hash pinned successfully:', hash);
      return true;

    } catch (error) {
      console.error('❌ IPFS pinning failed:', error);
      return false;
    }
  }

  /**
   * Upload JSON data to IPFS
   */
  async uploadJSON(data: any, metadata: IPFSMetadata): Promise<IPFSUploadResult> {
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    return this.uploadFile(jsonBlob, {
      ...metadata,
      name: metadata.name || `data-${Date.now()}.json`
    });
  }

  /**
   * Mock upload for development/fallback
   */
  private async mockUpload(file: Blob | File, metadata: IPFSMetadata): Promise<IPFSUploadResult> {
    console.log('🔧 Using mock IPFS upload (Pinata not configured)');
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const mockHash = `Qm${Math.random().toString(36).substring(2, 48)}`;
    
    return {
      hash: mockHash,
      url: `${this.gatewayUrl}${mockHash}`,
      nativeUrl: `ipfs://${mockHash}`,
      size: file.size,
      timestamp: new Date().toISOString(),
      metadata: {
        name: metadata.name || 'mock-file',
        keyvalues: metadata
      }
    };
  }

  /**
   * Get file extension based on content type
   */
  private getFileExtension(type: string): string {
    switch (type) {
      case 'voice-recording':
        return 'webm';
      case 'video-meeting':
        return 'webm';
      case 'document':
        return 'pdf';
      default:
        return 'bin';
    }
  }

  /**
   * Check if IPFS service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.secretKey);
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; gateway: string; mode: string } {
    return {
      configured: this.isConfigured(),
      gateway: this.gatewayUrl,
      mode: this.isConfigured() ? 'production' : 'mock'
    };
  }
}

// Export singleton instance
export const ipfsStorage = new IPFSStorageService();

export default IPFSStorageService;
