"use client";

import { useState, useEffect } from "react";
import { Button } from "./DemoComponents";
import { Icon } from "./DemoComponents";

function Card({ 
  title, 
  children, 
  className = "" 
}: { 
  title?: string; 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`neu-card overflow-hidden transition-all duration-300 hover:shadow-xl ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-[var(--app-card-border)] gradient-accent">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Icon name="star" className="mr-2" />
            {title}
          </h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

interface BlockchainEvent {
  id: string;
  type: 'NFTMinted' | 'RoomCreated' | 'RoomJoined' | 'AIAccessGranted' | 'CreatorEarningsWithdrawn' | 'RoomJoinPriceUpdated';
  timestamp: Date;
  user: string;
  details: string;
  txHash: string;
  amount?: string;
  roomId?: string;
}

export function ActivityFeed() {
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        
        // This will fetch from blockchain service/API
        // For now, mock recent events
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockEvents: BlockchainEvent[] = [
          {
            id: '1',
            type: 'AIAccessGranted',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            user: '0xF1fa...Dfd',
            details: 'Purchased AI Assistant access',
            txHash: '0x1234...5678',
            amount: '0.0001 ETH'
          },
          {
            id: '2',
            type: 'RoomCreated',
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            user: '0xF1fa...Dfd',
            details: 'Created Premium Team Room',
            txHash: '0x2345...6789',
            roomId: 'premium-team-room'
          },
          {
            id: '3',
            type: 'RoomJoined',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            user: '0xABCD...EFGH',
            details: 'Joined Design Workshop',
            txHash: '0x3456...7890',
            amount: '0.001 ETH',
            roomId: 'design-workshop'
          },
          {
            id: '4',
            type: 'NFTMinted',
            timestamp: new Date(Date.now() - 45 * 60 * 1000),
            user: '0xF1fa...Dfd',
            details: 'Minted voice NFT "Team Meeting Notes"',
            txHash: '0x4567...8901'
          },
          {
            id: '5',
            type: 'CreatorEarningsWithdrawn',
            timestamp: new Date(Date.now() - 60 * 60 * 1000),
            user: '0xF1fa...Dfd',
            details: 'Withdrew earnings from Premium Team Room',
            txHash: '0x5678...9012',
            amount: '0.0032 ETH',
            roomId: 'premium-team-room'
          }
        ];
        
        setEvents(mockEvents);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'NFTMinted': return '🎤';
      case 'RoomCreated': return '🏛️';
      case 'RoomJoined': return '👥';
      case 'AIAccessGranted': return '🤖';
      case 'CreatorEarningsWithdrawn': return '💰';
      case 'RoomJoinPriceUpdated': return '💱';
      default: return '📋';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'NFTMinted': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'RoomCreated': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'RoomJoined': return 'text-green-600 bg-green-50 border-green-200';
      case 'AIAccessGranted': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'CreatorEarningsWithdrawn': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'RoomJoinPriceUpdated': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const filteredEvents = filter === 'all' ? events : events.filter(event => event.type === filter);

  if (isLoading) {
    return (
      <Card title="⚡ Recent Activity">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[var(--app-foreground-muted)]">Loading blockchain events...</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="⚡ Recent Activity">
      <div className="space-y-4">
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All', icon: '📋' },
            { id: 'NFTMinted', label: 'NFTs', icon: '🎤' },
            { id: 'RoomCreated', label: 'Rooms', icon: '🏛️' },
            { id: 'AIAccessGranted', label: 'AI', icon: '🤖' },
            { id: 'CreatorEarningsWithdrawn', label: 'Earnings', icon: '💰' }
          ].map((filterOption) => (
            <Button
              key={filterOption.id}
              variant={filter === filterOption.id ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilter(filterOption.id)}
              className="text-xs"
            >
              {filterOption.icon} {filterOption.label}
            </Button>
          ))}
        </div>

        {/* Events List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-[var(--app-foreground-muted)]">
              <Icon name="star" className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <div className="text-lg mb-2">No events found</div>
              <div className="text-sm">Activity will appear here as you use MetaWorkspace</div>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div 
                key={event.id} 
                className={`p-3 rounded-lg border ${getEventColor(event.type)} dark:bg-opacity-20`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="text-xl">
                      {getEventIcon(event.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--app-foreground)] mb-1">
                        {event.details}
                      </div>
                      
                      <div className="text-xs text-[var(--app-foreground-muted)] space-y-1">
                        <div className="flex items-center space-x-3">
                          <span>👤 {event.user}</span>
                          <span>⏰ {getTimeAgo(event.timestamp)}</span>
                        </div>
                        
                        {event.amount && (
                          <div className="flex items-center space-x-1">
                            <span>💰</span>
                            <span className="font-mono font-medium text-green-600">
                              {event.amount}
                            </span>
                          </div>
                        )}
                        
                        {event.roomId && (
                          <div className="flex items-center space-x-1">
                            <span>🏛️</span>
                            <span className="font-mono text-blue-600">
                              {event.roomId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://basescan.org/tx/${event.txHash}`, '_blank')}
                    className="text-xs"
                  >
                    📋
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--app-card-border)]">
          <div className="text-center">
            <div className="text-lg font-bold gradient-accent bg-clip-text text-transparent">
              {events.filter(e => e.type === 'NFTMinted').length}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">NFTs Minted</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold gradient-coral bg-clip-text text-transparent">
              {events.filter(e => e.type === 'RoomCreated').length}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">Rooms Created</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold gradient-mint bg-clip-text text-transparent">
              {events.filter(e => e.amount).reduce((total, e) => 
                total + parseFloat(e.amount?.replace(' ETH', '') || '0'), 0
              ).toFixed(4)}
            </div>
            <div className="text-xs text-[var(--app-foreground-muted)]">ETH Volume</div>
          </div>
        </div>

        {/* Network & Contract Status */}
        <div className="text-xs text-center text-[var(--app-foreground-muted)] bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-3 rounded border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="font-semibold text-green-700 dark:text-green-300">🚀 LIVE ON BASE MAINNET</span>
          </div>
          <div>
            Contract: 
            <a 
              href="https://basescan.org/address/0x3e9747E50635bC453071504cf959CFbdD3F736e4" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline ml-1 font-mono"
            >
              0x3e9747E5...F736e4
            </a>
            <span className="ml-2 text-green-600">✅ Verified</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ActivityFeed;
