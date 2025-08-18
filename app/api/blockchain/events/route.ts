/**
 * API endpoint for fetching blockchain events from MetaWorkspace contract
 * Uses Basescan API to get event logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentChainConfig } from '../../../config/chains';
import axios from 'axios';

interface EventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  transactionIndex: string;
  blockHash: string;
  logIndex: string;
  removed: boolean;
  timeStamp: string;
}

interface ParsedEvent {
  event: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  data: Record<string, unknown>;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get('event'); // 'ai-access', 'nft-minted', 'room-activity', 'all'
  const userAddress = searchParams.get('user');
  const roomId = searchParams.get('room');
  const fromBlock = searchParams.get('fromBlock') || 'latest';
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const chainConfig = getCurrentChainConfig();
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY;

    if (!etherscanApiKey) {
      return NextResponse.json({ 
        error: 'Etherscan API not configured',
        events: [] 
      });
    }

    // Event signatures mapping (Prawdziwe Keccak256 hashes z naszego kontraktu)
    const eventSignatures = {
      'AIAccessGranted': '0xa5d0dbce47bb6d7cc5d7409517bea7e099404d45fe8a50b77a26ff54b797c608',
      'NFTMinted': '0x5665c4e8236da03d3406c915bdbd5e5ca49a51207fd73a3285c9a007497288fc',
      'VoiceNFTCreated': '0x64c8002bf648dfb2527a5c192c2226130b499d01a5f4dfbe28f7e86a5d9c8d66',
      'RoomActivity': '0xb390b247716547051c90ce781393c5a79bdc1da49e350fc417f2618832f2b25a',
      'Transfer': '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Standard ERC721 Transfer
    };

    let topics: string[] = [];
    
    // Filter by event type
    if (eventType && eventType !== 'all') {
      switch (eventType) {
        case 'ai-access':
          topics = [eventSignatures.AIAccessGranted];
          break;
        case 'nft-minted':
          topics = [eventSignatures.NFTMinted];
          break;
        case 'room-activity':
          topics = [eventSignatures.RoomActivity];
          break;
        case 'voice-nft':
          topics = [eventSignatures.VoiceNFTCreated];
          break;
        case 'transfer':
          topics = [eventSignatures.Transfer];
          break;
      }
    }

    // Build Etherscan API request for Base network
    const params: Record<string, unknown> = {
      module: 'logs',
      action: 'getLogs',
      address: chainConfig.contractAddress,
      fromBlock: fromBlock === 'latest' ? 0 : fromBlock,
      toBlock: 'latest',
      network: 'base',
      apikey: etherscanApiKey
    };

    if (topics.length > 0) {
      params.topic0 = topics[0];
    }

    // Add user filter if provided
    if (userAddress && topics.length > 0) {
      // For indexed address parameters (usually topic1)
      params.topic1 = '0x' + userAddress.slice(2).padStart(64, '0').toLowerCase();
    }

    console.log(`🔍 Fetching events from Etherscan API for Base:`, params);

    const response = await axios.get('https://api.etherscan.io/api', {
      params,
      timeout: 10000
    });

    if (!response.data.result || response.data.status !== '1') {
      return NextResponse.json({ 
        events: [],
        total: 0,
        message: 'No events found'
      });
    }

    const logs = response.data.result as EventLog[];
    
    // Parse and format events
    const parsedEvents: ParsedEvent[] = logs
      .map(log => parseEvent(log, eventSignatures))
      .filter(event => event !== null)
      .sort((a, b) => b.timestamp - a.timestamp) // Latest first
      .slice(0, limit);

    // Filter by room if specified
    const filteredEvents = roomId 
      ? parsedEvents.filter(event => 
          event.data.roomId && typeof event.data.roomId === 'string' && event.data.roomId.toLowerCase().includes(roomId.toLowerCase())
        )
      : parsedEvents;

    return NextResponse.json({
      events: filteredEvents,
      total: filteredEvents.length,
      contractAddress: chainConfig.contractAddress,
      chainName: chainConfig.name
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: (error as Error).message },
      { status: 500 }
    );
  }
}

function parseEvent(log: EventLog, eventSignatures: Record<string, string>): ParsedEvent | null {
  try {
    const topic0 = log.topics[0];
    let eventName = '';
    let parsedData: Record<string, unknown> = {};

    // Identify event type
    for (const [name, sig] of Object.entries(eventSignatures)) {
      if (topic0.toLowerCase() === sig.toLowerCase()) {
        eventName = name;
        break;
      }
    }

    if (!eventName) {
      return null;
    }

    // Basic parsing (simplified - in production you'd use proper ABI decoding)
    switch (eventName) {
      case 'AIAccessGranted':
        parsedData = {
          user: '0x' + log.topics[1].slice(26), // Remove padding
          payment: parseInt(log.data.slice(0, 66), 16) / 1e18, // Convert to ETH
          timestamp: parseInt(log.data.slice(66, 130), 16)
        };
        break;
        
      case 'NFTMinted':
        parsedData = {
          tokenId: parseInt(log.topics[1], 16),
          creator: '0x' + log.topics[2].slice(26),
          roomId: decodeString(log.topics[3]),
          contentType: parseInt(log.data.slice(0, 66), 16),
          ipfsHash: decodeString(log.data.slice(66))
        };
        break;

      case 'RoomActivity':
        parsedData = {
          roomId: decodeString(log.topics[1]),
          activityType: decodeString(log.data.slice(0, 66)),
          user: '0x' + log.data.slice(66, 106).slice(24), // Extract address
          timestamp: parseInt(log.data.slice(130), 16)
        };
        break;

      default:
        parsedData = {
          raw: log.data,
          topics: log.topics
        };
    }

    return {
      event: eventName,
      transactionHash: log.transactionHash,
      blockNumber: parseInt(log.blockNumber, 16),
      timestamp: parseInt(log.timeStamp, 16),
      data: parsedData
    };

  } catch (error) {
    console.error('Error parsing event:', error);
    return null;
  }
}

function decodeString(hex: string): string {
  try {
    // Simple hex to string decode (basic implementation)
    if (!hex || hex === '0x') return '';
    
    const cleaned = hex.replace('0x', '');
    let result = '';
    
    for (let i = 0; i < cleaned.length; i += 2) {
      const byte = parseInt(cleaned.substr(i, 2), 16);
      if (byte !== 0) {
        result += String.fromCharCode(byte);
      }
    }
    
    return result.trim();
  } catch {
    return hex;
  }
}
