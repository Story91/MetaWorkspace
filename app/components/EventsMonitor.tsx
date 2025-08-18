'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface EventData {
  event: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  data: {
    user?: string;
    payment?: string;
    tokenId?: string;
    contentType?: number;
    roomId?: string;
    activityType?: string;
    duration?: string;
    [key: string]: unknown;
  };
}

interface EventsResponse {
  events: EventData[];
  total: number;
  contractAddress: string;
  chainName: string;
}

export function EventsMonitor() {
  const { address } = useAccount();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<boolean>(false);

  const fetchEvents = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        event: filter,
        limit: '20'
      });

      if (userFilter) {
        params.append('user', address);
      }

      const response = await fetch(`/api/blockchain/events?${params}`);
      if (response.ok) {
        const data: EventsResponse = await response.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [address, filter, userFilter]);

  useEffect(() => {
    fetchEvents();
  }, [address, filter, userFilter, fetchEvents]);

  const formatEventData = (event: EventData) => {
    switch (event.event) {
      case 'AIAccessGranted':
        return (
          <div className="text-sm">
            <div className="font-medium text-green-600">AI Access Purchased</div>
            <div>User: {event.data.user ? event.data.user.slice(0, 8) : 'Unknown'}...</div>
            <div>Payment: {event.data.payment || 'Unknown'} ETH</div>
          </div>
        );
      
      case 'NFTMinted':
        return (
          <div className="text-sm">
            <div className="font-medium text-blue-600">NFT Minted</div>
            <div>Token ID: #{event.data.tokenId || 'Unknown'}</div>
            <div>Type: {event.data.contentType !== undefined ? ['Voice', 'Video', 'Document'][Number(event.data.contentType)] || 'Unknown' : 'Unknown'}</div>
            <div>Room: {event.data.roomId || 'Unknown'}</div>
          </div>
        );
      
      case 'RoomActivity':
        return (
          <div className="text-sm">
            <div className="font-medium text-purple-600">Room Activity</div>
            <div>Activity: {event.data.activityType || 'Unknown'}</div>
            <div>Room: {event.data.roomId || 'Unknown'}</div>
            <div>User: {event.data.user ? event.data.user.slice(0, 8) : 'Unknown'}...</div>
          </div>
        );
      
      case 'VoiceNFTCreated':
        return (
          <div className="text-sm">
            <div className="font-medium text-orange-600">Voice Recording</div>
            <div>Token ID: #{event.data.tokenId || 'Unknown'}</div>
            <div>Room: {event.data.roomId || 'Unknown'}</div>
            <div>Duration: {event.data.duration || 'Unknown'}s</div>
          </div>
        );
      
      case 'VideoNFTCreated':
        return (
          <div className="text-sm">
            <div className="font-medium text-red-600">Video Recording</div>
            <div>Token ID: #{event.data.tokenId || 'Unknown'}</div>
            <div>Room: {event.data.roomId || 'Unknown'}</div>
            <div>Duration: {event.data.duration || 'Unknown'}s</div>
          </div>
        );
      
      default:
        return (
          <div className="text-sm">
            <div className="font-medium">{event.event}</div>
            <pre className="text-xs mt-1 overflow-hidden">
              {JSON.stringify(event.data, null, 2).slice(0, 100)}...
            </pre>
          </div>
        );
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'AIAccessGranted': return '🎯';
      case 'NFTMinted': return '🎨';
      case 'RoomActivity': return '🏠';
      case 'VoiceNFTCreated': return '🎤';
      case 'VideoNFTCreated': return '📹';
      case 'RoomCreated': return '🆕';
      default: return '📋';
    }
  };

  if (!address) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">📊 Events</h3>
        <p className="text-gray-500">Connect your wallet to view events</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">📊 Events</h3>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1 border rounded text-sm"
        >
          <option value="all">All Events</option>
          <option value="ai-access">AI Access</option>
          <option value="nft-minted">NFT Minted</option>
          <option value="room-activity">Room Activity</option>
          <option value="voice-nft">Voice Recordings</option>
          <option value="video-nft">Video Recordings</option>
          <option value="room-created">Room Created</option>
        </select>

        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            checked={userFilter}
            onChange={(e) => setUserFilter(e.target.checked)}
            className="mr-2"
          />
          My Events Only
        </label>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">No events found</p>
        ) : (
          events.map((event, index) => (
            <div
              key={`${event.transactionHash}-${index}`}
              className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getEventIcon(event.event)}</span>
                  <span className="font-medium text-sm">{event.event}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(event.timestamp * 1000).toLocaleString()}
                </div>
              </div>
              
              {formatEventData(event)}
              
              <div className="mt-2 pt-2 border-t text-xs text-gray-400">
                <div>Block: #{event.blockNumber}</div>
                <div>
                  TX: 
                  <a
                    href={`https://basescan.org/tx/${event.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-500 hover:underline"
                  >
                    {event.transactionHash.slice(0, 10)}...
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t text-sm text-gray-500">
          Showing {events.length} recent events
        </div>
      )}
    </div>
  );
}
